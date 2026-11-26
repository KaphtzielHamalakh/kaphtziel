"""Derive reusable reader references from pinned primary tables and file metadata.

No network access, source-audio synthesis, guessed verse ranges or word times.
"""
from pathlib import Path
import collections, hashlib, html, json, re, sys, unicodedata, zipfile
ROOT = Path(__file__).resolve().parent.parent
PACK = ROOT / 'assets/voice-studies/source-readers-sources.zip'
PACK_SHA = 'b796202a8f59dc138836310a09eeed55ba697f1e3fda01083401f90a6e8f861b'
BOOKS = {'בראשית': ('gen', 'Genesis'), 'שמות': ('exo', 'Exodus'), 'ויקרא': ('lev', 'Leviticus'), 'במדבר': ('num', 'Numbers'), 'דברים': ('deu', 'Deuteronomy')}
MELODIES = {'אשכנזית':'Ashkenazic', 'אשכנזי':'Ashkenazic', 'ספרדית':'Sephardic', 'נוסח מרוקו':'Morocco', 'מרוקאית':'Moroccan', 'מזרח אשכנז':'Eastern Ashkenazic', 'מערב אשכנז':'Western Ashkenazic', 'ספרדי-ירושלמי':'Sephardic–Jerusalem', 'ספרדי-מרוקאית':'Sephardic–Moroccan', 'ספרדי-טורקית':'Sephardic–Turkish', 'ספרדי-פורטוגזית':'Sephardic–Portuguese', 'ספרדי ירושלמי':'Sephardic–Jerusalem', 'ספרדית ירושלמית':'Sephardic–Jerusalem', 'ספרדית-ירושלמית':'Sephardic–Jerusalem'}
PRONUNCIATIONS = {'אשכנזית':'Ashkenazic', 'ישראלית':'Israeli', 'ישראל':'Israeli', 'מערב אשכנז':'Western Ashkenazic', 'ספרדי':'Sephardic', 'ספרדית':'Sephardic', 'מעורב':'Mixed'}
LICENSES = {'CC BY-SA 3.0': ('CC-BY-SA-3.0','https://creativecommons.org/licenses/by-sa/3.0/'), 'CC BY 2.5':('CC-BY-2.5','https://creativecommons.org/licenses/by/2.5/'), 'CC BY-SA 4.0':('CC-BY-SA-4.0','https://creativecommons.org/licenses/by-sa/4.0/'), 'CC0':('CC0-1.0','https://creativecommons.org/publicdomain/zero/1.0/'), 'Public domain':('Public domain · PD-self','https://commons.wikimedia.org/wiki/Template:PD-self')}

def digest(value):
    return hashlib.sha256(json.dumps(value, ensure_ascii=False, separators=(',', ':')).encode()).hexdigest()[:12]

def file_title(value):
    # File-link normalization only; never apply to Hebrew reader words.
    return re.sub(r'\s+', ' ', ''.join(c for c in value.replace('_', ' ') if unicodedata.category(c) != 'Cf')).strip()

def source_lines(page, pages):
    for number, line in enumerate(page['revisions'][0]['slots']['main']['content'].splitlines(), 1):
        include = re.fullmatch(r'\{\{#קטע:ויבינו במקרא/סוכות\|([^{}]+)\}\}', line.strip())
        if page['pageid'] == 2988 and include:
            source = pages['מקרא על פי המסורה/ויבינו במקרא/סוכות']
            active = found = False
            for n, text in enumerate(source['revisions'][0]['slots']['main']['content'].splitlines(), 1):
                if '<קטע התחלה=' + include[1] + '/>' in text: active = found = True
                if active: yield source, n, text
                if '<קטע סוף=' + include[1] + '/>' in text and active: active = False; break
            assert found, include[1]
        else: yield page, number, line

