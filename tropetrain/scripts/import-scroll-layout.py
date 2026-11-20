"""Import pinned layout data only. No code from the source archive is executed."""
from pathlib import Path
import base64, collections, difflib, gzip, hashlib, json, re, zipfile

ROOT = Path(__file__).resolve().parents[1]
record = json.loads((ROOT / 'docs/SCROLL-SOURCES.json').read_text())
font = (ROOT / 'assets/ShlomoStam.ttf').read_bytes()
assert len(font) == record['font']['fontBytes']
assert hashlib.sha256(font).hexdigest() == record['font']['fontSha256']
assert hashlib.sha256((ROOT / 'assets/ShlomoStam-OFL.txt').read_bytes()).hexdigest() == record['font']['licenseSha256']
pack = (ROOT / record['source']['pack']).read_bytes()
assert len(pack) == record['source']['packBytes']
assert hashlib.sha256(pack).hexdigest() == record['source']['packSha256']
raw = {}
with zipfile.ZipFile(ROOT / record['source']['pack']) as archive:
    for entry in record['source']['sourceFiles']:
        data = archive.read(entry['path'])
        assert len(data) == entry['size'], entry['path']
        assert hashlib.sha1(b'blob ' + str(len(data)).encode() + b'\0' + data).hexdigest() == entry['sha'], entry['path']
        raw[entry['path']] = data

BOOKS = ['gen', 'exo', 'lev', 'num', 'deu']
letters = lambda text: ''.join(re.findall('[א-ת]', text))
def letter_sizes(token):
    output = []
    for note in token.get('editorialNotes', []):
        if note.get('kind') != 'letterSize':
            continue
        first = len(letters(token['sourceHebrew'][:note['offset']]))
        count = len(letters(token['sourceHebrew'][note['offset']:note['offset'] + note['length']]))
        output.extend({'index': first + i, 'size': note['size']} for i in range(count))
    return output
toc = json.loads(raw['src/data/tables-of-contents/torah.json'])
starts = {(toc[str(i + 1)]['1']['1']['p'], toc[str(i + 1)]['1']['1']['l']): book for i, book in enumerate(BOOKS)}
layout = {book: [] for book in BOOKS}
rows = []
page_lengths = {}
book = None
for page in range(1, 246):
    source_rows = json.loads(raw[f'src/data/pages/torah/{page}.json'])
    page_lengths[page] = len(source_rows)
    for line, source_row in enumerate(source_rows, 1):
        book = starts.get((page, line), book)
        row = {'page': page, 'line': line, 'petucha': source_row['isPetucha'], 'cells': []}
        rows.append(row)
        for column, source_column in enumerate(source_row['text']):
            cell = []
            row['cells'].append(cell)
            for fragment, original in enumerate(source_column):
                group = []
                cell.append(group)
                # These are source markup, not Torah letters. Keep a space at
                # alternative-reading boundaries (Numbers 23:13 is adjacent).
                written = re.sub(r'#\([^)]*\)|\([^)]*\)#', '', original)
                written = re.sub(r'#\[[^]]*\]', ' ', written)
                assert not any(char in written for char in '#[]'), (page, line, original)
                for token in re.split(r'[\s־]+', written):
                    text = letters(token)
                    if not text:
                        continue
                    assert book is not None
                    item = {'text': text, 'page': page, 'line': line, 'column': column, 'fragment': fragment, 'group': group, 'raw': token}
                    layout[book].append(item)

