"""Independently recompute every admitted literal context from canonical Torah."""
from pathlib import Path
import json,zipfile,re,bisect,collections,hashlib
ROOT=Path(__file__).resolve().parent.parent;read=lambda p:json.loads(p.read_text());letters=lambda s:''.join(re.findall('[א-ת]',s))
manifest=read(ROOT/'data/torah/manifest.json');words=[]
for ref in manifest['books']:
 book=read(ROOT/'data/torah'/ref['file'])
 for chapter in book['chapters']:
  for verse in chapter['verses']:
   for token in verse['tokens']:
    if token['kind']!='k'and letters(token['sourceHebrew']):words.append({'bookId':book['id'],'id':token['id'],'hebrew':token['sourceHebrew']})
assert len(words)==79985;flat='';spans=[];prev=None
for w in words:
 if prev is not None and prev!=w['bookId']:flat+='\0'
 start=len(flat);flat+=letters(w['hebrew']);spans.append((start,len(flat)));prev=w['bookId']
starts=[s[0]for s in spans];ends=[s[1]for s in spans];by_id={w['id']:(w,span)for w,span in zip(words,spans)};ngrams=collections.Counter(flat[i:i+8]for i in range(len(flat)-7)if'\0'not in flat[i:i+8])
with zipfile.ZipFile(ROOT/'assets/references/torah-observed-cues-sources.zip')as z:files=json.loads(z.read('files.json'))
contexts=json.loads(files['discovered-contexts.json']);raw={}
for name,text in files.items():
 if name.startswith('observations/')and not name.endswith('/recipe.json'):
  b=text.encode();raw[hashlib.sha256(b).hexdigest()]=json.loads(text)
count=0;observations=0
for rid in ['pt-portion-20-3','pt-portion-13-7']:
 study=json.loads(files['studies/'+rid+'.json'])
 for w in study['words']:
  canonical,span=by_id[w['id']];assert canonical['hebrew']==w['hebrew']
  if not w['cue']:continue
  count+=1
  for family,values in w['cue']['allModelObservations'].items():
   for o in values:
    observations+=1;v=raw[o['observationSha256']];d=contexts[family+':'+o['case']];assert d['rawLetters']==letters(v['rawModelText']);x=o['exactContext'];a,e=x['recognizerLetters'];b,z=x['readerLetters'];assert d['rawLetters'][a:e]==flat[b:z]and'\0'not in flat[b:z]and e-a==z-b==x['letters']>=12
    assert any(ngrams[flat[i:i+8]]==1 for i in range(b,z-7))
    first=bisect.bisect_left(starts,b);last=bisect.bisect_right(ends,z);full=[j for j in range(first,last)if b<=spans[j][0]and spans[j][1]<=z];assert len(full)==x['fullWords']>=3 and words[full[0]]['id']==x['firstFullWordId']and words[full[-1]]['id']==x['lastFullWordId']
    p,q=o['rawLetterRange'];assert p==a+span[0]-b and q-p==span[1]-span[0]and d['rawLetters'][p:q]==letters(w['hebrew'])and o['characterEvidence']['letter']==d['rawLetters'][p]
    if family=='ctc':
     c=[(ch,t)for token,t in zip(v['rawTokens'],v['modelTokenTimestampsWithinClip'])for ch in token if re.fullmatch('[א-ת]',ch)];assert ''.join(ch for ch,t in c)==d['rawLetters'];assert abs(v['identity']['sourceAnalysisSampleRange'][0]/16000+c[p][1]-o['point'])<1e-8
assert count==61
print(json.dumps({'wholeTorahWords':len(words),'concordantCueWords':count,'literalObservationsIndependentlyRechecked':observations,'allUniqueContextsAndExactWordRanges':True,'wordBoundariesApproved':0}))
