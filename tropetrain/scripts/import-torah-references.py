"""Build the complete, source-preserving PocketTorah reference library.

No executable/source application code is copied. All source files must match the
pinned original tree. Usage: --source-dir /path/to/pockettorah research inputs.
"""
from pathlib import Path
import argparse,collections,gzip,hashlib,io,json,re,zipfile
import xml.etree.ElementTree as ET

BOOKS=[('gen','Genesis'),('exo','Exodus'),('lev','Leviticus'),('num','Numbers'),('deu','Deuteronomy')]
COMMIT='c8540eae1c5e07138aafc89afb571b71326d13dd'
LETTERS=re.compile('[^א-ת]')
def letters(text):return LETTERS.sub('',text)
def text_of(node):return (node.text or '')+''.join((text_of(c) if c.tag!='x' else '')+(c.tail or '') for c in node)
def source_part(node,bid,chapter,verse,ordinal):
 token=text_of(node)
 return {'id':f'wlc-2012-{bid}-{chapter}-{verse}-{ordinal}','chapter':chapter,'verse':verse,'ordinal':ordinal,'sourceToken':token,'sourceHebrew':token.replace('/',''),'editorialNotes':[{'kind':'sourceEditorialCode','code':text_of(c)} for c in node if c.tag=='x']}
