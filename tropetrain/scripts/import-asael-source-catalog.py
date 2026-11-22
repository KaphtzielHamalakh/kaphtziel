"""Import documentary source recordings, without inferring verse or word alignment."""
from pathlib import Path
import collections
import hashlib
import json
import re
import sys
import unicodedata
import urllib.parse
import zipfile

ROOT = Path(__file__).resolve().parent.parent
PACK = ROOT / 'assets/voice-studies/asael-catalog-sources.zip'
PACK_SHA256 = 'de8b5333e1663723ef94c8ee0123ccdea24e8c4f08dd780cb42124f395c733f9'
BOOKS = {'בראשית': ('gen', 'Genesis'), 'שמות': ('exo', 'Exodus'),
         'ויקרא': ('lev', 'Leviticus'), 'במדבר': ('num', 'Numbers'), 'דברים': ('deu', 'Deuteronomy')}
LABELS = {'אשכנזית': ('ashkenazic-as-recorded', 'Ashkenazic · source label'),
          'ישראלית': ('israeli-as-recorded', 'Israeli · source label')}
MELODIES = {'אשכנזית': ('ashkenazic-melody', 'Ashkenazic melody · source label'),
            'אשכנזית לימים נוראים': ('ashkenazic-high-holiday-melody', 'Ashkenazic High Holiday melody · source label')}


def file_title(value):
    # This normalizes file links only. Reader Hebrew is never processed here.
    return re.sub(r'\s+', ' ', ''.join(c for c in value.replace('_', ' ')
                                     if unicodedata.category(c) != 'Cf')).strip()


def clean_heading(value):
    value = re.sub(r'\[\[([^\]|]+)\|([^\]]+)\]\]', r'\2', value)
    return re.sub(r'\s+', ' ', value.replace("'''", '').replace("''", '')).strip()


def source_lines(page, pages):
    text = page['revisions'][0]['slots']['main']['content']
    for number, line in enumerate(text.splitlines(), 1):
        include = re.fullmatch(r'\{\{#קטע:ויבינו במקרא/סוכות\|([^{}]+)\}\}', line.strip())
        if page['pageid'] == 2988 and include:
            # Resolve the four actual LST calls. Retain original source page/line facts.
            source = pages['מקרא על פי המסורה/ויבינו במקרא/סוכות']
            start = '<קטע התחלה=' + include[1] + '/>'
            end = '<קטע סוף=' + include[1] + '/>'
            active = False
            found = False
            for n, source_line in enumerate(source['revisions'][0]['slots']['main']['content'].splitlines(), 1):
                if start in source_line:
                    active = found = True
                if active:
                    yield source, n, source_line
                if end in source_line and active:
                    active = False
                    break
            assert found and not active, include[1]
        else:
            yield page, number, line


