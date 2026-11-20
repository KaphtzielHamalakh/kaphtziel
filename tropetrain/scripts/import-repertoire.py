"""Import only unrestricted biblical Hebrew into the existing corpus format.

The private source directory must contain the directly verified UXLC files and
the index. Publisher headers/site code are not copied into the application.
Run from any directory: python3 scripts/import-repertoire.py --source-dir ...
"""
from pathlib import Path
import argparse
import collections
import hashlib
import json
import xml.etree.ElementTree as ET

BOOKS = [
    ('jos', 'Joshua', 'Joshua', 'prophets'),
    ('jdg', 'Judges', 'Judges', 'prophets'),
    ('sam1', '1 Samuel', 'Samuel_1', 'prophets'),
    ('sam2', '2 Samuel', 'Samuel_2', 'prophets'),
    ('kgs1', '1 Kings', 'Kings_1', 'prophets'),
    ('kgs2', '2 Kings', 'Kings_2', 'prophets'),
    ('isa', 'Isaiah', 'Isaiah', 'prophets'),
    ('jer', 'Jeremiah', 'Jeremiah', 'prophets'),
    ('ezk', 'Ezekiel', 'Ezekiel', 'prophets'),
    ('hos', 'Hosea', 'Hosea', 'prophets'),
    ('jol', 'Joel', 'Joel', 'prophets'),
    ('amo', 'Amos', 'Amos', 'prophets'),
    ('oba', 'Obadiah', 'Obadiah', 'prophets'),
    ('jon', 'Jonah', 'Jonah', 'prophets'),
    ('mic', 'Micah', 'Micah', 'prophets'),
    ('nah', 'Nahum', 'Nahum', 'prophets'),
    ('hab', 'Habakkuk', 'Habakkuk', 'prophets'),
    ('zep', 'Zephaniah', 'Zephaniah', 'prophets'),
    ('hag', 'Haggai', 'Haggai', 'prophets'),
    ('zec', 'Zechariah', 'Zechariah', 'prophets'),
    ('mal', 'Malachi', 'Malachi', 'prophets'),
    ('rut', 'Ruth', 'Ruth', 'megillot'),
    ('sng', 'Song of Songs', 'Song_of_Songs', 'megillot'),
    ('ecc', 'Ecclesiastes', 'Ecclesiastes', 'megillot'),
    ('lam', 'Lamentations', 'Lamentations', 'megillot'),
    ('est', 'Esther', 'Esther', 'megillot'),
]

def sha(raw):
    return hashlib.sha256(raw).hexdigest()

