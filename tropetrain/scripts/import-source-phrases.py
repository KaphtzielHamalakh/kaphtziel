"""Derive source phrase ranges only from complete, unchanged marked verses."""
from pathlib import Path
import collections,gzip,hashlib,json,re,unicodedata,xml.etree.ElementTree as E,zipfile
ROOT=Path(__file__).resolve().parent.parent
ARCHIVE=ROOT/'assets/structure/oshb-torah-source.zip'
COMMIT='db6c5c9b46b8f39346f10915ddb1a70dcd429901'
NS={'o':'http://www.bibletechnologies.net/2003/OSIS/namespace'}
BOOKS=[('gen','Gen'),('exo','Exod'),('lev','Lev'),('num','Num'),('deu','Deut')]
def compact(value):return json.dumps(value,ensure_ascii=False,separators=(',',':')).encode()
def digest(raw):return hashlib.sha256(raw).hexdigest()
def local(e):return e.tag.rsplit('}',1)[-1]
def preferred_words(verse):
 out=[]
 def visit(children):
  for e in children:
   if local(e)=='w'and e.get('type')!='x-ketiv':out.append({'id':e.get('id'),'text':''.join(e.itertext()).replace('/',''),'n':e.get('n')})
   elif local(e)=='note'and e.get('type')=='variant':
    q=e.find('o:rdg[@type="x-qere"]',NS)
    if q is not None:visit(q)
   elif local(e)=='seg'and out:
    text=''.join(e.itertext())
    if e.get('type')in ['x-maqqef','x-sof-pasuq']:out[-1]['text']+=text
    elif text=='׀':out[-1]['text']+=' ׀'
 visit(verse);return out
def reader_verses(book):
 return [(f'{book["id"]}-{c["number"]}-{v["number"]}',[[w['id'],w['sourceHebrew']]for w in v['tokens']if w['kind']in ['w','q']and re.search('[א-ת]',w['sourceHebrew'])])for c in book['chapters']for v in c['verses']]
def valid_paths(rows,count):
 if not rows or rows[-1][0]!=count-1 or rows[-1][1]!='0':return False
 if any(not re.fullmatch(r'[0-3](?:\.[0-3]){0,7}',p)or not re.fullmatch('[0-9]{2}[A-Za-z0-9]{3}',sid or '')for _,p,sid in rows):return False
 if len({p for _,p,_ in rows})!=len(rows):return False
 if any(a[0]>=b[0]for a,b in zip(rows,rows[1:])):return False
 prefixes={'.'.join(p.split('.')[:i])for _,p,_ in rows for i in range(1,len(p.split('.'))+1)}
 for prefix in prefixes:
  ix=[i for i,(_,p,_)in enumerate(rows)if p==prefix or p.startswith(prefix+'.')]
  if ix!=list(range(ix[0],ix[-1]+1)):return False
  exact=[i for i,(_,p,_)in enumerate(rows)if p==prefix]
  if exact and exact[0]!=ix[-1]:return False
 return True
