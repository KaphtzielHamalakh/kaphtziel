"""Original source-display join; no pronunciation engine or source code imported.

Comparison keys never replace source text. Exact complete-verse candidates are
validated as groups, ordered without overlaps, then repeated verses need two
surrounding accepted anchors. Missing/ambiguous regions remain unassigned.
"""
from pathlib import Path
import collections,gzip,hashlib,itertools,io,json,re,zipfile
from pronunciation_matching import forced_edges
ROOT=Path(__file__).resolve().parents[1]
PACK=ROOT/'assets/pronunciation/phonetic-mam-torah-sources.zip'
BOOKS=[('gen','A1-Genesis.json'),('exo','A2-Exodus.json'),('lev','A3-Levit.json'),('num','A4-Numbers.json'),('deu','A5-Deuter.json')]
LETTERS=re.compile('[^א-ת]')
NAMES=re.compile(r'^([ובכלמשה]{0,3})(יהוה|אדני|אלהים)$')
def letters(s):return LETTERS.sub('',s)
def inline(nodes):
 if nodes is None:return ''
 return ''.join(n if isinstance(n,str) else ('ᵉ' if n['kind']=='superscript-e' else inline(n['content'])) for n in nodes)
def canonical(s):
 m=NAMES.fullmatch(s)
 if m:return m[1]+'@'
 s=s.replace('יששכר','ישכר')
 return s[:-3]+'היא' if s.endswith('הוא') else s

def reader_alternatives(word):
 raw=letters(word['sourceHebrew']);forms={raw}
 # Documented implicit-qere display forms; never phoneme or text rewriting.
 if raw.endswith('יהוה'):forms|={raw[:-4]+'אדני',raw[:-4]+'אלהים'}
 clusters=re.findall('[א-ת][^א-ת]*',word['sourceHebrew'])
 if raw.endswith('הוא') and '\u05b4' in clusters[-3]:forms.add(raw[:-3]+'היא')
 if 'יששכר' in raw:forms.add(raw.replace('יששכר','ישכר'))
 return forms

def row_info(row):
 forms=[inline(cell) for cell in row['hebrew'] if cell is not None]
 if not forms or all(s in ['פפפ','ססס','פפ','סס','׀',''] for s in forms):return None
 keys=[''.join(canonical(letters(p)) for p in re.split('[־\\s]+',s) if letters(p)) for s in forms]
 if len(set(keys))!=1:return False
 return keys[0],forms

def join_groups(rows,words):
 re_=list(itertools.accumulate(len(r[2]) for r in rows));we=list(itertools.accumulate(len(canonical(letters(w['sourceHebrew']))) for w in words))
 ends=sorted(set(re_)&set(we));ri=wi=0;result=[]
 if not ends or ends[-1]!=re_[-1] or ends[-1]!=we[-1]:return None
 for end in ends:
  rr=[];ww=[]
  while ri<len(rows) and re_[ri]<=end:rr.append(rows[ri]);ri+=1
  while wi<len(words) and we[wi]<=end:ww.append(words[wi]);wi+=1
  source_forms=[set(letters(f) for f in row[3]) for row in rr]
  choices=[reader_alternatives(w) for w in ww]
  # Refuse unexpectedly large alternative combinations rather than dropping one.
  if any(not a for a in source_forms+choices) or max(__import__('math').prod(map(len,source_forms)),__import__('math').prod(map(len,choices)))>64:return None
  variants={''.join(v) for v in itertools.product(*source_forms)}
  allowed={''.join(v) for v in itertools.product(*choices)}
  if not variants<=allowed:return None
  raw=''.join(letters(w['sourceHebrew']) for w in ww)
  flags=[]
  if variants!={raw}:flags.append('documented-reading-form')
  if len(rr)!=1 or len(ww)!=1:flags.append('source-group')
  texts=[''.join(inline(r[1]['hebrew'][col]) for r in rr if col<len(r[1]['hebrew']) and r[1]['hebrew'][col] is not None) for col in range(max(len(r[1]['hebrew']) for r in rr))]
  if any(t and t!=''.join(w['sourceHebrew'] for w in ww) for t in texts):flags.append('source-text-difference')
  result.append({'readerIds':[w['id'] for w in ww],'readerHebrew':[w['sourceHebrew'] for w in ww],
   'rows':[{'number':rn+1,**r} for rn,r,_,_ in rr],'flags':flags})
 return result

def partial_correspondence(entries,words):
 """Only indivisible exact groups present in every optimal monotonic path."""
 target=collections.defaultdict(list)
 for b in range(len(words)):
  key=''
  for d in range(b,min(b+8,len(words))):
   key+=canonical(letters(words[d]['sourceHebrew']));target[key].append((b,d+1))
 edges=[];groups={}
 for a,entry in enumerate(entries):
  key=''
  for c in range(a,min(a+4,len(entries))):
   if entries[c]['proposal']!=entry['proposal'] or entries[c]['row'][2] is None:break
   key+=entries[c]['row'][2]
   for b,d in target.get(key,[]):
    result=join_groups([e['row'] for e in entries[a:c+1]],words[b:d])
    if result and len(result)==1:
     edge=(a,b,c+1,d,len(key));edges.append(edge);groups[edge]=result[0]
 result=forced_edges(len(entries),len(words),edges)
 result['candidateSha256']=hashlib.sha256(json.dumps(sorted(edges),separators=(',',':')).encode()).hexdigest()
 return result,[(entries[e[0]]['proposal'],groups[e]) for e in result['forced']],len(edges)