def word_text(element):
    # This follows the published Torah representation, without normalization.
    text = element.text or ''
    notes = []
    for child in element:
        if child.tag == 'x':
            notes.append({'kind': 'editorialCode', 'offset': len(text), 'code': child.text or ''})
        elif child.tag == 's':
            inner, inner_notes = word_text(child)
            offset = len(text)
            notes.append({'kind': 'letterSize', 'offset': offset,
                          'length': len(inner), 'size': child.get('t')})
            notes.extend({**note, 'offset': offset + note['offset']} for note in inner_notes)
            text += inner
        else:
            raise ValueError('Unhandled nested word markup: ' + child.tag)
        text += child.tail or ''
    return text, notes

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--source-dir', type=Path, required=True)
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    destination = root / 'data' / 'repertoire'
    evidence = json.loads((root / 'docs' / 'REPERTOIRE-SOURCES.json').read_text())
    verified = {record['filename']: record for record in evidence['verifiedXml']}
    index_raw = (args.source_dir / 'TanachIndex.xml').read_bytes()
    assert sha(index_raw) == evidence['index']['sha256'], 'Source index checksum changed'
    index = {book.findtext('names/filename'): [int(c.findtext('vs')) for c in book.findall('c')]
             for book in ET.fromstring(index_raw).iter('book')}
    destination.mkdir(parents=True, exist_ok=True)
    manifest = {key: evidence[key] for key in ['schemaVersion', 'edition', 'license', 'licenseUrl', 'retrieved']}
    manifest['representation'] = ('Exact unnormalized w/k/q Hebrew, editorial flags and source markers; '
                                  'written-only and reading-only records remain distinct. No musical or phonetic realization implied.')
    manifest['books'] = []
    for book_id, name, filename, repertoire in BOOKS:
        raw = (args.source_dir / (filename + '.xml')).read_bytes()
        assert sha(raw) == verified[filename]['sha256'], 'Source checksum changed: ' + filename
        xml = ET.fromstring(raw)
        assert xml.findtext('./teiHeader/fileDesc/editionStmt/edition/version') == 'UXLC 2.6'
        assert xml.findtext('./teiHeader/fileDesc/editionStmt/edition/build') == '27.7'
        source_book = xml.find('./tanach/book')
        assert source_book is not None
        assert source_book.findtext('names/filename') == filename
        hebrew_name = source_book.findtext('names/hebrewname')
        chapters, counts = [], collections.Counter()
        for chapter in source_book.findall('c'):
            chapter_number = int(chapter.attrib['n'])
            verses = []
            for verse in chapter.findall('v'):
                verse_number = int(verse.attrib['n'])
                tokens, markers = [], []
                for element in verse:
                    if element.tag in ('w', 'k', 'q'):
                        text, notes = word_text(element)
                        token = {'id': f'{book_id}-{chapter_number}-{verse_number}-{len(tokens) + 1}',
                                 'kind': element.tag, 'sourceHebrew': text}
                        if notes:
                            token['editorialNotes'] = notes
                        tokens.append(token)
                    elif element.tag in ('samekh', 'pe', 'reversednun', 'x'):
                        markers.append({'afterToken': len(tokens), 'kind': element.tag,
                                        'sourceText': element.text or ''})
                    else:
                        raise ValueError('Unhandled verse markup: ' + element.tag)
                    counts[element.tag] += 1
                verses.append({'number': verse_number, 'tokens': tokens, 'markers': markers})
            assert [v['number'] for v in verses] == list(range(1, len(verses) + 1))
            chapters.append({'number': chapter_number, 'verses': verses})
        assert [c['number'] for c in chapters] == list(range(1, len(chapters) + 1))
        chapter_lengths = [len(c['verses']) for c in chapters]
        assert chapter_lengths == index[filename], 'Book/index boundaries differ: ' + filename
        book = {'id': book_id, 'name': name, 'hebrewName': hebrew_name,
                'repertoire': repertoire, 'sourceUrl': verified[filename]['url'],
                'sourceSha256': sha(raw), 'chapters': chapters}
        target = destination / (book_id + '.json')
        target.write_text(json.dumps(book, ensure_ascii=False, separators=(',', ':')) + '\n')
        manifest['books'].append({key: book[key] for key in
                                  ['id', 'name', 'hebrewName', 'repertoire', 'sourceUrl', 'sourceSha256']})
        manifest['books'][-1].update({'file': target.name, 'dataSha256': sha(target.read_bytes()),
                                     'chapters': len(chapters), 'chapterVerseCounts': chapter_lengths,
                                     'verseRecords': sum(chapter_lengths), 'tokenKinds': dict(counts)})
    (destination / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    imports = ["import manifest from './data/repertoire/manifest.json' with {type:'json'};"]
    imports.extend(f"import {book['id']} from './data/repertoire/{book['file']}' with {{type:'json'}};"
                   for book in manifest['books'])
    imports.extend(['', '// Exact JSON inputs for Node checks; a later UI build can embed the same bytes.',
                    'export async function loadRepertoire(){return {manifest,books:[' +
                    ','.join(book['id'] for book in manifest['books']) + ']};}', ''])
    (root / 'repertoire-data.js').write_text('\n'.join(imports))
    print(json.dumps({'books': len(manifest['books']),
                      'chapters': sum(b['chapters'] for b in manifest['books']),
                      'verseRecords': sum(b['verseRecords'] for b in manifest['books']),
                      'tokenKinds': dict(sum((collections.Counter(b['tokenKinds']) for b in manifest['books']), collections.Counter()))}))

if __name__ == '__main__':
    main()
