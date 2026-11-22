"""Extract only the unchanged Hebrew verse MP3s from the pinned 2018 resource.

Usage: python3 scripts/extract-fellman-rh.py SOURCE.pdf OUTPUT_DIRECTORY
Requires pypdf and macOS afinfo. Never executes PDF actions or embedded Flash.
The modern score, English recordings and scanned Hebrew are not imported.
"""
from pathlib import Path
import hashlib, json, re, subprocess, sys
from pypdf import PdfReader

PDF_SHA256 = '18488d9dbbe4e2e2bb096338d46a4140a8c626bf60bf6e01b523c8845d3bec78'

def extract(pdf, output):
    assert hashlib.sha256(pdf.read_bytes()).hexdigest() == PDF_SHA256, 'Different PDF edition'
    records = []
    for page_number, page in enumerate(PdfReader(pdf).pages, 1):
        for annotation_index, reference in enumerate(page.get('/Annots', [])):
            annotation = reference.get_object()
            if annotation.get('/Subtype') != '/RichMedia':
                continue
            names = annotation['/RichMediaContent'].get_object()['/Assets'].get_object()['/Names']
            for name, specification in zip(names[::2], names[1::2]):
                match = re.fullmatch(r'RH(1|2|12)-(\d\d)-(\d\d)H(e?)\.mp3', str(name))
                if not match:
                    continue
                day, chapter, verse, ending = match.groups()
                chapter, verse = int(chapter), int(verse)
                assert (day, chapter) in [('1',21), ('2',22), ('12',29)]
                raw = specification.get_object()['/EF'].get_object()['/F'].get_object().get_data()
                records.append(dict(file=str(name), page=page_number, annotation=annotation_index,
                    rect=[float(n) for n in annotation['/Rect']], sourceDay=day,
                    chapter=chapter, verse=verse, sourceEndingSuffix=bool(ending), bytes=len(raw),
                    sha1=hashlib.sha1(raw).hexdigest(), sha256=hashlib.sha256(raw).hexdigest(), raw=raw))
    assert len(records) == len({r['file'] for r in records}) == 64
    assert {(r['chapter'], r['verse']) for r in records} == {(c,v) for c,n in [(21,34),(22,24),(29,6)] for v in range(1,n+1)}
    assert sum(r['bytes'] for r in records) == 20102828
    output.mkdir(parents=True, exist_ok=True)
    for record in records:
        target = output / record['file']
        raw = record.pop('raw')
        if target.exists():
            assert target.read_bytes() == raw, 'Existing file differs: '+str(target)
        else:
            target.write_bytes(raw)
        information = subprocess.run(['/usr/bin/afinfo', str(target)], capture_output=True, text=True, check=True).stdout
        record['estimatedDurationSeconds'] = float(re.search(r'estimated duration:\s*([\d.]+)', information)[1])
        record['durationMethod'] = 'macOS afinfo estimated duration of unchanged original MP3'
    return sorted(records, key=lambda r:(r['chapter'],r['verse']))

if __name__ == '__main__':
    records = extract(Path(sys.argv[1]), Path(sys.argv[2]))
    print(json.dumps(records, ensure_ascii=False, indent=2))