def build(source,root):
 tree={x['path']:x for x in json.loads((source/'tree-2012.json').read_text())['tree']};used={};sources={}
 def pinned(local,path):
  data=(source/local).read_bytes();blob=hashlib.sha1(f'blob {len(data)}\0'.encode()+data).hexdigest()
  if blob!=tree[path]['sha']:raise ValueError('Original source hash differs: '+path)
  sources[local]=data;used[local]={'originalPath':path,'gitBlob':blob,'sha256':hashlib.sha256(data).hexdigest(),'bytes':len(data)};return data
 divisions=ET.fromstring(pinned('aliyah-2012.xml','Webbrowser/content/aliyah.xml'))
 archive=json.loads((source/'archive-audio-metadata.json').read_text());metadata=archive['metadata']
 if metadata.get('licenseurl')!='http://creativecommons.org/licenses/by-sa/3.0/':raise ValueError('Audio collection license needs review.')
 audio={f['name']:f for f in archive['files'] if f.get('source')=='original' and f['name'].endswith('.mp3')}
 books={};summary=collections.Counter();renumbered=[];merged=[]
 for bid,name in BOOKS:
  xml=ET.fromstring(pinned(name+'-2012.xml','Webbrowser/content/torah/xml/'+name+'.xml'));target=json.loads((root/f'data/torah/{bid}.json').read_text());units=[];source_words=[]
  for chapter in xml.findall('.//book/c'):
   if 'n' not in chapter.attrib:continue # Non-biblical, unnumbered colophon container.
   cn=int(chapter.attrib['n']);old=[];new=[];offset=0
   for verse in chapter.findall('v'):
    vn=int(verse.attrib['n']);ordinal=0;written=[]
    for word in verse:
     if word.tag=='k':written.append(text_of(word));continue
     if word.tag!='w':continue
     ordinal+=1;part=source_part(word,bid,cn,vn,ordinal);part['writtenVariants']=written;written=[]
     part['letterStart']=offset;offset+=len(letters(part['sourceHebrew']));part['letterEnd']=offset;old.append(part)
   offset=0
   for verse in target['chapters'][cn-1]['verses']:
    ordinal=0
    for word in verse['tokens']:
     if word['kind']=='k' or not letters(word['sourceHebrew']):continue
     ordinal+=1;new.append({**word,'chapter':cn,'verse':verse['number'],'ordinal':ordinal,'letterStart':offset,'letterEnd':offset+len(letters(word['sourceHebrew']))});offset=new[-1]['letterEnd']
   if ''.join(letters(w['sourceHebrew']) for w in old)!=''.join(letters(w['sourceHebrew']) for w in new):raise ValueError(f'Consonantal chapter sequence differs: {name} {cn}')
   position=0
   for word in new:
    parts=[]
    while position<len(old) and old[position]['letterStart']<word['letterEnd']:parts.append(old[position]);position+=1
    if not parts or parts[0]['letterStart']!=word['letterStart'] or parts[-1]['letterEnd']!=word['letterEnd']:raise ValueError('Crossing source word boundaries; review required.')
    for part in parts:part.pop('letterStart');part.pop('letterEnd')
    recorded=' '.join(p['sourceHebrew'] for p in parts);uxlc=word['sourceHebrew']
    comparison='source-boundaries' if len(parts)>1 else 'exact' if recorded==uxlc else 'joiner-only' if recorded.replace('\u034f','')==uxlc.replace('\u034f','') else 'source-difference'
    first=parts[0];unit={'id':word['id'],'sourceWords':parts,'sourceToken':parts[0]['sourceToken'] if len(parts)==1 else None,'sourceHebrew':recorded,'uxlcHebrew':uxlc,'comparison':comparison,'chapter':first['chapter'],'verse':first['verse'],'ordinal':first['ordinal'],'readerChapter':word['chapter'],'readerVerse':word['verse'],'readerOrdinal':word['ordinal']}
    units.append(unit);summary[comparison]+=1
    if (first['chapter'],first['verse'])!=(word['chapter'],word['verse']):renumbered.append(word['id'])
    if len(parts)>1:merged.append({'readerId':word['id'],'sourceIds':[p['id'] for p in parts]})
   if position!=len(old):raise ValueError('Unused source words.')
   source_words+=old
  books[name]={'id':bid,'units':units,'sourceWords':source_words}
 parts=[];records=[];unsupported_divisions=[]
 for part in divisions:
  name=part.attrib['id'];book=books[part.attrib['verse'].split()[0]];sections=[s for s in part.findall('fullkriyah/aliyah') if s.attrib['num']!='M']
  # Doubled-portion divisions are retained as source data, not invented recordings.
  if any('Webbrowser/content/torah/labels/'+name+'-'+s.attrib['num']+'.txt' not in tree for s in sections):unsupported_divisions.append({'name':name,'sourceVerse':part.attrib['verse'],'reason':'No dedicated recorded files or timings in original source.'});continue
  part_id=f'pt-portion-{len(parts)+1:02d}';parts.append({'id':part_id,'name':name,'hebrewName':part.attrib['hebrew'],'bookId':book['id'],'recordingIds':[]})
  for section in sections:
   num=int(section.attrib['num']);rid=f'{part_id}-{num}';base=name+'-'+str(num);local='labels/'+base+'.txt';raw=pinned(local,'Webbrowser/content/torah/labels/'+base+'.txt');starts=[float(t) for t in raw.decode().strip().split(',')]
   begin=tuple(map(int,section.attrib['begin'].split(':')));end=tuple(map(int,section.attrib['end'].split(':')))
   source_words=[w for w in book['sourceWords'] if begin<=(w['chapter'],w['verse'])<=end];source_ids={w['id']:i for i,w in enumerate(source_words)}
   selected=[]
   for unit in book['units']:
    hits=[p['id'] in source_ids for p in unit['sourceWords']]
    if any(hits) and not all(hits):raise ValueError('Recording cuts across source word group.')
    if all(hits):selected.append(unit)
   issues=[]
   if len(starts)!=len(source_words):issues.append({'kind':'word-count','sourceWords':len(source_words),'timings':len(starts)})
   for i,(a,b) in enumerate(zip(starts,starts[1:])):
    if not (0<=a<b):issues.append({'kind':'non-increasing','sourceIndex':i,'before':a,'after':b})
   aname=base.replace(' ','').replace('’','')+'.mp3'
   if aname not in audio:raise ValueError('Missing original recording '+aname)
   af=audio[aname];rows=[]
   for ui,unit in enumerate(selected):
    row={**unit,'recordingId':rid,'referenceIndex':ui};first=source_ids[unit['sourceWords'][0]['id']];after=source_ids[unit['sourceWords'][-1]['id']]+1
    row['startSeconds']=starts[first] if not issues else None;row['endSeconds']=(starts[after] if after<len(starts) else None) if not issues else None;rows.append(row)
   first,last=selected[0],selected[-1]
   record={'format':'tropetrain-recorded-reference-v1','id':rid,'revision':1,'partId':part_id,'number':num,'title':f'{name} · aliyah {num}','bookId':book['id'],'status':'timing-review' if issues else 'aligned','issues':issues,'sourceCoverage':{'start':list(begin),'end':list(end)},'coverage':{'bookId':book['id'],'start':{'chapter':first['readerChapter'],'verse':first['readerVerse']},'end':{'chapter':last['readerChapter'],'verse':last['readerVerse']}},'words':rows,'rawStarts':starts,'sourceWordCount':len(source_words),'audio':{'url':'https://archive.org/download/PockettorahAudioFiles/'+aname,'filename':aname,'sha1':af['sha1'],'bytes':int(af['size']),'source':'original','durationLabel':af.get('length'),'localFile':'./assets/references/Bereshit-1.mp3' if len(records)==0 else None},'timingSource':used[local]}
   records.append(record);parts[-1]['recordingIds'].append(rid)
 all_ids=[w['id'] for r in records for w in r['words']]
 if len(all_ids)!=79985 or len(set(all_ids))!=79985:raise ValueError('Full Torah reference coverage is not exact.')
 audit={'readerWords':len(all_ids),'sourceWords':sum(r['sourceWordCount'] for r in records),'portions':len(parts),'recordings':len(records),'alignedRecordings':sum(r['status']=='aligned' for r in records),'timingReviewRecordings':[{'id':r['id'],'title':r['title'],'issues':r['issues']} for r in records if r['issues']],'comparisonCounts':dict(summary),'verseRenumberedWords':len(renumbered),'renumberedExamples':renumbered[:8],'sourceBoundaryGroups':merged,'limits':'Text/metadata correspondence, not acoustic or musical review. Unreliable timing records are not used for word alignment.'}
 library={'format':'tropetrain-reference-library-v1','revision':1,'source':'PocketTorah Audio Files','creator':'Not-a-Box Media Lab','projectCredits':['Russel Neiss','Rabbi Charlie Schwartz'],'individualReader':None,'sourceUrl':'https://archive.org/details/PockettorahAudioFiles','sourceDescription':metadata['description'],'audioLicense':'https://creativecommons.org/licenses/by-sa/3.0/','timingLicense':'https://creativecommons.org/licenses/by-sa/2.5/','alignmentLicense':'https://creativecommons.org/licenses/by-sa/3.0/','originalCommit':COMMIT,'textEdition':'PocketTorah WLC 4.14 (2010) / UXLC 2.6 (27.7)','sourceFiles':used,'parts':parts,'recordings':records,'audit':audit,'unrecordedDivisions':unsupported_divisions}
 dest=root/'data/references';dest.mkdir(exist_ok=True)
 # Compact columns remove repeated derived strings; exact raw tokens remain.
 packed_library={**library,'format':'tropetrain-reference-library-packed-v1','recordings':[]}
 for record in records:
  compact={**record,'words':[[w['id'],w['uxlcHebrew'],[[p['sourceToken'],p['chapter'],p['verse'],p['ordinal']]+([[n['code'] for n in p['editorialNotes']],p['writtenVariants']] if p['editorialNotes'] or p['writtenVariants'] else []) for p in w['sourceWords']],w['startSeconds'],w['endSeconds'],w['readerOrdinal']] for w in record['words']]}
  if record['status']=='aligned' and not any(len(w['sourceWords'])>1 for w in record['words']):compact.pop('rawStarts')
  packed_library['recordings'].append(compact)
 payload=json.dumps(packed_library,ensure_ascii=False,separators=(',',':')).encode();packed=gzip.compress(payload,compresslevel=9,mtime=0);(dest/'torah-library.json.gz').write_bytes(packed)
 buffer=io.BytesIO()
 with zipfile.ZipFile(buffer,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=9) as z:
  for name,data in sorted(sources.items()):
   entry=zipfile.ZipInfo(name,date_time=(1980,1,1,0,0,0));entry.compress_type=zipfile.ZIP_DEFLATED;z.writestr(entry,data)
  entry=zipfile.ZipInfo('SOURCE-MANIFEST.json',date_time=(1980,1,1,0,0,0));entry.compress_type=zipfile.ZIP_DEFLATED;z.writestr(entry,json.dumps({'originalCommit':COMMIT,'files':used},indent=2).encode())
 (dest/'torah-sources.zip').write_bytes(buffer.getvalue());(root/'docs/TORAH-REFERENCE-AUDIT.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2)+'\n')
 print(json.dumps({**{k:v for k,v in audit.items() if k not in ['timingReviewRecordings','comparisonCounts','sourceBoundaryGroups']},'rawBytes':len(payload),'gzipBytes':len(packed),'sourcePackBytes':len(buffer.getvalue())},ensure_ascii=False))
 return library
if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--source-dir',type=Path,required=True);args=parser.parse_args();build(args.source_dir,Path(__file__).resolve().parents[1])
