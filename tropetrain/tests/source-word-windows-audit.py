"""Independent original ZIP check; no JavaScript window-policy implementation used."""
from pathlib import Path
import gzip,json,zipfile
root=Path(__file__).resolve().parent.parent
packet=json.loads(gzip.decompress((root/'data/references/torah-library.json.gz').read_bytes()))
archive=zipfile.ZipFile(root/'data/references/torah-sources.zip');result={}
for recording in packet['recordings']:
 if recording['status']=='aligned':continue
 raw=archive.read('labels/'+recording['timingSource']['originalPath'].split('/')[-1])
 times=[float(t) for t in raw.decode().strip().split(',')]
 assert times==recording['rawStarts']
 rows=[];offset=0
 for word in recording['words']:
  assert word[3] is None and word[4] is None
  end=offset+len(word[2]);rows.append([word[0],times[offset] if offset<len(times) else None,times[end] if end<len(times) else None,offset,end if end<len(times) else None]);offset=end
 result[recording['id']]={'equalCount':offset==len(times),'windows':rows}
print(json.dumps(result))
