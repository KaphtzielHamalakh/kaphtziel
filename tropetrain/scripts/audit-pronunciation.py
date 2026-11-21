"""Independent lossless-data audit; deliberately does not reuse the join code."""
from pathlib import Path
import collections,gzip,hashlib,itertools,json,re,zipfile
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
windows={b['id']:b for b in audit['partialWindows']}
def flatten(nodes):return ''.join(n if isinstance(n,str) else flatten(n.get('content',[])) for n in nodes)
def letters(text):return re.sub('[^א-ת]','',text)
def reading_forms(text):
 value=letters(text);forms={value}
 if value.endswith('יהוה'):forms.update(value[:-4]+name for name in ['אדני','אלהים'])
 if value.endswith('הוא'):
  hpos=[i for i,ch in enumerate(text) if 'א'<=ch<='ת'][-3:]
  if '\u05b4' in text[hpos[0]:hpos[1]]:forms.add(value[:-3]+'היא')
 if 'יששכר' in value:forms.add(value.replace('יששכר','ישכר'))
 return forms
def comparison_key(text):
 value=letters(text)
 name=re.fullmatch('([ובכלמשה]{0,3})(יהוה|אדני|אלהים)',value)
 if name:return name[1]+'@'
 value=value.replace('יששכר','ישכר')
 return value[:-3]+'היא' if value.endswith('הוא') else value
def exact_readings(rows,hebrew):
 supplied=[{letters(flatten(cell)) for cell in r['hebrew'] if cell is not None} for r in rows]
 allowed=[reading_forms(w) for w in hebrew]
 assert max(__import__('math').prod(map(len,supplied)),__import__('math').prod(map(len,allowed)))<=64
 return {''.join(p) for p in itertools.product(*supplied)}<={''.join(p) for p in itertools.product(*allowed)}
# Enumerate candidates without production row/word span caps. Prove those caps
# omit no indivisible exact candidate in the actual audited source windows.
total_candidates=0;max_source_span=0;max_reader_span=0
for window in windows.values():
 if window['status']!='exact-forced-groups-only':continue
 before=(window['before']['displayChapter'],window['before']['displayVerse']);after=(window['after']['displayChapter'],window['after']['displayVerse'])
 source=[]
 for (bid,c,v,rn),row in raw_rows.items():
  if bid!=window['bookId'] or not before<(c,v)<after:continue
  texts=[flatten(cell) for cell in row['hebrew'] if cell is not None]
  if not texts or all(t in ['', 'פפ','פפפ','סס','ססס','׀'] for t in texts):continue
  keys=[''.join(comparison_key(part) for part in re.split('[־\\s]+',t) if letters(part)) for t in texts]
  source.append(((c,v),row,keys[0] if len(set(keys))==1 else None))
 assert len(source)==window['sourceRows']
 target=[readers[rid] for rid in window['readerIds']];target_keys=[comparison_key(t) for t in target]
 possible=collections.defaultdict(list)
 for start in range(len(target)):
  ends=list(itertools.accumulate(map(len,target_keys[start:])));key=''
  for end in range(start+1,len(target)+1):
   key+=target_keys[end-1];possible[key].append((start,end,set(ends[:end-start-1])))
 edges=[]
 for start,entry in enumerate(source):
  key='';interior=set()
  for end in range(start+1,len(source)+1):
   last_entry=source[end-1]
   if last_entry[0]!=entry[0] or last_entry[2] is None:break
   if end>start+1:interior.add(len(key))
   key+=last_entry[2]
   for a,b,target_interior in possible.get(key,[]):
    if interior&target_interior:continue
    if not exact_readings([e[1] for e in source[start:end]],target[a:b]):continue
    max_source_span=max(max_source_span,end-start);max_reader_span=max(max_reader_span,b-a)
    assert end-start<=4 and b-a<=8
    edges.append((start,a,end,b,len(key)))
 assert len(edges)==window['candidateEdges'],window['id']
 assert hashlib.sha256(json.dumps(sorted(edges),separators=(',',':')).encode()).hexdigest()==window['candidateSha256'],window['id']
 total_candidates+=len(edges)
for g in data['groups']:
 assert len(g['readerIds'])==len(g['readerHebrew'])>0
 nums=[orders[rid] for rid in g['readerIds']]
 assert nums==list(range(nums[0],nums[-1]+1))
 assert nums[0]>last.get(g['bookId'],-1)
 last[g['bookId']]=nums[-1]
 if g['match']=='forced-between-verse-anchors':
  window=windows[g['matchWindow']['id']]
  assert g['bookId']==window['bookId']
  assert orders[window['before']['readerEnd']]<nums[0]<=nums[-1]<orders[window['after']['readerStart']]
  assert (window['before']['displayChapter'],window['before']['displayVerse'])<(g['displayChapter'],g['displayVerse'])<(window['after']['displayChapter'],window['after']['displayVerse'])
  assert set(g['readerIds'])<=set(window['readerIds'])
 # Independently verify every literal Hebrew reading, without join-code imports.
 allowed={''.join(parts) for parts in itertools.product(*(reading_forms(w) for w in g['readerHebrew']))}
 supplied={''.join(parts) for parts in itertools.product(*({letters(flatten(cell)) for cell in r['hebrew'] if cell is not None} for r in g['rows']))}
 assert supplied<=allowed,g['id']
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
assert len(seen)==audit['mappedWords']==79806
assert len(readers)==79985
for b in audit['books']:
 assert set(b['unmappedReaderIds'])=={rid for rid in readers if rid.startswith(b['bookId']+'-') and rid not in seen}
print(json.dumps({'sourceBytes':source_bytes,'exactOriginalRows':len(seen_rows),'mappedWords':len(seen),'unassignedWords':len(readers)-len(seen),'manyWordGroups':groups,'allCandidateEdges':total_candidates,'maxExactSourceRows':max_source_span,'maxExactReaderWords':max_reader_span,'styles':styles}))
