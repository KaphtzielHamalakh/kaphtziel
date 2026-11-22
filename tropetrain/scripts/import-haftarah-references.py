"""Original importer for pinned, unchanged PocketTorah Haftarah source data.

Source content is CC BY-SA; see HAFTARAH-REFERENCE-AUDIT.json. No code from
PocketTorah is executed or copied. Never estimate missing word boundaries.
"""
from pathlib import Path
import argparse,collections,gzip,hashlib,io,json,math,re,tempfile,zipfile
import xml.etree.ElementTree as ET
ROOT=Path(__file__).resolve().parents[1]
COMMIT='c8540eae1c5e07138aafc89afb571b71326d13dd'
BOOKS={'Joshua':'jos','Judges':'jdg','Samuel_1':'sam1','Samuel_2':'sam2','Kings_1':'kgs1','Kings_2':'kgs2','Isaiah':'isa','Jeremiah':'jer','Ezekiel':'ezk','Hosea':'hos','Joel':'jol','Amos':'amo','Obadiah':'oba','Micah':'mic','Zechariah':'zec','Malachi':'mal'}
letters=lambda value:re.sub('[^א-ת]','',value)
def sha(raw):return hashlib.sha256(raw).hexdigest()
def text_of(node):return (node.text or '')+''.join((text_of(c) if c.tag!='x' else '')+(c.tail or '') for c in node)
def sections(value):
 name,body=value.split(' ',1);out=[]
 for segment in body.split(';'):
  a,b=segment.strip().split(' - ');start=list(map(int,a.split(':')));end=list(map(int,b.split(':')))
  assert len(start)==len(end)==2 and start<=end,value
  out.append({'bookId':BOOKS[name],'start':{'chapter':start[0],'verse':start[1]},'end':{'chapter':end[0],'verse':end[1]}})
 return name,out