differences = []
summary = []
variant_counts = collections.Counter()
canonical_ids = set()
piece_number = 0
for book in BOOKS:
    source_book = json.loads((ROOT / f'data/torah/{book}.json').read_text())
    units = []
    for chapter in source_book['chapters']:
        for verse in chapter['verses']:
            tokens = verse['tokens']
            index = 0
            while index < len(tokens):
                token = tokens[index]
                if token['kind'] == 'k':
                    ks, qs = [], []
                    while index < len(tokens) and tokens[index]['kind'] == 'k':
                        ks.append(tokens[index]); index += 1
                    while index < len(tokens) and tokens[index]['kind'] == 'q':
                        qs.append(tokens[index]); index += 1
                    assert qs, ks
                    variant_counts[f'{len(ks)}k:{len(qs)}q'] += 1
                    for k in ks:
                        units.append({'text': letters(k['sourceHebrew']), 'writtenId': k['id'], 'ids': [q['id'] for q in qs], 'variant': True, 'letterSizes': letter_sizes(k)})
                    canonical_ids.update(q['id'] for q in qs)
                    continue
                if token['kind'] in ['w', 'q'] and letters(token['sourceHebrew']):
                    units.append({'text': letters(token['sourceHebrew']), 'writtenId': token['id'], 'ids': [token['id']], 'variant': False, 'letterSizes': letter_sizes(token)})
                    canonical_ids.add(token['id'])
                index += 1
    source_units = layout[book]
    matcher = difflib.SequenceMatcher(None, [u['text'] for u in units], [s['text'] for s in source_units], autojunk=False)
    exact_count = 0

    def emit(source, selected, written, status):
        global piece_number
        piece_number += 1
        piece = {'id': piece_number, 'book': book, 'readingIds': list(dict.fromkeys(i for u in selected for i in u['ids'])),
                 'writtenIds': [u['writtenId'] for u in selected], 'written': written, 'layoutSource': source['text'],
                 'status': status, 'variant': any(u['variant'] for u in selected)}
        if any(unit['letterSizes'] for unit in selected):
            assert len(selected) == 1 and written == selected[0]['text'], 'Review enlarged-letter mapping across a source division.'
            piece['letterSizes'] = selected[0]['letterSizes']
            assert all(0 <= size['index'] < len(written) and size['size'] in ['large', 'small'] for size in piece['letterSizes'])
        source['group'].append(piece)

    for operation, a, z, b, y in matcher.get_opcodes():
        us, ss = units[a:z], source_units[b:y]
        if operation == 'equal':
            exact_count += len(us)
            for unit, source in zip(us, ss):
                emit(source, [unit], unit['text'], 'exact')
            continue
        assert operation == 'replace', (book, operation, us, ss)
        spelling = len(us) == len(ss)
        if spelling:
            for unit, source in zip(us, ss):
                emit(source, [unit], unit['text'], 'spelling-difference')
        else:
            assert ''.join(u['text'] for u in us) == ''.join(s['text'] for s in ss), (book, us, ss)
            # The letters agree, but the two editions divide words differently.
            # Split only displayed letters; never invent a sung syllable.
            offset = 0
            for source in ss:
                end = offset + len(source['text'])
                selected = []
                written = ''
                position = 0
                for unit in us:
                    stop = position + len(unit['text'])
                    lo, hi = max(offset, position), min(end, stop)
                    if lo < hi:
                        selected.append(unit)
                        written += unit['text'][lo - position:hi - position]
                    position = stop
                assert written == source['text']
                emit(source, selected, written, 'word-division')
                offset = end
        differences.append({'book': book, 'kind': 'spelling-difference' if spelling else 'word-division',
                            'uxlc': [{'id': u['writtenId'], 'text': u['text'], 'readingIds': u['ids']} for u in us],
                            'layout': [{k: s[k] for k in ['text', 'page', 'line', 'column', 'fragment']} for s in ss]})
    expected = ''.join(u['text'] for u in units)
    # A group can hold several words. Walk the source rows once.
    book_pieces = [p for row in rows for cell in row['cells'] for group in cell for p in group if p['book'] == book]
    assert ''.join(p['written'] for p in book_pieces) == expected, book
    summary.append({'book': book, 'uxlcWrittenUnits': len(units), 'layoutWrittenUnits': len(source_units), 'exactUnitMatches': exact_count})

pieces = [p for row in rows for cell in row['cells'] for group in cell for p in group]
assert {i for p in pieces for i in p['readingIds']} == canonical_ids
assert len(canonical_ids) == 79985
assert len(pieces) == sum(len(v) for v in layout.values())
data = {'id': record['id'], 'revision': record['revision'], 'rows': rows}
encoded = json.dumps(data, ensure_ascii=False, separators=(',', ':')).encode()
target = ROOT / 'data/layout'; target.mkdir(parents=True, exist_ok=True)
compressed = gzip.compress(encoded, compresslevel=9, mtime=0)
(target / 'torah-layout.json.gz').write_bytes(compressed)
(ROOT / 'scroll-layout-data.js').write_text('// Generated from pinned source data; do not edit.\nexport const encoded = ' + json.dumps(base64.b64encode(compressed).decode()) + ';\n')
audit = {'id': record['id'], 'revision': record['revision'], 'sourceCommit': record['source']['commit'], 'summary': summary,
         'sourceColumns': 245, 'sourceRows': len(rows), 'sourcePageLengths': dict(collections.Counter(page_lengths.values())),
         'unusualPages': {p: n for p, n in page_lengths.items() if n != 42}, 'readingWordsCovered': len(canonical_ids),
         'pieces': len(pieces), 'variantCounts': dict(variant_counts), 'differenceGroups': len(differences),
         'differences': differences, 'dataSha256': hashlib.sha256(encoded).hexdigest(),
         'review': 'Automatic source correspondence only; spelling and word-division differences are flagged. No source text, preferred reading, syllable or phoneme was changed.'}
(ROOT / 'docs/SCROLL-LAYOUT-AUDIT.json').write_text(json.dumps(audit, ensure_ascii=False, indent=2) + '\n')
print(f'Validated 248 pinned layout files; {len(canonical_ids)} reading IDs covered, {len(differences)} explicit difference groups.')