def primary_rows():
    path = ROOT / 'assets/voice-studies/asael-catalog-sources.zip'
    assert hashlib.sha256(path.read_bytes()).hexdigest() == 'de8b5333e1663723ef94c8ee0123ccdea24e8c4f08dd780cb42124f395c733f9'
    with zipfile.ZipFile(path) as z:
        pages = {p['title']:p for n in z.namelist() if n.startswith('wikisource/') for p in json.loads(z.read(n))['query']['pages']}
        titles = json.loads(z.read('catalog-titles.json'))
    rows = []
    for title in titles:
        page = pages[title]; stack = []
        header = re.search(r'\{\{(?:תבנית:)?ויבינו במקרא/פרשת השבוע\|([^|{}]+)\|([^|{}]+)\|([^|{}]+)', page['revisions'][0]['slots']['main']['content']); assert header
        for source, line_number, line in source_lines(page, pages):
            h = re.fullmatch(r'(={2,})\s*(.*?)\s*\1', line.strip())
            if h: stack = [x for x in stack if x[0] < len(h[1])] + [(len(h[1]), h[2])]
            for match in re.finditer(r'\{\{קובץ טעמים\|([^{}]+)\}\}', line):
                fields = match[1].split('|')
                if len(fields) != 5 or fields[1] == 'עשהאל': continue
                section = [x[1] for x in stack]; assert section
                rows.append({'id':'reader-row-' + digest([page['pageid'],source['pageid'],line_number,section]), 'hostTitle':title, 'hostPageId':page['pageid'], 'hostRevision':page['revisions'][0]['revid'], 'sourceTitle':source['title'], 'sourcePageId':source['pageid'], 'sourceRevision':source['revisions'][0]['revid'], 'sourceUrl':'https://he.wikisource.org/w/index.php?oldid='+str(source['revisions'][0]['revid']), 'bookId':BOOKS[header[1]][0], 'bookName':BOOKS[header[1]][1], 'portionName':header[3].removesuffix('}}'), 'line':line_number, 'section':section, 'fileLabel':fields[0], 'requestedFile':file_title('File:'+fields[0]), 'readerLabel':fields[1], 'melodyLabel':fields[2], 'pronunciationLabel':fields[3], 'passageNote':fields[4]})
    assert len(rows) == 281 and len({r['id'] for r in rows}) == 281
    return rows

def label(raw, kind):
    names = PRONUNCIATIONS if kind == 'pronunciation' else MELODIES
    assert raw in names, ('Untranslated literal source label', raw)
    # These IDs already identify this exact pair in the accepted Itamar recording.
    known = {'ישראלית':'israeli-as-recorded','אשכנזית':'ashkenazic-as-recorded'} if kind == 'pronunciation' else {'מרוקאית':'moroccan-melody'}
    return {'id':known.get(raw,kind+'-source-'+digest(raw)), 'name':names[raw]+' · source label '+raw, 'sourceLabel':raw, **({'kind':'chanted'} if kind == 'melody' else {})}

