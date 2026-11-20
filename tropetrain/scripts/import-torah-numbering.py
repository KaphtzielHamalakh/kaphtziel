"""Derive numeric boundary facts; comparison API responses remain private.

python3 scripts/import-torah-numbering.py --source-dir /path/to/comparison
"""
import argparse
import hashlib
import json
from html.parser import HTMLParser
from pathlib import Path

class PreferredText(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stack = []
        self.parts = []

    def handle_starttag(self, tag, attrs):
        if tag == 'br':
            return
        assert tag in ('span', 'b', 'small'), 'Review new source presentation markup: ' + tag
        classes = dict(attrs).get('class', '').split()
        skip = any(value.startswith('mam-spi-') or value == 'mam-kq-k' for value in classes)
        self.stack.append((tag, skip or bool(self.stack and self.stack[-1][1])))

    def handle_endtag(self, tag):
        if tag == 'br':
            return
        assert self.stack and self.stack[-1][0] == tag
        self.stack.pop()

    def handle_data(self, text):
        if not self.stack or not self.stack[-1][1]:
            self.parts.append(text)

    def letters(self):
        assert not self.stack
        return ''.join(char for char in ''.join(self.parts) if 'א' <= char <= 'ת')

def sha(raw):
    return hashlib.sha256(raw).hexdigest()

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--source-dir', type=Path, required=True)
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    manifest = json.loads((root / 'data/torah/manifest.json').read_text())
    rights_raw = (args.source_dir / 'wikisource-rights.json').read_bytes()
    rights = json.loads(rights_raw)['query']['rightsinfo']
    assert 'creativecommons.org/licenses/by-sa/4.0/' in rights['url']
    chapters, sources = [], []
    for name, book_id, chapter_number, combined in [('Exodus', 'exo', 20, 13), ('Deuteronomy', 'deu', 5, 17)]:
        source_raw = (args.source_dir / (name + '.json')).read_bytes()
        source = json.loads(source_raw)
        assert source['heVersionTitle'] == 'Miqra according to the Masorah'
        assert source['heLicense'] == 'CC-BY-SA'
        book = json.loads((root / 'data/torah' / (book_id + '.json')).read_text())
        meta = next(record for record in manifest['books'] if record['id'] == book_id)
        assert sha((root / 'data/torah' / (book_id + '.json')).read_bytes()) == meta['dataSha256']
        target = book['chapters'][chapter_number - 1]
        assert len(source['he']) + 3 == len(target['verses'])
        mappings = []
        for number, html in enumerate(source['he'], 1):
            first = number if number <= combined else number + 3
            last = number + 3 if number == combined else first
            tokens = [token for verse in target['verses'][first - 1:last]
                      for token in verse['tokens'] if token['kind'] != 'k']
            letters = ''.join(char for token in tokens for char in token['sourceHebrew'] if 'א' <= char <= 'ת')
            text = PreferredText()
            text.feed(html)
            assert text.letters() == letters, f'Review source/target letters: {name} {chapter_number}:{number}'
            mappings.append({'sourceVerse': number, 'targetStart': first, 'targetEnd': last,
                             'firstWordId': tokens[0]['id'], 'lastWordId': tokens[-1]['id'],
                             'readingWords': len(tokens), 'preferredLettersSha256': sha(letters.encode())})
        chapters.append({'bookId': book_id, 'chapter': chapter_number, 'sourceVerseCount': len(source['he']),
                         'targetVerseRecords': len(target['verses']), 'sourceSha256': book['sourceSha256'],
                         'dataSha256': meta['dataSha256'], 'mappings': mappings})
        sources.append({'url': f'https://www.sefaria.org/api/texts/{name}.{chapter_number}?context=0&commentary=0',
                        'bytes': len(source_raw), 'sha256': sha(source_raw), 'hebrewVersion': source['heVersionTitle'],
                        'hebrewVersionSource': source['heVersionSource'], 'hebrewLicenseMetadata': source['heLicense'],
                        'scope': 'Private comparison response; only Hebrew preferred-reading boundaries used. No response/translation/site markup distributed.'})
    data = {'id': 'hebcal-uxlc-torah-numbering-v1', 'revision': 1, 'license': 'CC BY-SA 4.0',
            'licenseUrl': 'https://creativecommons.org/licenses/by-sa/4.0/',
            'sourceCoordinates': 'Hebcal-linked Sefaria/Miqra according to the Masorah verse coordinates',
            'targetCoordinates': manifest['edition'], 'chapters': chapters}
    (root / 'data/calendar/torah-verse-numbering.json').write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
    evidence = {'id': data['id'], 'revision': 1, 'retrieved': '2026-11-20', 'license': data['license'], 'licenseUrl': data['licenseUrl'],
                'attribution': 'Miqra according to the Masorah contributors, Hebrew Wikisource; Hebrew comparison served by Sefaria.org. Target Hebrew: Tanach.us UXLC. New numeric mapping and checks by the TropeTrain reconstruction.',
                'primaryContext': ['https://www.tanach.us/Supplements/Decalogues.html', 'https://www.hebcal.com/sedrot/vaetchanan-20220813', 'https://www.hebcal.com/holidays/shavuot-2022'],
                'comparisonSources': sources, 'rightsMetadata': {'url': 'https://he.wikisource.org/w/api.php?action=query&meta=siteinfo&siprop=rightsinfo&format=json', 'sha256': sha(rights_raw), **rights},
                'method': 'Original candidate boundary rule checked against all53 complete source verses in Exodus20/Deuteronomy5. For comparison only: HTML presentation/section markers and ketiv display removed, preferred-reading Hebrew letters compared exactly. No Unicode normalization or source-text rewriting. Every target word ID/boundary and target JSON/XML hash retained.',
                'comparison': {'sourceVerses': sum(c['sourceVerseCount'] for c in chapters), 'uxlcVerseRecords': sum(c['targetVerseRecords'] for c in chapters), 'allPreferredLetterSequencesMatch': True},
                'oldReferenceLimit': 'Existing pinned2012 PocketTorah source splits its Deut5:21/22 at a different point inside UXLC5:24. That source data is preserved; its verse labels are not used to derive this map.',
                'limits': 'Two explicit chapter-coordinate maps only. Does not separate upper/lower marks, supply chant/phonemes or establish congregational/musical review. Outside these chapters, numeric references and source counts are checked without a new versification claim. Imported source metadata is not a signed/refetched provider response.'}
    (root / 'docs/TORAH-NUMBERING-SOURCES.json').write_text(json.dumps(evidence, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'sourceVerses': evidence['comparison']['sourceVerses'], 'targetRecords': evidence['comparison']['uxlcVerseRecords'], 'allLetterSequencesMatch': True}))

if __name__ == '__main__':
    main()
