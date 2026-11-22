"""Original conservative source-display joins for Prophets and five scrolls.

Original source AST and marked reader Hebrew are never rewritten. Reuse the
Torah importer's exact/forced correspondence algorithm, not source phonology
code. Different editions keep explicit gaps, not inferred pronunciations.
"""
from pathlib import Path
import argparse,collections,gzip,hashlib,importlib.util,io,itertools,json,sys,zipfile
SCRIPTS=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('torah_display_join',SCRIPTS/'import-pronunciation.py')
join=importlib.util.module_from_spec(spec);spec.loader.exec_module(join)
letters,row_info,canonical,join_groups,partial_correspondence=join.letters,join.row_info,join.canonical,join.join_groups,join.partial_correspondence
anchored_written_variants=join.anchored_written_variants
COMMIT='6f0612ed2109d32e288d7c0ca41ae3dbfaad702b'
PACK='assets/pronunciation/phonetic-mam-repertoire-sources.zip'

def archive_bytes(source):
 manifest=json.loads((source/'SOURCE-MANIFEST.json').read_text());assert manifest['commit']==COMMIT and len(manifest['files'])==28
 dest=io.BytesIO()
 with zipfile.ZipFile(dest,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=9) as z:
  for name in ['SOURCE-MANIFEST.json',*[f['filename'] for f in manifest['files']]]:
   entry=zipfile.ZipInfo(name,date_time=(2026,1,1,0,0,0));entry.compress_type=zipfile.ZIP_DEFLATED;entry.external_attr=0o100644<<16;z.writestr(entry,(source/name).read_bytes(),compresslevel=9)
 return dest.getvalue()