def build(source,root):
 lock=json.loads((source/'source-lock.json').read_text());assert lock['originalCommit']==COMMIT
 used={x['local']:x for x in lock['files']};raws={}
 for name,entry in used.items():
  raw=(source/name).read_bytes();assert len(raw)==entry['bytes'] and sha(raw)==entry['sha256'],name
  assert hashlib.sha1(b'blob '+str(len(raw)).encode()+b'\0'+raw).hexdigest()==entry['gitBlob'],name
  raws[name]=raw
 division=(source/'aliyah-2012.xml').read_bytes();assert hashlib.sha1(b'blob '+str(len(division)).encode()+b'\0'+division).hexdigest()=='c99177c1376aa2d1b2e8036fb24619ebb465c99a'
 metadata=json.loads((source/'audio-plan.json').read_text());assert metadata['license']=='http://creativecommons.org/licenses/by-sa/3.0/'
 audio={x['name']:x for x in metadata['files']};measured=json.loads((source/'duration-measurements.json').read_text());durations={x['name']:x for x in measured['files']};assert len(audio)==len(durations)==54
 sources={};targets={};mappings={};differences=[];boundary_groups=[]
 for name,bid in BOOKS.items():
  book=json.loads((root/f'data/repertoire/{bid}.json').read_text());targets[bid]=book;target_verses={(c['number'],v['number']):[w for w in v['tokens'] if w['kind']!='k' and letters(w['sourceHebrew'])] for c in book['chapters'] for v in c['verses']}
  xml=ET.fromstring(raws['xml/'+name+'.xml']);source_verses={}
  for c in xml.findall('.//book/c'):
   if 'n' not in c.attrib:continue
   cn=int(c.attrib['n'])
   for v in c.findall('v'):
    vn=int(v.attrib['n']);old=[];written=[]
    for node in v:
     if node.tag=='k':written.append(text_of(node));continue
     if node.tag!='w':continue
     old.append({'id':f'wlc-2012-{bid}-{cn}-{vn}-{len(old)+1}','chapter':cn,'verse':vn,'ordinal':len(old)+1,'sourceToken':text_of(node),'writtenVariants':written,'editorialCodes':[text_of(x) for x in node if x.tag=='x']});written=[]
    source_verses[(cn,vn)]=old;new=target_verses.get((cn,vn),[]);mapped=[]
    if ''.join(letters(w['sourceToken']) for w in old)==''.join(letters(w['sourceHebrew']) for w in new):
     old_spans=[];n=0
     for w in old:old_spans.append((n,n+len(letters(w['sourceToken']))));n=old_spans[-1][1]
     n=0
     for target in new:
      end=n+len(letters(target['sourceHebrew']));indices=[i for i,(a,b) in enumerate(old_spans) if a<end and b>n]
      if indices and old_spans[indices[0]][0]==n and old_spans[indices[-1]][1]==end:mapped.append((indices,target))
      else:boundary_groups.append({'readerId':target['id'],'sourceWordIds':[old[i]['id'] for i in indices]})
      n=end
    else:
     # Only identical literal prefixes/suffixes of the same source verse are
     # retained. The differing interior stays unassigned, even with equal counts.
     left=0
     while left<min(len(old),len(new)) and letters(old[left]['sourceToken'])==letters(new[left]['sourceHebrew']):mapped.append(([left],new[left]));left+=1
     oi,ni=len(old)-1,len(new)-1
     while oi>=left and ni>=left and letters(old[oi]['sourceToken'])==letters(new[ni]['sourceHebrew']):mapped.append(([oi],new[ni]));oi-=1;ni-=1
     differences.append({'bookId':bid,'chapter':cn,'verse':vn,'unassignedSourceIds':[w['id'] for w in old[left:oi+1]],'unassignedReaderIds':[w['id'] for w in new[left:ni+1]],'sourceForms':[w['sourceToken'] for w in old[left:oi+1]],'readerForms':[w['sourceHebrew'] for w in new[left:ni+1]]})
    for indices,target in mapped:
     group=[old[i] for i in indices]
     for part in group:
      assert part['id'] not in mappings
      mappings[part['id']]={'parts':group,'reader':target,'first':group[0]['id']}
  sources[name]=source_verses
 records=[]
 for part in ET.fromstring(division):
  value=part.attrib.get('haftara')
  if not value:continue
  name,spans=sections(value);bid=BOOKS[name];title=part.attrib['id'];label=title+'-H.txt';raw=raws['labels/'+label];starts=[float(n) for n in raw.decode().strip().split(',')];original=[];reader_words=[]
  assert all(math.isfinite(n) and n>=0 for n in starts),'Nonfinite/negative original timestamp: '+label
  for span in spans:
   begin=(span['start']['chapter'],span['start']['verse']);end=(span['end']['chapter'],span['end']['verse'])
   original.extend(w for point,words in sources[name].items() if begin<=point<=end for w in words)
   reader_words.extend(w for c in targets[bid]['chapters'] for v in c['verses'] if begin<=(c['number'],v['number'])<=end for w in v['tokens'] if w['kind']!='k' and letters(w['sourceHebrew']))
  filename=title.replace(' ','').replace('’','')+'-H.mp3';af=audio[filename];pcm=durations[filename]
  assert int(af['size'])==pcm['bytes'] and af['sha1']==pcm['sha1']
  issues=[]
  if len(starts)!=len(original):issues.append({'kind':'source-word-count','sourceWords':len(original),'sourceStarts':len(starts)})
  for index,(a,b) in enumerate(zip(starts,starts[1:])):
   if not 0<=a<b:issues.append({'kind':'non-increasing','sourceIndex':index,'before':a,'after':b})
  rows=[];original_ids={w['id']:i for i,w in enumerate(original)};owned=set()
  for index,w in enumerate(original):
   link=mappings.get(w['id']);reader=link['reader'] if link else None
   if link and link['first']!=w['id']:continue
   group=link['parts'] if link else [w]
   assert all(p['id'] in original_ids for p in group),'Source section cuts through a word group.'
   after=original_ids[group[-1]['id']]+1
   if reader:assert reader['id'] not in owned;owned.add(reader['id'])
   rows.append([reader['id'] if reader else None,reader['sourceHebrew'] if reader else None,[[p['sourceToken'],p['chapter'],p['verse'],p['ordinal'],p['editorialCodes'],p['writtenVariants']] for p in group],None if issues else starts[index],None if issues or after==len(starts) else starts[after]])
  missing=[{'id':w['id'],'hebrew':w['sourceHebrew']} for w in reader_words if w['id'] not in owned]
  record={'id':f'pt-haftarah-{len(records)+1:02d}','revision':1,'partName':title,'partHebrew':part.attrib['hebrew'],'title':title+' · Haftarah','bookId':bid,'sourceCoverage':value,'sections':spans,'alternativeSourceCoverage':part.attrib.get('sephardic'),'status':'timing-review' if issues else 'source-timed','issues':issues,'sourceWordCount':len(original),'sourceStarts':starts,'missingReaderWords':missing,'rows':rows,'audio':{'url':'https://archive.org/download/PockettorahAudioFiles/'+filename,'filename':filename,'source':'original','bytes':pcm['bytes'],'sha1':pcm['sha1'],'sha256':pcm['sha256'],'durationLabel':af.get('length'),'measuredDurationSeconds':pcm['durationSeconds'],'decodedPcm':{k:pcm[k] for k in ['pcmSampleRate','pcmChannels','pcmEncoding','pcmFrames','pcmSha256','decodedWavSha256']},'localFile':'./assets/references/Bereshit-H.mp3' if len(records)==0 else None},'timingSource':used['labels/'+label],'readerSource':{'bookId':bid,'sha256':sha((root/f'data/repertoire/{bid}.json').read_bytes()),'sourceUrl':targets[bid]['sourceUrl']}}
  record['readerWordCount']=len(reader_words)
  record['coverageIssues']=[]
  for span in spans:
   for edge in ['start','end']:
    point=span[edge]
    if not any(c['number']==point['chapter'] and any(v['number']==point['verse'] for v in c['verses']) for c in targets[bid]['chapters']):record['coverageIssues'].append({'kind':'source-verse-outside-reader','bookId':bid,'edge':edge,**point})
  record['readerSectionsValid']=not record['coverageIssues']
  record['durationReviewWordIds']=[row[0] for row in rows if row[0] and not issues and (row[3]>=pcm['durationSeconds'] or (row[4] is not None and row[4]>pcm['durationSeconds']))]
  records.append(record)
 assert len(records)==54
 audit={'schema':'tropetrain-haftarah-reference-audit-v1','revision':1,'originalCommit':COMMIT,'recordings':len(records),'originalAudioBytes':sum(r['audio']['bytes'] for r in records),'sourceWordOccurrences':sum(r['sourceWordCount'] for r in records),'readerWordOccurrences':sum(len(r['rows']) for r in records),'mappedReaderWordOccurrences':sum(sum(row[0] is not None for row in r['rows']) for r in records),'unmappedReaderWords':[{'recordingId':r['id'],'words':r['missingReaderWords']} for r in records if r['missingReaderWords']],'timingReviewRecordings':[{'id':r['id'],'issues':r['issues']} for r in records if r['issues']],'durationReviewWords':[{'id':r['id'],'words':r['durationReviewWordIds']} for r in records if r['durationReviewWordIds']],'discontinuousSourceReadings':sum(len(r['sections'])>1 for r in records),'sourceFiles':lock,'textDifferences':differences,'sourceBoundaryGroups':boundary_groups,'review':{'acoustic':None,'musical':None,'phonological':None},'limits':'Original source readings, not universal contemporary haftarah assignments, Kinnor presets, complete musical grammars or new pronunciation voices. Source variants/overlapping verses remain separate by recording. No reader/source text, audio or source timestamps changed. Unmatched interior forms and unusable timing windows remain withheld.'}
 packet={'schema':'tropetrain-haftarah-reference-library-v1','revision':1,'source':'PocketTorah Audio Files','creator':'Not-a-Box Media Lab','projectCredits':['Russel Neiss','Rabbi Charlie Schwartz'],'individualReader':None,'sourceUrl':'https://archive.org/details/PockettorahAudioFiles','audioLicense':'https://creativecommons.org/licenses/by-sa/3.0/','timingLicense':'https://creativecommons.org/licenses/by-sa/2.5/','alignmentLicense':'https://creativecommons.org/licenses/by-sa/3.0/','originalCommit':COMMIT,'records':records,'audit':{k:v for k,v in audit.items() if k not in ['sourceFiles','textDifferences','sourceBoundaryGroups']}}
 audit['readerWordOccurrences']=sum(r['readerWordCount'] for r in records)
 audit['sourceRows']=sum(len(r['rows']) for r in records)
 audit['sourceTimedMappedWordOccurrences']=sum(sum(row[0] is not None and row[0] not in r['durationReviewWordIds'] for row in r['rows']) for r in records if r['status']=='source-timed')
 audit['uniqueMappedReaderWords']=len({row[0] for r in records for row in r['rows'] if row[0]})
 audit['sourceCoverageReview']=[{'id':r['id'],'issues':r['coverageIssues']} for r in records if r['coverageIssues']]
 packet['audit']={k:v for k,v in audit.items() if k not in ['sourceFiles','textDifferences','sourceBoundaryGroups']}
 return packet,audit,raws,division,metadata,measured,lock
