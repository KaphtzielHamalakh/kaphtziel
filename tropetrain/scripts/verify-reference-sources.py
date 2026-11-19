"""Independent, offline verification of the generated reference data against originals."""
from pathlib import Path
import collections,gzip,hashlib,io,json,re,zipfile,xml.etree.ElementTree as ET
root=Path(__file__).resolve().parents[1];data=json.loads(gzip.decompress((root/'data/references/torah-library.json.gz').read_bytes()));archive=zipfile.ZipFile(root/'data/references/torah-sources.zip');manifest=json.loads(archive.read('SOURCE-MANIFEST.json'));letters=lambda t:re.sub('[^א-ת]','',t)
def content(node):return (node.text or '')+''.join((content(c) if c.tag!='x' else '')+(c.tail or '') for c in node)
for filename,source in manifest['files'].items():
 raw=archive.read(filename);assert hashlib.sha1(f'blob {len(raw)}\0'.encode()+raw).hexdigest()==source['gitBlob'];assert hashlib.sha256(raw).hexdigest()==source['sha256']
assert manifest['originalCommit']=='c8540eae1c5e07138aafc89afb571b71326d13dd'
source_words={};source_order={};reader={};reader_order={}
for bid,name in [('gen','Genesis'),('exo','Exodus'),('lev','Leviticus'),('num','Numbers'),('deu','Deuteronomy')]:
 xml=ET.fromstring(archive.read(name+'-2012.xml'));source_order[bid]=[];reader_order[bid]=[]
 for c in xml.findall('.//book/c'):
  if 'n' not in c.attrib:continue
  for v in c.findall('v'):
   for ordinal,w in enumerate([w for w in v if w.tag=='w'],1):
    key=(bid,int(c.attrib['n']),int(v.attrib['n']),ordinal);source_order[bid].append(key);source_words[key]={'token':content(w),'notes':[content(x) for x in w if x.tag=='x']}
 book=json.loads((root/f'data/torah/{bid}.json').read_text())
 for c in book['chapters']:
  for v in c['verses']:
   for w in v['tokens']:
    if w['kind']!='k' and letters(w['sourceHebrew']):reader[w['id']]=w['sourceHebrew'];reader_order[bid].append(w['id'])
seen_sources=collections.defaultdict(list);seen_reader=collections.defaultdict(list);issues=[]
for recording in data['recordings']:
 bid=recording['bookId'];flat=[];times=[float(t) for t in archive.read('labels/'+recording['timingSource']['originalPath'].split('/')[-1]).decode().strip().split(',')];offset=0
 for row in recording['words']:
  rid,uxlc,parts,start,end,ordinal=row;assert reader[rid]==uxlc;seen_reader[bid].append(rid);source_text=[]
  for part in parts:
   token,cn,vn,wn=part[:4];notes=part[4] if len(part)>4 else [];key=(bid,cn,vn,wn);assert source_words[key]['token']==token;assert source_words[key]['notes']==notes;seen_sources[bid].append(key);source_text.append(token.replace('/',''))
  assert letters(''.join(source_text))==letters(uxlc)
  if recording['status']=='aligned':assert start==times[offset];assert end==(times[offset+len(parts)] if offset+len(parts)<len(times) else None)
  else:assert start is None and end is None
  offset+=len(parts)
 actual_errors=len(times)!=offset or any(not(0<=a<b) for a,b in zip(times,times[1:]))
 assert actual_errors==(recording['status']=='timing-review')
 if actual_errors:issues.append(recording['title'])
for bid in source_order:assert seen_sources[bid]==source_order[bid];assert seen_reader[bid]==reader_order[bid]
assert sum(map(len,seen_sources.values()))==79986;assert sum(map(len,seen_reader.values()))==79985;assert len(issues)==8
print(json.dumps({'originalFiles':len(manifest['files']),'sourceWords':79986,'readerWords':79985,'recordings':len(data['recordings']),'timingReview':issues}))
