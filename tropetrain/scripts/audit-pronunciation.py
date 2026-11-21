"""Independent lossless-data audit; deliberately does not reuse the join code."""
from pathlib import Path
import collections,gzip,hashlib,json,re,zipfile
root=Path(__file__).resolve().parents[1]
audit=json.loads((root/'docs/PRONUNCIATION-ALIGNMENT.json').read_text())
source=json.loads((root/'docs/PRONUNCIATION-SOURCES.json').read_text())
packed=(root/'data/pronunciation/torah-display.json.gz').read_bytes()
data=json.loads(gzip.decompress(packed))
assert data['sourceCommit']==audit['sourceCommit']==source['commit']=='6f0612ed2109d32e288d7c0ca41ae3dbfaad702b'
assert hashlib.sha256(packed).hexdigest()==audit['packetSha256']
raw_rows={};readers={};orders={};source_bytes=0
with zipfile.ZipFile(root/'assets/pronunciation/phonetic-mam-torah-sources.zip') as z:
 assert len(z.namelist())==7
 for spec in audit['sourceFiles']:
  f=next(x for x in source['files'] if x['path'].endswith('/'+spec['filename']))
  raw=z.read(spec['filename']);source_bytes+=len(raw)
  for s in [spec,f]:
   assert len(raw)==s['bytes']
   assert hashlib.sha256(raw).hexdigest()==s['sha256']
   assert hashlib.sha1(f'blob {len(raw)}\0'.encode()+raw).hexdigest()==s['gitBlob']
  for c in json.loads(raw)['chapters']:
   for v in c['verses']:
    for n,r in enumerate(v['rows'],1):raw_rows[(spec['bookId'],c['number'],v['number'],n)]=r
for b in audit['books']:
 raw=(root/f"data/torah/{b['bookId']}.json").read_bytes()
 assert hashlib.sha256(raw).hexdigest()==b['readerSha256']
 tokens=[t for c in json.loads(raw)['chapters'] for v in c['verses'] for t in v['tokens'] if t['kind']!='k' and re.search('[א-ת]',t['sourceHebrew'])]
 assert len(tokens)==b['readerWords']
 readers.update((t['id'],t['sourceHebrew']) for t in tokens)
 orders.update((t['id'],n) for n,t in enumerate(tokens))
seen=set();seen_rows=set();last={};styles=collections.Counter();alternates=0;groups=0
for g in data['groups']:
 assert len(g['readerIds'])==len(g['readerHebrew'])>0
 nums=[orders[rid] for rid in g['readerIds']]
 assert nums==list(range(nums[0],nums[-1]+1))
 assert nums[0]>last.get(g['bookId'],-1)
 last[g['bookId']]=nums[-1]
 for rid,hebrew in zip(g['readerIds'],g['readerHebrew']):
  assert rid not in seen and readers[rid]==hebrew;seen.add(rid)
 for r in g['rows']:
  key=(g['bookId'],g['displayChapter'],g['displayVerse'],r['number'])
  assert key not in seen_rows;seen_rows.add(key)
  assert {k:v for k,v in r.items() if k!='number'}==raw_rows[key],key
  for style,cells in r['transcriptions'].items():
   styles[style]+=1
   alternates+=sum(cell is not None and len(cells)>1 for cell in cells)
 if len(g['readerIds'])>1:groups+=1
assert len(seen)==audit['mappedWords']==77756
assert len(readers)==79985
for b in audit['books']:
 assert set(b['unmappedReaderIds'])=={rid for rid in readers if rid.startswith(b['bookId']+'-') and rid not in seen}
print(json.dumps({'sourceBytes':source_bytes,'exactOriginalRows':len(seen_rows),'mappedWords':len(seen),'unassignedWords':len(readers)-len(seen),'manyWordGroups':groups,'styles':styles}))