def generate():
    raw = PACK.read_bytes()
    assert hashlib.sha256(raw).hexdigest() == PACK_SHA256, 'Source pack differs from pinned evidence.'
    with zipfile.ZipFile(PACK) as archive:
        manifest = json.loads(archive.read('manifest.json'))
        for item in manifest['files']:
            b = archive.read(item['file'])
            assert len(b) == item['bytes'] and hashlib.sha256(b).hexdigest() == item['sha256']
        titles = json.loads(archive.read('catalog-titles.json'))
        pages = {p['title']: p for n in archive.namelist() if n.startswith('wikisource/')
                 for p in json.loads(archive.read(n))['query']['pages']}
        aliases, media = {}, {}
        for name in archive.namelist():
            if not name.startswith('commons/'):
                continue
            query = json.loads(archive.read(name))['query']
            for a in query.get('normalized', []) + query.get('redirects', []):
                aliases[file_title(a['from'])] = file_title(a['to'])
            for p in query['pages']:
                if 'imageinfo' not in p:
                    continue
                info = p['imageinfo'][0]
                assert info['extmetadata']['LicenseShortName']['value'] == 'CC BY-SA 3.0'
                assert info['mime'] == 'application/ogg' and info['duration'] > 0
                key = file_title(p['title'])
                if key in media:
                    assert media[key]['imageinfo'][0]['sha1'] == info['sha1'], key
                media[key] = p

    old = json.loads((ROOT / 'docs/VOICE-STUDIES.json').read_text())
    opening = [r for r in old['recordings'] if r['studyId'] == 'asael-bereshit']
    existing_by_sha1 = {r['audio']['sha1']: r for r in opening}
    portions, readings, studies, recordings, rows, page_sources = [], [], [], [], [], []
    source_files = set()
    for title in titles:
        page = pages[title]
        revision = page['revisions'][0]
        text = revision['slots']['main']['content']
        header = re.search(r'\{\{(?:תבנית:)?ויבינו במקרא/פרשת השבוע\|([^|{}]+)\|([^|{}]+)\|([^|{}]+)', text)
        assert header and header[1] in BOOKS, title
        book_id, book_name = BOOKS[header[1]]
        portion_id = 'asael-parashah-' + str(page['pageid'])
        page_url = 'https://he.wikisource.org/w/index.php?' + urllib.parse.urlencode({'oldid': revision['revid']})
        portion = {'id': portion_id, 'name': header[3].removesuffix('}}'), 'bookId': book_id,
                   'bookName': book_name, 'sourceTitle': title, 'sourceRevision': revision['revid'], 'sourceUrl': page_url}
        portions.append(portion)
        page_sources.append({'title': title, 'pageId': page['pageid'], 'revision': revision['revid'],
                             'url': page_url, 'historyUrl': 'https://he.wikisource.org/w/index.php?' +
                             urllib.parse.urlencode({'title': title, 'action': 'history'})})
        stack, groups = [], {}
        for source_page, line_number, line in source_lines(page, pages):
            heading = re.fullmatch(r'(={2,})\s*(.*?)\s*\1', line.strip())
            if heading:
                level = len(heading[1])
                stack = [x for x in stack if x[0] < level] + [(level, heading[2])]
                continue
            for match in re.finditer(r'\{\{קובץ טעמים\|([^{}]+)\}\}', line):
                fields = match[1].split('|')
                if len(fields) != 5 or fields[1] != 'עשהאל':
                    continue
                requested = file_title('File:' + fields[0])
                canonical, seen = requested, set()
                while canonical in aliases and aliases[canonical] != canonical:
                    assert canonical not in seen, canonical
                    seen.add(canonical)
                    canonical = aliases[canonical]
                assert canonical in media, requested
                source_files.add(canonical)
                file = media[canonical]
                info = file['imageinfo'][0]
                assert fields[2] in MELODIES, 'Do not invent a melody label translation.'
                delivery_id, delivery_name = MELODIES[fields[2]]
                section = [x[1] for x in stack]
                assert section, (title, line_number)
                group_key = tuple(section)
                if group_key not in groups:
                    digest = hashlib.sha256(json.dumps(section, ensure_ascii=False).encode()).hexdigest()[:10]
                    study_id = f'asael-source-{page["pageid"]}-{digest}'
                    groups[group_key] = {'id': study_id, 'rows': []}
                group = groups[group_key]
                pronunciation_id, pronunciation_name = LABELS.get(fields[3],
                    ('source-spelling-' + hashlib.sha256(fields[3].encode()).hexdigest()[:8],
                     'Unassigned · source spelling ' + fields[3]))
                source_revision = source_page['revisions'][0]['revid']
                source_id = source_page['pageid']
                row_id = f'asael-catalog-{page["pageid"]}-{line_number}' if source_id == page['pageid'] else f'asael-catalog-{page["pageid"]}-{source_id}-{line_number}-{group["id"].split("-")[-1]}'
                original = existing_by_sha1.get(info['sha1'])
                row = {'id': row_id, 'pageId': source_id, 'revision': source_revision,
                       'hostPageId': page['pageid'], 'hostRevision': revision['revid'],
                       'line': line_number, 'section': section, 'fileLabel': fields[0],
                       'performerLabel': fields[1], 'melodyLabel': fields[2],
                       'pronunciationLabel': fields[3], 'passageNote': fields[4],
                       'canonicalFile': canonical, 'recordId': original['id'] if original else row_id}
                rows.append(row)
                record = original if original else {
                    'id': row_id, 'studyId': group['id'], 'pronunciationId': pronunciation_id,
                    'deliveryId': delivery_id, 'performer': 'Asael (עשהאל)', 'year': None,
                    'sourceUploadYear': int(info['timestamp'][:4]), 'sourceUrl': info['descriptionurl'],
                    'sourceFileRevision': file['revisions'][0]['revid'], 'sourceCatalogRevision': source_revision,
                    'sourceCatalogRow': row_id, 'sourcePronunciationLabel': fields[3], 'sourceMelodyLabel': fields[2],
                    'audio': {'filename': canonical.removeprefix('File:'),
                              'file': info['url'].split('?')[0], 'bytes': info['size'], 'sha1': info['sha1'],
                              'sha256': None, 'estimatedDurationSeconds': info['duration'],
                              'durationMethod': 'Commons original-media metadata; native decoded duration is checked before playback.',
                              'mimeType': 'audio/ogg', 'sourceMimeType': info['mime']},
                    'license': {'id': 'CC-BY-SA-3.0', 'url': 'https://creativecommons.org/licenses/by-sa/3.0/'},
                    'modifications': 'None. Original bytes are downloaded only on request and must pass byte-count/SHA1 verification before playback.',
                    'originalBytesVerifiedLocally': False, 'coverage': None,
                    'timedWords': None, 'syllableAlignment': None, 'phonemes': None,
                    'musicalNotes': None, 'independentReview': None}
                group['rows'].append((row, record, {'id': pronunciation_id, 'name': pronunciation_name}))

        for section, group in groups.items():
            entries = group['rows']
            old_ids = {r['studyId'] for _, r, _ in entries if r['id'] in {x['id'] for x in opening}}
            assert not old_ids or old_ids == {'asael-bereshit'} and len(entries) == 2
            study_id = 'asael-bereshit' if old_ids else group['id']
            label = ' / '.join(clean_heading(x) for x in section)
            readings.append({'id': group['id'], 'portionId': portion_id, 'name': label,
                             'studyId': study_id, 'sourceRowIds': [r['id'] for r, _, _ in entries],
                             'recordIds': [r['id'] for _, r, _ in entries]})
            if old_ids:
                continue
            pronunciations = [p for _, _, p in entries]
            assert len({p['id'] for p in pronunciations}) == len(pronunciations), group
            assert len({row['melodyLabel'] for row, _, _ in entries}) == 1
            melody_id, melody_name = MELODIES[entries[0][0]['melodyLabel']]
            studies.append({'id': study_id, 'name': 'Asael · ' + portion['name'] + ' · ' + label,
                            'sourceTitle': title, 'sourceUrl': page_url, 'coverage': None,
                            'coverageStatus': 'Exact source verse boundaries have not been established for this catalog entry. No reader word mapping or timings are assigned.',
                            'pronunciations': pronunciations,
                            'deliveries': [{'id': melody_id, 'name': melody_name, 'kind': 'chanted'}],
                            'description': 'Original sung performance cataloged by Hebrew Wikisource as Asael, with the source melody and pronunciation labels retained separately.',
                            'limits': 'Fixed source performances. Complete historical pronunciation grammars, contextual melody systems, source-edition comparison and word/syllable alignment remain unreviewed. No Kinnor equivalence or independent singing synthesis is established.',
                            'catalogNotes': [{'recordId': r['id'], 'text': row['passageNote']}
                                             for row, r, _ in entries if row['passageNote']]})
            recordings.extend(r for _, r, _ in entries)

    extra = pages['מקרא על פי המסורה/ויבינו במקרא/סוכות']
    extra_title, extra_revision = extra['title'], extra['revisions'][0]['revid']
    page_sources.append({'title': extra_title, 'pageId': extra['pageid'], 'revision': extra_revision,
                         'url': 'https://he.wikisource.org/w/index.php?oldid=' + str(extra_revision),
                         'historyUrl': 'https://he.wikisource.org/w/index.php?' + urllib.parse.urlencode({'title': extra_title, 'action': 'history'})})
    assert len(portions) == 54 and len(rows) == 846 and len(readings) == 651
    assert len({r['id'] for r in rows}) == len(rows)
    counts = {'catalogPages': len(portions), 'catalogRows': len(rows), 'sourceReadings': len(readings),
              'canonicalFiles': len(source_files), 'newRecordingReferences': len(recordings),
              'explicitPronunciationLabels': dict(collections.Counter(r['pronunciationLabel'] for r in rows)),
              'explicitMelodyLabels': dict(collections.Counter(r['melodyLabel'] for r in rows)),
              'sourcePages': len(page_sources), 'transcludedCatalogRows': sum(r['pageId'] != r['hostPageId'] for r in rows),
              'preexistingOpeningRecordings': len(opening), 'newAudioPayloadsBundled': 0,
              'newWordTimings': 0, 'newReviewedSingingGrammars': 0}
    return {'schema': 'tropetrain-asael-source-catalog-v1', 'revision': 1, 'retrieved': '2026-11-22',
            'counts': counts, 'sourcePack': {'file': str(PACK.relative_to(ROOT)), 'sha256': PACK_SHA256},
            'catalogLicense': {'id': 'CC-BY-SA-4.0', 'url': 'https://creativecommons.org/licenses/by-sa/4.0/'},
            'attribution': 'Hebrew Wikisource contributors; source tables adapted to an original recording finder. Audio attributed to Asael (עשהאל) as explicitly named by each catalog row; original file pages separately document CC BY-SA 3.0.',
            'limits': '54 parashah catalogs are not proof of complete verse coverage, verified pronunciation grammars or all cantorial systems. Catalog passage notes and exceptional spellings are retained without silently correcting them or assigning reader words. Only the preexisting Genesis1:1–2:3 pair has an established app passage draft. Each other original is verified on request, not bundled or claimed locally byte-verified by this catalog.',
            'sources': page_sources, 'portions': portions, 'readings': readings, 'rows': rows,
            'studies': studies, 'recordings': recordings}


catalog = generate()
outputs = {'docs/ASAEL-SOURCE-CATALOG.json': json.dumps(catalog, ensure_ascii=False, indent=2) + '\n',
           'asael-source-catalog-data.js': '// Generated from the pinned primary source pack.\nexport const ASAEL_SOURCE_CATALOG=' + json.dumps(catalog, ensure_ascii=False, separators=(',', ':')) + ';\n'}
for name, value in outputs.items():
    path = ROOT / name
    if '--check' in sys.argv:
        assert path.read_text() == value, name + ' differs from its source evidence.'
    else:
        path.write_text(value)
print(json.dumps(catalog['counts'], ensure_ascii=False))
