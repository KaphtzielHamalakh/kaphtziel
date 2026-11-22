"""Verify/rebuild optional phonetic word-correspondence packets from pinned research outputs."""
from pathlib import Path
import gzip
import hashlib
import json
import sys
import zipfile

root = Path(__file__).resolve().parent.parent
summary = json.loads((root / 'docs/ASAEL-PHONETIC-WORDS.json').read_text())
pack = root / summary['sourcePack']['file']
assert hashlib.sha256(pack.read_bytes()).hexdigest() == summary['sourcePack']['sha256']
assert summary['status'] == 'unreviewed-consonant-correspondence' and summary['review'] is None and summary['newSingingVoice'] is None
with zipfile.ZipFile(pack) as archive:
    manifest = json.loads(archive.read('manifest.json'))
    for item in manifest['files']:
        data = archive.read(item['file'])
        assert len(data) == item['bytes'] and hashlib.sha256(data).hexdigest() == item['sha256']
    assert b'license: apache-2.0' in archive.read('research/model-card.md')
    assert b'Version 2.0, January 2004' in archive.read('research/Apache-2.0.txt')
    for link in [b'https://creativecommons.org/licenses/by-sa/3.0/', b'https://creativecommons.org/licenses/by-sa/4.0/']:
        assert link in archive.read('README.md')
    for record in summary['records']:
        raw = archive.read('proposals/' + record['recordId'] + '.json')
        value = json.loads(raw)
        assert value['source']['id'] == record['recordId'] and value['source']['sha256'] == record['originalSha256']
        assert value['format'] == 'tropetrain-phonetic-word-correspondence-v1' and value['status'] == 'unreviewed-consonant-correspondence'
        assert value['comparisonStyles'] == ['sephardic', 'ashkenazic']
        for field in ['wordTimes', 'syllableAlignment', 'phonemes', 'musicalNotes', 'independentReview', 'newSingingVoice']:
            assert value[field] is None
        for study in value['studies'].values():
            assert len(study['words']) == record['words'] == 469
            for word in study['words']:
                assert word['approvedWordBoundary'] is None and word['review'] is None and word['phonemes'] is None and word['audioTimes'] is None
        data = gzip.compress(raw, compresslevel=9, mtime=0)
        assert len(data) == record['bytes'] and hashlib.sha256(data).hexdigest() == record['sha256']
        target = root / record['file']
        if '--check' in sys.argv:
            assert target.read_bytes() == data
        else:
            target.parent.mkdir(exist_ok=True, parents=True)
            target.write_bytes(data)
javascript = '// Generated from docs/ASAEL-PHONETIC-WORDS.json.\nexport const PHONETIC_WORDS=' + json.dumps(summary, ensure_ascii=False, separators=(',', ':')) + ';\n'
target = root / 'phonetic-word-summary.js'
if '--check' in sys.argv:
    assert target.read_text() == javascript
else:
    target.write_text(javascript)
print('Verified two source-specific 469-word phonetic studies with two independent text comparisons; accepted sounds and times stay unassigned.')