def build():
 with zipfile.ZipFile(PACK) as archive:
  manifest=json.loads(archive.read('SOURCE-MANIFEST.json'))
  pinned=json.loads((ROOT/'docs/PRONUNCIATION-SOURCES.json').read_text())
  if manifest['commit']!=pinned['commit'] or set(manifest['files'])!={name for _,name in BOOKS}:raise ValueError('Unexpected pronunciation source revision/files.')
  for name,spec in manifest['files'].items():
   expected=next(f for f in pinned['files'] if f['path']=='Phonetic-MAM/data/'+name)
   if any(spec[k]!=expected[k] for k in ['bytes','sha256','gitBlob']):raise ValueError('Unpinned source metadata: '+name)
  for name,f in manifest['files'].items():
   raw=archive.read(name)
   if len(raw)!=f['bytes'] or hashlib.sha256(raw).hexdigest()!=f['sha256'] or hashlib.sha1(f'blob {len(raw)}\0'.encode()+raw).hexdigest()!=f['gitBlob']:raise ValueError('Source changed: '+name)
  groups=[];audits=[];sources=[];unused=[];partial_blocks=[]
  for bid,filename in BOOKS:
   data=json.loads(archive.read(filename));target_raw=(ROOT/f'data/torah/{bid}.json').read_bytes();target=json.loads(target_raw)
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
   audits.append({'bookId':bid,'readerWords':len(reader),'mappedWords':len(mapped),'unmappedWords':len(reader)-len(mapped),'acceptedDisplayVerses':len(assigned),'unmatchedDisplayVerses':len(proposals)-len(assigned),'partiallyMatchedDisplayVerses':sum(bool(value) for value in partials.values()),'mappedDisplayRows':nrows,'nonlexicalRows':nonlexical,'anchoredRepeatedVerses':len(resolved),'readerSha256':hashlib.sha256(target_raw).hexdigest(),'unmappedReaderIds':[w['id'] for w in reader if w['id'] not in mapped]})
   sources.append({'bookId':bid,'filename':filename,**manifest['files'][filename]})
 packet={'format':'tropetrain-pronunciation-display-v1','revision':2,'sourceCommit':manifest['commit'],'license':'CC-BY-SA-4.0','groups':groups}
 raw=json.dumps(packet,ensure_ascii=False,separators=(',',':')).encode();packed=gzip.compress(raw,compresslevel=9,mtime=0)
 (ROOT/'data/pronunciation/torah-display.json.gz').write_bytes(packed)
 audit={'schema':'tropetrain-pronunciation-alignment-v1','revision':1,'sourceCommit':manifest['commit'],'license':'CC-BY-SA-4.0','sourceFiles':sources,'books':audits,'mappedWords':sum(b['mappedWords'] for b in audits),'readerWords':sum(b['readerWords'] for b in audits),'groups':len(groups),'unmatchedDisplayVerses':unused,'packetSha256':hashlib.sha256(packed).hexdigest(),'method':'Complete display-verse letter correspondence to one to six contiguous UXLC verse records in nearby chapters. Unique matches must be ordered and disjoint; repeats require two surrounding accepted anchors. Only documented implicit-qere name/hi/Yissakhar forms permitted; original strings unchanged. Common row/word boundaries define many-to-many groups; all source columns/readings retained.','limits':'Source transcription study only; not six Kinnor profiles, new phoneme grammar, syllable/audio timing or singing synthesis. Ambiguous/unmatched words have no assigned transcription. Independent linguistic and mapping review pending.'}
 audit.update(revision=2,partialWindows=partial_blocks,partialMethod='Remaining regions require two complete-verse anchors. Within bounded windows, candidate indivisible groups require exact comparison keys and all literal source reading alternatives. Only edges on every maximum-key-unit monotonic alignment are accepted; no substitutions, tie breaks, or inferred syllables. Maximum4source rows/8reader words per candidate;256rows/384words per window.')
 (ROOT/'docs/PRONUNCIATION-ALIGNMENT.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2)+'\n')
 summary={k:audit[k] for k in ['schema','revision','sourceCommit','mappedWords','readerWords','groups','limits']}
 (ROOT/'pronunciation-summary.js').write_text('// Generated by scripts/import-pronunciation.py.\nexport const PRONUNCIATION_SUMMARY='+json.dumps(summary,ensure_ascii=False,separators=(',',':'))+';\n')
 print(json.dumps({'mappedWords':audit['mappedWords'],'readerWords':audit['readerWords'],'groups':len(groups),'gzipBytes':len(packed),'unmatchedDisplayVerses':len(unused)}))
if __name__=='__main__':build()