def build_book(bid,filename,archive,root,manifest):
 groups=[];audits=[];sources=[];unused=[];partial_blocks=[];base_groups=[]
 data=json.loads(archive.read(filename));target_raw=(root/f'data/repertoire/{bid}.json').read_bytes();target=json.loads(target_raw)
 if data['schema']!='phonetic-mam-public-v1':raise ValueError('Unknown pronunciation display schema.')
 verses=[]
 for c in target['chapters']:
  for v in c['verses']:verses.append((c['number'],v['number'],[w for w in v['tokens'] if w['kind']!='k' and letters(w['sourceHebrew'])]))
 index=collections.defaultdict(list)
 for i,(chapter,_,_) in enumerate(verses):
  key='';words=[]
  for j in range(i,min(i+6,len(verses))):
   if verses[j][0]>chapter+1:break
   words+=verses[j][2];key+=''.join(canonical(letters(w['sourceHebrew'])) for w in verses[j][2]);index[key].append((i,j,list(words)))
 proposals=[];nonlexical=0
 for c in data['chapters']:
  for v in c['verses']:
   rows=[];invalid=False
   for rn,row in enumerate(v['rows']):
    info=row_info(row)
    if info is False:invalid=True;rows.append((rn,row,None,None));continue
    if info:rows.append((rn,row,*info))
    else:nonlexical+=1
   candidates=[]
   if not invalid:
    for a,b,words in index[''.join(r[2] for r in rows)]:
     if abs(verses[a][0]-c['number'])<=1 and abs(verses[b][0]-c['number'])<=1:
      result=join_groups(rows,words)
      if result:candidates.append({'start':a,'end':b,'words':words,'groups':result})
   proposals.append({'chapter':c['number'],'verse':v['number'],'rows':rows,'candidates':candidates,'reason':'inconsistent-source-columns' if invalid else 'no-complete-verse-match'})
 assigned={i:p['candidates'][0] for i,p in enumerate(proposals) if len(p['candidates'])==1};conflicts=set()
 for (a,x),(b,y) in zip(sorted(assigned.items()),sorted(assigned.items())[1:]):
  if x['end']>=y['start']:conflicts|={a,b}
 for i in conflicts:del assigned[i]
 resolved=set();changed=True
 while changed:
  changed=False
  for i,p in enumerate(proposals):
   if i in assigned or i in conflicts or not p['candidates']:continue
   before=max((k for k in assigned if k<i),default=None);after=min((k for k in assigned if k>i),default=None)
   if before is None or after is None:continue
   valid=[v for v in p['candidates'] if v['start']>assigned[before]['end'] and v['end']<assigned[after]['start']]
   if len(valid)==1:assigned[i]=valid[0];resolved.add(i);changed=True
 partials=collections.defaultdict(list)
 for (left,before),(right,after) in zip(sorted(assigned.items()),sorted(assigned.items())[1:]):
  if right==left+1:continue
  entries=[{'proposal':i,'row':row} for i in range(left+1,right) for row in proposals[i]['rows']]
  words=[w for _,_,ws in verses[before['end']+1:after['start']] for w in ws]
  window_id=f'pmam-gap-{bid}-{left+1}-{right-1}'
  anchors={'id':window_id,'beforeReaderEnd':before['words'][-1]['id'],'afterReaderStart':after['words'][0]['id']}
  block={'id':window_id,'bookId':bid,'before':{'displayChapter':proposals[left]['chapter'],'displayVerse':proposals[left]['verse'],'readerEnd':anchors['beforeReaderEnd']},'after':{'displayChapter':proposals[right]['chapter'],'displayVerse':proposals[right]['verse'],'readerStart':anchors['afterReaderStart']},'readerIds':[w['id'] for w in words],'sourceRows':len(entries),'targetWords':len(words)}
  if not entries or not words or len(entries)>256 or len(words)>384:
   block.update(status='refused-window-bounds',forcedGroups=0);partial_blocks.append(block);continue
  result,found,candidate_count=partial_correspondence(entries,words)
  anchors.update(optimalKeyUnits=result['score'],optimalPaths=str(result['paths']))
  for i,group in found:
   group.update(match='forced-between-verse-anchors',matchWindow=anchors)
   partials[i].append(group)
  used={(i,r['number']) for i,g in found for r in g['rows']}
  block.update(status='exact-forced-groups-only',candidateEdges=candidate_count,candidateSha256=result['candidateSha256'],optimalKeyUnits=result['score'],optimalPaths=str(result['paths']),forcedGroups=len(found),mappedWords=sum(len(g['readerIds']) for _,g in found),unassignedSourceRows=[{'displayChapter':proposals[e['proposal']]['chapter'],'displayVerse':proposals[e['proposal']]['verse'],'rowNumber':e['row'][0]+1} for e in entries if (e['proposal'],e['row'][0]+1) not in used])
  partial_blocks.append(block)
 mapped=set();nrows=0;starts=[]
 for i,p in enumerate(proposals):
  if i not in assigned:
   unused.append({'bookId':bid,'displayChapter':p['chapter'],'displayVerse':p['verse'],'reason':'non-monotonic-candidates' if i in conflicts else 'ambiguous-verse-match' if p['candidates'] else p['reason'],'candidates':len(p['candidates']),'partialGroups':len(partials[i])})
  else:starts.append((assigned[i]['start'],assigned[i]['end']))
  chosen=assigned[i]['groups'] if i in assigned else partials[i]
  for group in chosen:
   for rid in group['readerIds']:
    if rid in mapped:raise ValueError('Reader word mapped twice: '+rid)
    mapped.add(rid)
   nrows+=len(group['rows'])
   group.update(id=f"pmam-{bid}-{p['chapter']}-{p['verse']}-{group['rows'][0]['number']}",bookId=bid,displayChapter=p['chapter'],displayVerse=p['verse'],match=group.get('match','surrounding-verse-anchors' if i in resolved else 'unique-complete-verse'),readerStart=group['readerIds'][0],readerEnd=group['readerIds'][-1])
   groups.append(group)
 if any(a[1]>=b[0] for a,b in zip(starts,starts[1:])):raise ValueError('Non-monotonic accepted verse ordering.')
 reader=[w for _,_,ws in verses for w in ws]
 original=[g for g in groups if g['bookId']==bid];base_groups.extend(original)

 added,evidence,order=anchored_written_variants(bid,data,target,original,row_info,hashlib.sha256(target_raw).hexdigest(),{'filename':filename,**manifest['files'][filename]})
 for group in added:
  assert not set(group['readerIds'])&mapped
  mapped.update(group['readerIds']);nrows+=len(group['rows'])
 groups=sorted(original+added,key=lambda g:order[g['readerIds'][0]])
 assert len({g['id'] for g in groups})==len(groups)
 packet={'format':'tropetrain-pronunciation-display-v1','revision':5,'bookId':bid,'sourceCommit':COMMIT,'license':'CC-BY-SA-4.0','groups':groups}
 raw=json.dumps(packet,ensure_ascii=False,separators=(',',':')).encode();packed=gzip.compress(raw,compresslevel=9,mtime=0)
 audit={'bookId':bid,'readerWords':len(reader),'mappedWords':len(mapped),'unmappedWords':len(reader)-len(mapped),'groups':len(groups),'sourceRows':sum(len(p['rows']) for p in proposals),'mappedSourceRows':nrows,'nonlexicalSourceRows':nonlexical,'acceptedDisplayVerses':len(assigned),'unmatchedDisplayVerses':len(proposals)-len(assigned),'partiallyMatchedDisplayVerses':sum(bool(v) for v in partials.values()),'anchoredRepeatedVerses':len(resolved),'explicitWrittenReadVariantGroups':len(added),'readerSha256':hashlib.sha256(target_raw).hexdigest(),'packetSha256':hashlib.sha256(packed).hexdigest(),'packetBytes':len(packed),'unmappedReaderIds':[w['id'] for w in reader if w['id'] not in mapped],'unmatchedDisplayVersesDetail':unused,'partialWindows':partial_blocks,'explicitWrittenReadEvidence':evidence}
 return packed,audit