def emit(source,root):
 packet,audit,raws,division,metadata,measured,lock=build(source,root);dest=root/'data/references';dest.mkdir(exist_ok=True)
 packed=gzip.compress(json.dumps(packet,ensure_ascii=False,separators=(',',':')).encode(),compresslevel=9,mtime=0);(dest/'haftarah-library.json.gz').write_bytes(packed)
 buffer=io.BytesIO()
 with zipfile.ZipFile(buffer,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=9) as archive:
  payload={**raws,'aliyah-2012.xml':division,'source-lock.json':json.dumps(lock,ensure_ascii=False).encode(),'audio-plan.json':json.dumps(metadata).encode(),'duration-measurements.json':json.dumps(measured).encode(),'NOTICE.txt':b'PocketTorah / Not-a-Box Media Lab. Original text/timing metadata CC BY-SA2.5; original audio CC BY-SA3.0. Attribution: Russel Neiss and Rabbi Charlie Schwartz. Individual source readers not separately identified. Raw XML copyright notices retained. No audio or upstream application code in this source-data archive. https://ejewishphilanthropy.com/torah-on-the-go/\n'}
  for name,raw in sorted(payload.items()):
   entry=zipfile.ZipInfo(name,date_time=(1980,1,1,0,0,0));entry.compress_type=zipfile.ZIP_DEFLATED;archive.writestr(entry,raw)
 (dest/'haftarah-sources.zip').write_bytes(buffer.getvalue());(root/'docs/HAFTARAH-REFERENCE-AUDIT.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2)+'\n')
 print(json.dumps({'recordings':54,'packetBytes':len(packed),'sourcePackBytes':len(buffer.getvalue()),'mappedWords':audit['mappedReaderWordOccurrences'],'timingReview':audit['timingReviewRecordings'],'durationReview':audit['durationReviewWords'],'missingReaderWords':audit['unmappedReaderWords']},ensure_ascii=False),flush=True)
if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--source-dir',type=Path);parser.add_argument('--root',type=Path,default=ROOT);parser.add_argument('--verify',action='store_true');args=parser.parse_args()
 if not args.verify:
  assert args.source_dir,'Supply the explicit source-data directory.'
  emit(args.source_dir,args.root)
 else:
  with tempfile.TemporaryDirectory(prefix='tropetrain-haftarah-audit-') as directory:
   temporary=Path(directory);source=temporary/'source';source.mkdir();out=temporary/'output';(out/'data').mkdir(parents=True);(out/'data/repertoire').symlink_to(args.root/'data/repertoire',target_is_directory=True);(out/'docs').mkdir()
   with zipfile.ZipFile(args.root/'data/references/haftarah-sources.zip') as archive:
    for name in archive.namelist():
     assert '..' not in Path(name).parts and not Path(name).is_absolute()
     target=source/name;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(archive.read(name))
   emit(source,out)
   for name in ['data/references/haftarah-library.json.gz','data/references/haftarah-sources.zip','docs/HAFTARAH-REFERENCE-AUDIT.json']:
    assert (out/name).read_bytes()==(args.root/name).read_bytes(),'Rebuilt Haftarah source differs: '+name
   print('All54Haftarah source records, original pins, ordered sections, mapped/withheld words and original timestamps reproduce exactly.',flush=True)
