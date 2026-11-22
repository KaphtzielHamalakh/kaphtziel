"""Verify/rebuild optional token-support packets from pinned research outputs."""
from pathlib import Path
import gzip
import hashlib
import json
import sys
import zipfile

root = Path(__file__).resolve().parent.parent
summary = json.loads((root / 'docs/ASAEL-WORD-SUPPORT.json').read_text())
pack = root / summary['sourcePack']['file']
assert hashlib.sha256(pack.read_bytes()).hexdigest() == summary['sourcePack']['sha256']
assert summary['status'] == 'unreviewed-model-support' and summary['review'] is None and summary['newSingingVoice'] is None
with zipfile.ZipFile(pack) as archive:
    manifest = json.loads(archive.read('manifest.json'))
    for item in manifest['files']:
        data = archive.read(item['file'])
        assert len(data) == item['bytes'] and hashlib.sha256(data).hexdigest() == item['sha256']
    assert b'license: apache-2.0' in archive.read('research/model-card.md')
    for record in summary['records']:
        raw = archive.read('proposals/' + record['recordId'] + '.json')
        value = json.loads(raw)
        assert value['source']['id'] == record['recordId'] and value['source']['sha256'] == record['originalSha256']
        assert value['format'] == 'tropetrain-word-support-v1' and value['status'] == 'unreviewed-model-support'
        assert len(value['words']) == record['words'] == 469
        for field in ['timedWords', 'syllableAlignment', 'phonemes', 'musicalNotes', 'independentReview']:
            assert value[field] is None
        for word in value['words']:
            assert word['approvedBoundary'] is None and word['review'] is None
        data = gzip.compress(raw, compresslevel=9, mtime=0)
        assert len(data) == record['bytes'] and hashlib.sha256(data).hexdigest() == record['sha256']
        target = root / record['file']
        if '--check' in sys.argv:
            assert target.read_bytes() == data
        else:
            target.parent.mkdir(exist_ok=True, parents=True)
            target.write_bytes(data)
javascript = '// Generated from docs/ASAEL-WORD-SUPPORT.json.\nexport const WORD_SUPPORT=' + json.dumps(summary, ensure_ascii=False, separators=(',', ':')) + ';\n'
target = root / 'word-support-summary.js'
if '--check' in sys.argv:
    assert target.read_text() == javascript
else:
    target.write_text(javascript)
print('Verified two source-specific 469-word token-support studies; no word/phoneme/voice review introduced.')
