"""Import a pinned, reusable recorded reference without changing UXLC text.

Usage: python3 scripts/import-pockettorah-reference.py --source-dir /path/to/references
Reads original release files as data. No PocketTorah application code is imported.
"""
from pathlib import Path
import argparse
import collections
import copy
import hashlib
import json
import shutil
import xml.etree.ElementTree as ET

parser = argparse.ArgumentParser()
parser.add_argument('--source-dir', type=Path, required=True)
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
expected = {
    'Bereshit-1.mp3': 'ff17c9f12cb79a0eac02889db975de73a27bba09',
    'Bereshit-1.txt': 'e347386e1b1dbed89e062617f5865b66029a6e62',
    'Genesis-2012.xml': '8feda8a879c8e95a8cfa796f303629cf8c0865ad',
}
hashes = {}
for name, blob in expected.items():
    data = (args.source_dir / name).read_bytes()
    actual = hashlib.sha1(f'blob {len(data)}\0'.encode() + data).hexdigest()
    if actual != blob:
        raise ValueError(f'Pinned source differs: {name}')
    hashes[name] = {'gitBlob': actual, 'sha1': hashlib.sha1(data).hexdigest(),
                    'sha256': hashlib.sha256(data).hexdigest(), 'bytes': len(data)}
if hashes['Bereshit-1.mp3']['sha1'] != '755c6e9918ba2021bba8b33c46db309c115620d6':
    raise ValueError('Recording differs from original Internet Archive MP3.')

xml = ET.parse(args.source_dir / 'Genesis-2012.xml').getroot()
uxlc = json.loads((root / 'data/torah/gen.json').read_text())
starts = [float(t) for t in (args.source_dir / 'Bereshit-1.txt').read_text().strip().split(',')]
if not all(0 <= a < b for a, b in zip(starts, starts[1:])):
    raise ValueError('Word start times must increase.')
words = []
for chapter in xml.findall('.//book/c'):
    c = int(chapter.attrib['n'])
    if c > 2:
        break
    for verse in chapter.findall('v'):
        v = int(verse.attrib['n'])
        if c == 2 and v > 3:
            break
        source = [w for w in verse if w.tag in ('w', 'q')]
        target = [w for w in uxlc['chapters'][c-1]['verses'][v-1]['tokens'] if w['kind'] in ('w', 'q')]
        if len(source) != len(target):
            raise ValueError(f'Word counts differ at {c}:{v}; do not guess alignment.')
        for ordinal, (w, u) in enumerate(zip(source, target), 1):
            token = (w.text or '') + ''.join((''.join(child.itertext()) if child.tag != 'x' else '') + (child.tail or '') for child in w)
            notes = [{'kind': 'sourceEditorialCode', 'code': ''.join(child.itertext())} for child in w if child.tag == 'x']
            hebrew = token.replace('/', '')
            target_text = u['sourceHebrew']
            kind = 'exact' if hebrew == target_text else 'joiner-only' if hebrew.replace('\u034f', '') == target_text.replace('\u034f', '') else 'source-difference'
            i = len(words)
            words.append({'id': u['id'], 'chapter': c, 'verse': v, 'ordinal': ordinal,
                          'sourceToken': token, 'editorialNotes': notes, 'sourceHebrew': hebrew, 'uxlcHebrew': target_text,
                          'comparison': kind, 'startSeconds': starts[i],
                          'endSeconds': starts[i+1] if i+1 < len(starts) else None})
if len(words) != len(starts) or len(words) != 469:
    raise ValueError('Opening recording and word timings must have 469 entries.')
differences = [w['id'] for w in words if w['comparison'] == 'source-difference']
if differences != ['gen-1-11-5']:
    raise ValueError(f'Unexpected edition differences; review before importing: {[(w["id"], w["sourceHebrew"], w["uxlcHebrew"]) for w in words if w["comparison"] == "source-difference"]}')

