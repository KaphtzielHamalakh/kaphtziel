"""Independent DOM text comparison against private, checksum-pinned XML."""
from pathlib import Path
from xml.dom import minidom, Node
import argparse
import hashlib
import json

parser = argparse.ArgumentParser()
parser.add_argument('--source-dir', type=Path, required=True)
args = parser.parse_args()
app = Path(__file__).resolve().parents[1]
private = args.source_dir
manifest = json.loads((app / 'data/repertoire/manifest.json').read_text())
sources = json.loads((app / 'docs/REPERTOIRE-SOURCES.json').read_text())
verified = {record['sha256']: record for record in sources['verifiedXml']}

def hebrew_text(node):
    """DOM text in document order, excluding editorial x contents, not tails."""
    return ''.join(child.data if child.nodeType in (Node.TEXT_NODE, Node.CDATA_SECTION_NODE)
                   else hebrew_text(child) if child.nodeType == Node.ELEMENT_NODE and child.tagName != 'x'
                   else '' for child in node.childNodes)

results = []
for meta in manifest['books']:
    book = json.loads((app / 'data/repertoire' / meta['file']).read_text())
    source = private / (verified[meta['sourceSha256']]['filename'] + '.xml')
    raw = source.read_bytes()
    assert hashlib.sha256(raw).hexdigest() == meta['sourceSha256']
    xml = minidom.parseString(raw)
    xml_chapters = xml.getElementsByTagName('c')
    token_count, marker_count, exact = 0, 0, hashlib.sha256()
    assert len(xml_chapters) == len(book['chapters'])
    for xml_chapter, chapter in zip(xml_chapters, book['chapters']):
        assert int(xml_chapter.getAttribute('n')) == chapter['number']
        xml_verses = xml_chapter.getElementsByTagName('v')
        assert len(xml_verses) == len(chapter['verses'])
        for xml_verse, verse in zip(xml_verses, chapter['verses']):
            assert int(xml_verse.getAttribute('n')) == verse['number']
            elements = [child for child in xml_verse.childNodes if child.nodeType == Node.ELEMENT_NODE]
            source_tokens = [child for child in elements if child.tagName in ('w', 'k', 'q')]
            assert len(source_tokens) == len(verse['tokens'])
            for index, (node, token) in enumerate(zip(source_tokens, verse['tokens']), 1):
                expected = hebrew_text(node)
                assert node.tagName == token['kind']
                assert expected == token['sourceHebrew'], token['id']
                assert token['id'] == f"{book['id']}-{chapter['number']}-{verse['number']}-{index}"
                exact.update(json.dumps([token['id'], node.tagName, expected], ensure_ascii=False, separators=(',', ':')).encode())
                exact.update(b'\n')
                token_count += 1
            actual_markers = []
            after = 0
            for child in elements:
                if child.tagName in ('w', 'k', 'q'):
                    after += 1
                else:
                    actual_markers.append({'afterToken': after, 'kind': child.tagName,
                                           'sourceText': ''.join(node.data for node in child.childNodes if node.nodeType == Node.TEXT_NODE)})
            assert verse['markers'] == actual_markers
            marker_count += len(actual_markers)
    results.append({'bookId': book['id'], 'sourceTokens': token_count, 'markers': marker_count,
                    'exactDomTextAndIdSha256': exact.hexdigest()})
report = {'date': '2026-11-20', 'method': 'Separate Python minidom parser; compare every original w/k/q text in document order, source-token ID, verse/chapter boundary and marker position. No Unicode normalization. Importer uses ElementTree.',
          'books': results, 'sourceTokens': sum(r['sourceTokens'] for r in results),
          'sourceMarkers': sum(r['markers'] for r in results),
          'limits': 'Digital source correspondence only. No independent musical, linguistic, scribal or liturgical approval.'}
(app / 'docs/REPERTOIRE-AUDIT.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps({'books': len(results), 'sourceTokens': report['sourceTokens'],
                  'sourceMarkers': report['sourceMarkers'], 'allExact': True}))
