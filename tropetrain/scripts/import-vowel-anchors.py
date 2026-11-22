"""Recompute structural vowel observations from two exact existing source packs."""
from pathlib import Path
import gzip, hashlib, json, subprocess, sys, tempfile, zipfile
from vowel_source_inventory import source_unit_inventory

root = Path(__file__).resolve().parent.parent
summary = json.loads((root / 'docs/ASAEL-VOWEL-ANCHORS.json').read_text())
pack = root / summary['sourcePack']['file']
sha = lambda b: hashlib.sha256(b).hexdigest()
assert len(pack.read_bytes()) == summary['sourcePack']['bytes'] and sha(pack.read_bytes()) == summary['sourcePack']['sha256']
assert summary['status'] == 'unreviewed-structural-vowel-observations'
assert summary['review'] is summary['newSingingVoice'] is summary['approvedPhonemes'] is summary['approvedWordOrSyllableTimes'] is None
for dep in summary['dependencies']:
    assert sha((root / dep['file']).read_bytes()) == dep['sha256']
with zipfile.ZipFile(root / summary['dependencies'][0]['file']) as original:
    inventory = source_unit_inventory(json.loads(original.read('research/source-pronunciation-bindings.json')))
    assert inventory == summary['sourceUnitInventory']
    assert all(inventory['sourceUnits'][s] == 1120 and inventory['unitsWithSeparateVowelCategory'][s] == 1106 and len(inventory['unsplitCompounds'][s]) == 14 for s in ['sephardic', 'ashkenazic'])
with zipfile.ZipFile(pack) as archive, tempfile.TemporaryDirectory(prefix='tropetrain-vowels-') as folder:
    temp = Path(folder)
    manifest = json.loads(archive.read('manifest.json'))
    for item in manifest['files']:
        data = archive.read(item['file'])
        assert len(data) == item['bytes'] and sha(data) == item['sha256']
    assert json.loads(archive.read('research/source-unit-inventory.json')) == inventory
    assert archive.read('research/vowel_source_inventory.py') == (root / 'scripts/vowel_source_inventory.py').read_bytes()
    assert b'Version 2.0, January 2004' in archive.read('research/Apache-2.0.txt')
    for url in [b'https://creativecommons.org/licenses/by-sa/3.0/', b'https://creativecommons.org/licenses/by-sa/4.0/']:
        assert url in archive.read('README.md')
    for name in ['analyze_vowels.py', 'vowel_anchors.py', 'consonance.py']:
        (temp / name).write_bytes(archive.read('research/' + name))
    # Project-authored code only, with pinned input hashes; no model or third-party executable.
    subprocess.run([sys.executable, str(temp / 'analyze_vowels.py'), '--base-pack', str(root / summary['dependencies'][0]['file']), '--ctc-pack', str(root / summary['dependencies'][1]['file']), '--output', str(temp / 'rebuilt')], check=True, stdout=subprocess.DEVNULL)
    for record in summary['records']:
        raw = archive.read('proposals/' + record['recordId'] + '.json')
        assert (temp / 'rebuilt' / (record['recordId'] + '.json')).read_bytes() == raw
        value = json.loads(raw)
        assert value['source']['id'] == record['recordId'] and value['source']['sha256'] == record['originalSha256']
        assert value['comparisonStyles'] == ['sephardic', 'ashkenazic']
        for study in value['studies'].values():
            assert len(study['words']) == record['words'] == 469
            assert sum(len(w['sourceVowels']) for w in study['words']) == 1106
        data = gzip.compress(raw, compresslevel=9, mtime=0)
        assert len(data) == record['bytes'] and sha(data) == record['sha256']
        target = root / record['file']
        if '--check' in sys.argv:
            assert target.read_bytes() == data
        else:
            target.parent.mkdir(exist_ok=True, parents=True)
            target.write_bytes(data)
javascript = '// Generated from docs/ASAEL-VOWEL-ANCHORS.json.\nexport const VOWEL_ANCHORS=' + json.dumps(summary, ensure_ascii=False, separators=(',', ':')) + ';\n'
target = root / 'vowel-anchor-summary.js'
if '--check' in sys.argv:
    assert target.read_text() == javascript
else:
    target.write_text(javascript)
print('Recomputed both complete structural vowel studies from pinned source packets; marked differences and unassigned sounds/times retained.')