recording = {
    'format': 'tropetrain-recorded-reference-v1', 'id': 'pockettorah-bereshit-1', 'revision': 1,
    'title': 'PocketTorah · Genesis 1:1–2:3', 'creator': 'Not-a-Box Media Lab',
    'projectCredits': ['Russel Neiss', 'Rabbi Charlie Schwartz'], 'individualReader': None,
    'styleAttribution': {'label': 'Avery–Binder style', 'source': 'https://archive.org/details/PockettorahAudioFiles', 'status': 'source-described; no Kinnor equivalence or independent musical review'},
    'audioLicense': {'id': 'CC-BY-SA-3.0', 'url': 'https://creativecommons.org/licenses/by-sa/3.0/'},
    'originalTimingLicense': {'id': 'CC-BY-SA-2.5', 'url': 'https://creativecommons.org/licenses/by-sa/2.5/'},
    'alignmentLicense': {'id': 'CC-BY-SA-3.0', 'url': 'https://creativecommons.org/licenses/by-sa/3.0/'},
    'releaseAnnouncement': 'https://ejewishphilanthropy.com/torah-on-the-go/',
    'originalCommit': 'c8540eae1c5e07138aafc89afb571b71326d13dd',
    'sourceFiles': hashes, 'audioFile': './assets/references/Bereshit-1.mp3',
    'audioSource': 'https://archive.org/download/PockettorahAudioFiles/Bereshit-1.mp3',
    'originalPaths': {'audio': 'Android Phonegap Code/www/content/torah/audio/Bereshit-1.mp3', 'timings': 'Webbrowser/content/torah/labels/Bereshit-1.txt', 'text': 'Webbrowser/content/torah/xml/Genesis.xml'},
    'textEdition': 'Unicode/XML Westminster Leningrad Codex 4.14 (2010), as distributed in PocketTorah 2012',
    'transformations': ['Audio and original timing file copied without modification.', 'Morphological slash separators removed only in display Hebrew; sourceToken retains them.', 'XML editorial x elements retained as separate sourceEditorialCode notes, never inserted into Hebrew.', 'Canonical UXLC IDs paired by verified verse and word ordinal; exact strings from both editions retained.', 'Derived alignment is CC BY-SA 3.0; no pitches, phonemes or syllable boundaries inferred.'],
    'review': {'timing': 'source-provided; acoustic boundary review pending', 'alignment': 'mechanical comparison; reader review pending', 'musical': 'not independently reviewed', 'pronunciation': 'not independently reviewed', 'reviewer': None, 'date': None},
    'coverage': {'bookId': 'gen', 'start': {'chapter': 1, 'verse': 1}, 'end': {'chapter': 2, 'verse': 3}},
    'comparisonCounts': dict(collections.Counter(w['comparison'] for w in words)), 'words': words,
}
destination = root / 'data/references'
destination.mkdir(parents=True, exist_ok=True)
(destination / 'pockettorah-bereshit-1.json').write_text(json.dumps(recording, ensure_ascii=False, indent=2) + '\n')
excerpt = ET.Element('recordingSource', {'edition': recording['textEdition'], 'originalCommit': recording['originalCommit']})
for chapter in xml.findall('.//book/c'):
    c = int(chapter.attrib['n'])
    if c > 2:
        break
    target_chapter = ET.SubElement(excerpt, 'c', chapter.attrib)
    for verse in chapter.findall('v'):
        if c == 2 and int(verse.attrib['n']) > 3:
            break
        target_chapter.append(copy.deepcopy(verse))
(destination / 'pockettorah-opening-source.xml').write_bytes(ET.tostring(excerpt, encoding='utf-8', xml_declaration=True))

assets = root / 'assets/references'
assets.mkdir(parents=True, exist_ok=True)
for name in ('Bereshit-1.mp3', 'Bereshit-1.txt'):
    shutil.copyfile(args.source_dir / name, assets / name)
print(json.dumps({'words': len(words), 'comparisonCounts': recording['comparisonCounts'], 'audio': hashes['Bereshit-1.mp3']}))