def build(root,source=None,verify=False):
 outputs={}
 archive_raw=(root/PACK).read_bytes() if source is None else archive_bytes(source)
 with zipfile.ZipFile(io.BytesIO(archive_raw)) as archive:
  lock=json.loads(archive.read('SOURCE-MANIFEST.json'));assert lock['commit']==COMMIT and lock['license']=='CC-BY-SA-4.0' and len(lock['files'])==28
  files={f['filename']:f for f in lock['files']};manifest={'files':files}
  books=[f for f in lock['files'] if f['bookId'] is not None];assert len(books)==26 and len({f['bookId'] for f in books})==26
  expected={b['id'] for b in json.loads((root/'data/repertoire/manifest.json').read_text())['books']};assert {f['bookId'] for f in books}==expected
  for f in lock['files']:
   raw=archive.read(f['filename']);assert len(raw)==f['bytes'] and hashlib.sha256(raw).hexdigest()==f['sha256'] and hashlib.sha1(b'blob '+str(len(raw)).encode()+b'\0'+raw).hexdigest()==f['gitBlob'],f['filename']
  audits=[]
  for f in books:
   packed,audit=build_book(f['bookId'],f['filename'],archive,root,manifest);outputs[f"data/pronunciation/repertoire/{f['bookId']}.json.gz"]=packed;audits.append(audit)
   print(json.dumps({k:audit[k] for k in ['bookId','readerWords','mappedWords','unmappedWords','packetBytes']}),flush=True)
  summary={'sourceCommit':COMMIT,'license':'CC-BY-SA-4.0','books':[{k:b[k] for k in ['bookId','readerWords','mappedWords','unmappedWords','groups','packetSha256','packetBytes']} for b in audits],'readerWords':sum(b['readerWords'] for b in audits),'mappedWords':sum(b['mappedWords'] for b in audits),'groups':sum(b['groups'] for b in audits)}
  audit={'schema':'tropetrain-pronunciation-repertoire-alignment-v1','revision':1,'sourceCommit':COMMIT,'license':'CC-BY-SA-4.0','archive':PACK,'archiveSha256':hashlib.sha256(archive_raw).hexdigest(),'sourceFiles':lock['files'],'summary':summary,'books':audits,'method':'Existing original Torah complete-verse/ordered-anchor/forced-monotonic exact letter correspondence plus explicit adjacent one-written/one-read variants. All original source columns, stress, joins and marked reader Hebrew retained. No primary-edition differing-spelling or implicit-reading rescue is inferred for these new books.','limits':'Source display text correspondence only. Different/ambiguous rows remain unassigned. No computed Hebrew syllable underlay, category/IPA proposals, acoustic intervals, phonemes, new singing voice, historical Kinnor profile or complete melody grammar is inferred. Independent correspondence/linguistic review pending.'}
  outputs['docs/PRONUNCIATION-REPERTOIRE-ALIGNMENT.json']=(json.dumps(audit,ensure_ascii=False,indent=2)+'\n').encode()
  outputs['pronunciation-repertoire-summary.js']=('// Generated by scripts/import-pronunciation-repertoire.py.\nexport const PRONUNCIATION_REPERTOIRE_SUMMARY='+json.dumps(summary,ensure_ascii=False,separators=(',',':'))+';\n').encode()
 outputs[PACK]=archive_raw
 for name,raw in outputs.items():
  path=root/name
  if verify:assert path.read_bytes()==raw,'Repertoire pronunciation output differs: '+name
  else:path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(raw)
 print(json.dumps({'verified':verify,'books':len(audits),'readerWords':summary['readerWords'],'mappedWords':summary['mappedWords'],'outputs':len(outputs),'sourceZipBytes':len(archive_raw),'packetsBytes':sum(b['packetBytes'] for b in audits)}),flush=True)
if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--root',type=Path,default=SCRIPTS.parent);parser.add_argument('--source-dir',type=Path);parser.add_argument('--verify',action='store_true');args=parser.parse_args();build(args.root,args.source_dir,args.verify)
