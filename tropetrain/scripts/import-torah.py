"""Import unrestricted UXLC Hebrew, preserving source codepoints and XML distinctions.

Usage: python3 scripts/import-torah.py --source-dir /absolute/path/to/xml
Source XML stays outside the published app. No source stylesheets or site code used.
"""
from pathlib import Path
import argparse
import collections
import hashlib
import json
import xml.etree.ElementTree as ET

BOOKS = [('gen', 'Genesis', 'בראשית'), ('exo', 'Exodus', 'שמות'),
         ('lev', 'Leviticus', 'ויקרא'), ('num', 'Numbers', 'במדבר'),
         ('deu', 'Deuteronomy', 'דברים')]
parser = argparse.ArgumentParser()
parser.add_argument('--source-dir', type=Path, required=True)
args = parser.parse_args()
destination = Path(__file__).resolve().parents[1] / 'data' / 'torah'
destination.mkdir(parents=True, exist_ok=True)
manifest = {'schemaVersion': 1, 'edition': 'Unicode/XML Leningrad Codex (UXLC) 2.6, build 27.7',
            'license': 'Biblical Hebrew may be viewed or copied without restriction.',
            'licenseUrl': 'https://www.tanach.us/License.html', 'retrieved': '2026-11-18',
            'representation': 'Reading tokens retain w/q; written k tokens, section markers and editorial flags remain separately available. No Unicode normalization applied.',
            'books': []}

def word_text(element):
    # x-tag contents are editorial codes, not Hebrew. Their tails are Hebrew.
    text = element.text or ''
    notes = []
    for child in element:
        if child.tag == 'x':
            notes.append({'kind': 'editorialCode', 'offset': len(text), 'code': child.text or ''})
        elif child.tag == 's':
            inner, inner_notes = word_text(child)
            offset = len(text)
            notes.append({'kind': 'letterSize', 'offset': offset, 'length': len(inner), 'size': child.get('t')})
            notes.extend({**n, 'offset': offset + n['offset']} for n in inner_notes)
            text += inner
        else:
            raise ValueError('Unhandled nested word markup: ' + child.tag)
        text += child.tail or ''
    return text, notes

for book_id, name, hebrew_name in BOOKS:
    source = args.source_dir / (name + '.xml')
    raw = source.read_bytes()
    xml = ET.fromstring(raw)
    chapters = []
    counts = collections.Counter()
    ids = set()
    for chapter in xml.iter('c'):
        chapter_number = int(chapter.attrib['n'])
        verses = []
        for verse in chapter.findall('v'):
            verse_number = int(verse.attrib['n'])
            tokens, markers, word_index = [], [], 0
            for element in verse:
                if element.tag in ('w', 'k', 'q'):
                    word_index += 1
                    text, notes = word_text(element)
                    token_id = f'{book_id}-{chapter_number}-{verse_number}-{word_index}'
                    assert token_id not in ids
                    ids.add(token_id)
                    token = {'id': token_id, 'kind': element.tag, 'sourceHebrew': text}
                    if notes:
                        token['editorialNotes'] = notes
                    tokens.append(token)
                    counts[element.tag] += 1
                elif element.tag in ('samekh', 'pe', 'reversednun', 'x'):
                    markers.append({'afterToken': word_index, 'kind': element.tag,
                                    'sourceText': element.text or ''})
                    counts[element.tag] += 1
                else:
                    raise ValueError('Unhandled verse markup: ' + element.tag)
            verses.append({'number': verse_number, 'tokens': tokens, 'markers': markers})
        assert [v['number'] for v in verses] == list(range(1, len(verses) + 1))
        chapters.append({'number': chapter_number, 'verses': verses})
    assert [c['number'] for c in chapters] == list(range(1, len(chapters) + 1))
    book = {'id': book_id, 'name': name, 'hebrewName': hebrew_name,
            'sourceUrl': f'https://www.tanach.us/Books/{name}.xml',
            'sourceSha256': hashlib.sha256(raw).hexdigest(), 'chapters': chapters}
    target = destination / (book_id + '.json')
    target.write_text(json.dumps(book, ensure_ascii=False, separators=(',', ':')) + '\n')
    manifest['books'].append({'id': book_id, 'name': name, 'hebrewName': hebrew_name,
                              'file': target.name, 'sourceUrl': book['sourceUrl'],
                              'sourceSha256': book['sourceSha256'],
                              'dataSha256': hashlib.sha256(target.read_bytes()).hexdigest(),
                              'chapters': len(chapters),
                              'verseRecords': sum(len(c['verses']) for c in chapters),
                              'tokenKinds': dict(counts)})
    print(name, len(chapters), 'chapters,', manifest['books'][-1]['verseRecords'], 'source verse records')
(destination / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