def generate():
    raw = PACK.read_bytes(); assert hashlib.sha256(raw).hexdigest() == PACK_SHA
    media, aliases = {}, {}
    with zipfile.ZipFile(PACK) as z:
        manifest = json.loads(z.read('manifest.json'))
        for item in manifest['files']:
            b = z.read(item['file']); assert len(b) == item['bytes'] and hashlib.sha256(b).hexdigest() == item['sha256']
        for n in z.namelist():
            if not n.startswith('commons/'): continue
            q = json.loads(z.read(n))['query']
            for a in q.get('normalized', []) + q.get('redirects', []): aliases[file_title(a['from'])] = file_title(a['to'])
            for page in q['pages']:
                assert 'missing' not in page and len(page['imageinfo']) == 1
                media[file_title(page['title'])] = page
        verified = json.loads(z.read('featured-decoded.json'))['records']
    assert len(media) == 267
    checked = {r['title']:r for r in verified}
    existing = json.loads((ROOT/'docs/GENESIS-MELODY-COMPARISON.json').read_text())['recording']
    rows = primary_rows(); portions = {}; groups = {}; records = {}; files = []
    for row in rows:
        title = row['requestedFile']; seen = set()
        while title in aliases and aliases[title] != title:
            assert title not in seen; seen.add(title); title = aliases[title]
        page = media[title]; info = page['imageinfo'][0]; meta = info['extmetadata']; license_name = meta['LicenseShortName']['value']
        assert info['mime'] == 'application/ogg' and info['duration'] > 0 and license_name in LICENSES
        wikitext = page['revisions'][0]['slots']['main']['content']
        if license_name == 'Public domain': assert '{{PD-self' in wikitext
        pid = 'reader-portion-'+str(row['hostPageId']); row['canonicalFile'] = title
        portions.setdefault(pid, {'id':pid,'name':row['portionName'],'bookId':row['bookId'],'bookName':row['bookName'],'sourceTitle':row['hostTitle'],'sourceRevision':row['hostRevision'],'sourceUrl':'https://he.wikisource.org/w/index.php?oldid='+str(row['hostRevision'])})
        gid = 'reader-study-'+digest([row['hostPageId'],row['section'],row['readerLabel']]); p = label(row['pronunciationLabel'],'pronunciation'); d = label(row['melodyLabel'],'melody')
        group = groups.setdefault(gid, {'id':gid,'portionId':pid,'readerLabel':row['readerLabel'],'section':row['section'],'entries':[]})
        # Canonical file identity is not a verse, tradition, review or timing assertion.
        if title not in records:
            if title == 'File:Aa Genesis Bereshit-2 Itamar Malka.oga':
                assert info['sha1'] == existing['audio']['sha1'] and p['id'] == existing['pronunciationId'] and d['id'] == existing['deliveryId']; r = existing
            else:
                source = checked.get(title); artist = html.unescape(re.sub('<[^>]+>', '', str(meta.get('Artist',{}).get('value','')))).strip()
                attribution = artist or 'Structured creator attribution unavailable; consult the original file page.'
                lid, lurl = LICENSES[license_name]
                r = {'id':'reader-original-'+digest(title),'studyId':gid,'pronunciationId':p['id'],'deliveryId':d['id'],'performer':row['readerLabel']+' · catalog reader; '+attribution+' · file attribution','catalogReaderLabel':row['readerLabel'],'creatorAttribution':attribution,'year':None,'sourceUploadYear':int(info['timestamp'][:4]),'sourceUrl':info['descriptionurl'],'sourceFileRevision':page['revisions'][0]['revid'],'sourceCatalogRevision':row['sourceRevision'],'sourceCatalogRow':row['id'],'sourcePronunciationLabel':row['pronunciationLabel'],'sourceMelodyLabel':row['melodyLabel'],'audio':{'filename':title.removeprefix('File:'),'file':info['url'].split('?')[0],'bytes':info['size'],'sha1':info['sha1'],'sha256':source['sha256'] if source else None,'estimatedDurationSeconds':source['decoded']['duration'] if source else info['duration'],'durationMethod':'Original decoded with '+source['decoded']['decoder'] if source else 'Commons original-media metadata; native duration checked before playback.','mimeType':'audio/ogg','sourceMimeType':info['mime']},'license':{'id':lid,'url':lurl},'modifications':'None. Unchanged original bytes load only on request and must pass checksum verification.','originalBytesVerifiedLocally':bool(source),'nativeDecode':source['decoded'] if source else None,'coverage':None,'timedWords':None,'syllableAlignment':None,'phonemes':None,'musicalNotes':None,'independentReview':None}
                if title.endswith('Nombody Ashkenaz.oga'):
                    assert 'Ashkenazi' in wikitext
                    r['sourceLabelConflict'] = 'Pronunciation evidence conflicts: the MAM catalog says מעורב (mixed); the Commons description says Ashkenazi pronunciation. Both claims are retained; neither is independently reviewed.'
            records[title] = r
            files.append({'canonicalFile':title,'recordId':r['id'],'pageId':page['pageid'],'revision':page['revisions'][0]['revid'],'license':license_name,'attribution':r.get('creatorAttribution',r['performer']),'sourceUrl':info['descriptionurl']})
        r = records[title]; assert (r['pronunciationId'],r['deliveryId']) == (p['id'],d['id'])
        row['recordId'] = r['id']; row['studyId'] = gid; group['entries'].append((row,r,p,d))
    studies = []; readings = []
    for gid,g in groups.items():
        entries = g['entries']; portion = portions[g['portionId']]; name = g['readerLabel']+' · '+portion['name']+' · '+' / '.join(g['section'])
        study = {'id':gid,'name':name,'sourceTitle':portion['sourceTitle'],'sourceUrl':portion['sourceUrl'],'coverage':None,'coverageStatus':'Exact verse coverage and text correspondence remain unverified. No reader words, syllables or timestamps are assigned from the catalog heading.','pronunciations':list({p['id']:p for _,_,p,_ in entries}.values()),'deliveries':list({d['id']:d for _,_,_,d in entries}.values()),'recordingIds':list(dict.fromkeys(r['id']for _,r,_,_ in entries)),'description':'Original recorded chant, cataloged with separate melody and pronunciation labels. These labels and creator attribution are source claims, not independent performance review.','limits':'Fixed performances retain their own voice, pronunciation, pitch and clock. No complete melody grammar, Kinnor equivalence, generated missing combination or independently reviewed singing voice is supplied.','combinationStatus':'Choose either independent source label where available, or select an explicitly provided recording below. A recording button selects its two documented source labels together.','catalogNotes':[{'recordId':r['id'],'text':row['passageNote']}for row,r,_,_ in entries if row['passageNote']]}
        studies.append(study);readings.append({'id':gid,'studyId':gid,'portionId':g['portionId'],'name':name,'readerLabel':g['readerLabel'],'sourceRowIds':[row['id']for row,_,_,_ in entries],'recordIds':study['recordingIds']})
    featured = next(s['id']for s in studies if len(s['recordingIds']) == 5 and s['name'].startswith('Nombody'))
    new_records = [r for r in records.values() if r['id'] != existing['id']]
    counts = {'catalogRows':len(rows),'sourceReadings':len(readings),'canonicalFiles':len(files),'newRecordingReferences':len(new_records),'portions':len(portions),'books':len({p['bookId']for p in portions.values()}),'readerLabels':len({r['readerLabel']for r in rows}),'melodyLabels':len({r['melodyLabel']for r in rows}),'licenseFiles':dict(collections.Counter(f['license']for f in files)),'verifiedOriginals':len(verified),'newBundledAudio':0,'newAcceptedWordTimes':0,'newReviewedMelodyGrammars':0,'newSingingVoices':0}
    assert counts['sourceReadings'] == 277 and len(new_records) == 266 and counts['books'] == 5
    return {'schema':'tropetrain-source-readers-v1','revision':1,'retrieved':'2026-11-25','counts':counts,'sourcePack':{'file':str(PACK.relative_to(ROOT)),'bytes':len(raw),'sha256':PACK_SHA},'catalogSourcePack':manifest['catalogSourcePack'],'catalogSourceSha256':manifest['catalogSourceSha256'],'catalogLicense':{'id':'CC-BY-SA-4.0','url':'https://creativecommons.org/licenses/by-sa/4.0/'},'attribution':'Hebrew Wikisource contributors, source tables adapted as a reader finder; Commons contributors, original file metadata. Each unchanged audio source retains its own author attribution and license.','limits':'A broad catalog is not proof of full Torah verse coverage, pronunciation grammars or complete traditional melody systems. Numeric passage notes are retained without assigning unverified words; fixed recording pairs do not implement independent voice synthesis.','featuredStudyId':featured,'portions':list(portions.values()),'readings':readings,'rows':rows,'files':files,'studies':studies,'recordings':new_records,'acceptedWordTimes':None,'musicalReview':None,'kinnorEquivalence':None}

if __name__ == '__main__':
    catalog = generate()
    outputs = {'docs/SOURCE-READERS.json':json.dumps(catalog,ensure_ascii=False,indent=2)+'\n','source-readers-data.js':'// Generated only from pinned primary evidence.\nexport const SOURCE_READERS='+json.dumps(catalog,ensure_ascii=False,separators=(',',':'))+';\n'}
    for name,value in outputs.items():
        path = ROOT/name
        if '--check' in sys.argv: assert path.read_text() == value, name+' differs from pinned source evidence.'
        else: path.write_text(value)
    print(json.dumps(catalog['counts'],ensure_ascii=False))
