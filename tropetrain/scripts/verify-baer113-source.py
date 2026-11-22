"""Verify faithful source pixels against the three pinned native library images.

python3 scripts/verify-baer113-source.py DIRECTORY
Place baer-page-37-native.jpg, baer-page-38-native.jpg and
baer-page-39-native.jpg in DIRECTORY, using the sourceImageUrl values in
docs/BAER-HIGH-HOLIDAY-SCORE.json. Requires Pillow. Does not fetch or write files.
"""
from pathlib import Path
from PIL import Image
import hashlib, json, sys

app = Path(__file__).resolve().parent.parent
native = Path(sys.argv[1])
record = json.loads((app / 'docs/BAER-HIGH-HOLIDAY-SCORE.json').read_text())
for scan in record['scans']:
    source = native / f"baer-page-{scan['printedPage']}-native.jpg"
    original = source.read_bytes()
    assert len(original) == scan['sourceImageBytes']
    assert hashlib.sha256(original).hexdigest() == scan['sourceImageSha256'], 'Different native image'
    crop = app / scan['file']
    raw = crop.read_bytes()
    assert len(raw) == scan['bytes'] and hashlib.sha256(raw).hexdigest() == scan['sha256']
    with Image.open(source) as full, Image.open(crop) as excerpt:
        assert list(full.size) == scan['sourceImageSize']
        expected = full.crop(scan['cropBox'])
        assert expected.size == excerpt.size
        assert expected.convert('RGB').tobytes() == excerpt.convert('RGB').tobytes(), 'Crop pixels differ'
print(json.dumps({'nativeImages': 3, 'allSourceHashesAndCropPixelsExact': True,
                  'notesOrLyricsRetouched': False}))