counts=collections.Counter();reasons=collections.Counter();examples=[];withheld=[];structure_gaps=[];records={};fingerprints={};source_files=[]
with zipfile.ZipFile(ARCHIVE)as z:
 assert set(z.namelist())=={'Gen.xml','Exod.xml','Lev.xml','Num.xml','Deut.xml','LICENSE.md','readme.md','source-pins.json'}
 pin=json.loads(z.read('source-pins.json'));assert pin['commit']==COMMIT and pin['license']=='CC-BY-4.0'
 assert b'Creative Commons Attribution 4.0' in z.read('LICENSE.md')
 for bookid,osis in BOOKS:
  raw=z.read(osis+'.xml');p=next(p for p in pin['files']if p['name']==osis+'.xml');assert len(raw)==p['bytes']and digest(raw)==p['sha256'];assert hashlib.sha1(b'blob '+str(len(raw)).encode()+b'\0'+raw).hexdigest()==p['gitBlob'];source_files.append(p)
  source={v.get('osisID'):preferred_words(v)for v in E.fromstring(raw).findall('.//o:verse',NS)}
  book=json.loads((ROOT/'data/torah'/f'{bookid}.json').read_text());verses=reader_verses(book);fingerprints[bookid]=digest(compact(verses))
  for key,target in verses:
   _,chapter,verse=key.split('-');ref=f'{osis}.{chapter}.{verse}';sw=source.get(ref,[]);count=len(target);counts['verses']+=1;counts['words']+=count
   rows=[[i,w['n'],w['id']]for i,w in enumerate(sw)if w['n']is not None]
   if not sw:status=3
   elif len(sw)!=count:status=2
   elif any(unicodedata.normalize('NFD',w['text'])!=unicodedata.normalize('NFD',t[1])for w,t in zip(sw,target)):status=1
   elif not valid_paths(rows,count):status=4
   else:status=0
   if status==0:
    records[key]=[0,count,rows];counts['availableVerses']+=1;counts['availableWords']+=count;counts['sourcePhraseLeaves']+=len(rows)
   else:
    records[key]=[status,count,len(sw)];withheld.append({'verse':key,'reasonCode':status});
    if status==4:structure_gaps.append({'verse':key,'sourceEndpoints':rows})
    counts['withheldVerses']+=1;counts['withheldWords']+=count;reasons[str(status)]+=1
    if len(examples)<20:examples.append({'verse':key,'status':status,'sourceVerse':ref,'readerWords':count,'sourceWords':len(sw),'firstDifferences':[{'ordinal':i+1,'readerWordId':t[0],'readerHebrew':t[1],'sourceWordId':w['id'],'sourceHebrew':w['text']}for i,(w,t)in enumerate(zip(sw,target))if unicodedata.normalize('NFD',w['text'])!=unicodedata.normalize('NFD',t[1])][:3]})
assert counts['verses']==5853 and counts['words']==79985
source={'id':'oshb-cantillation-structure','commit':COMMIT,'url':'https://github.com/openscriptures/morphhb/tree/'+COMMIT,'license':'CC-BY-4.0','attribution':'Original work of the Open Scriptures Hebrew Bible available at https://github.com/openscriptures/morphhb','edition':'Westminster Leningrad Codex4.20; edited n attributes','musicalRealization':None,'pronunciation':None,'review':None}
packet={'schema':'tropetrain-source-phrases-v1','revision':1,'source':source,'readerFingerprints':fingerprints,'records':records}
(ROOT/'source-phrase-summary.js').write_text('// Generated from pinned, licensed OSHB source; do not edit by hand.\nexport const SOURCE_PHRASE_DATA=Object.freeze('+json.dumps({'sourceCommit':COMMIT,'packetJsonSha256':digest(compact(packet)),'counts':dict(counts)},separators=(',',':'))+');\n')
out=ROOT/'data/structure/torah-phrases.json.gz';out.parent.mkdir(exist_ok=True);out.write_bytes(gzip.compress(compact(packet),compresslevel=9,mtime=0))
audit={'schema':'tropetrain-source-phrases-audit-v1','revision':1,'source':source,'inputArchive':{'path':'assets/structure/oshb-torah-source.zip','bytes':ARCHIVE.stat().st_size,'sha256':digest(ARCHIVE.read_bytes()),'distribution':'Build-time original XML archive; the portable app embeds the derived packet and attribution. Original XML is available through an explicit online source link.'},'sourceFiles':source_files,'readerFingerprints':fingerprints,'counts':dict(counts),'withheldReasons':dict(reasons),'reasonCodes':{'0':'complete-marked-verse-correspondence','1':'different-marked-text','2':'different-word-count','3':'missing-source-verse','4':'invalid-or-incomplete-source-structure'},'examples':examples,'withheldVerses':withheld,'sourceStructureGaps':structure_gaps,'packet':{'path':str(out.relative_to(ROOT)),'bytes':out.stat().st_size,'sha256':digest(out.read_bytes())},'comparison':'Preferred w/q reading only, with source morphology separators removed and explicit XML maqaf/sof pasuq/paseq attached to their word. NFD is used only for comparison; no source or reader string is overwritten. Every word in the complete verse must match all letters, vowels, marks and punctuation. One different mark withholds the complete verse. No inferred replacement tree.','limits':'Source-edited phrase hierarchy, not a musical/pitch realization, pronunciation rule, sung timing or reviewed cantorial grammar. New selection code adapts source paths; independent cantorial review pending.'}
(ROOT/'docs/SOURCE-PHRASES.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'sourcePhraseCorrespondence':dict(counts),'withheldReasons':dict(reasons),'packetBytes':out.stat().st_size}),flush=True)
