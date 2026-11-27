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
summary=read(ROOT/'docs/TORAH-OBSERVED-CUES.json')
def unpack(path):
 with zipfile.ZipFile(path)as z:
  m=json.loads(z.read('manifest.json'));container=z.read('files.json');assert hashlib.sha256(container).hexdigest()==m['filesContainer']['sha256'];files=json.loads(container)
  for f in m['files']:
   body=files[f['file']].encode();assert len(body)==f['bytes']and hashlib.sha256(body).hexdigest()==f['sha256']
  return files
packs=[(summary['sourcePack'],[r for r in summary['records']if'evidenceSetId'not in r])]+[(s['sourcePack'],[r for r in summary['records']if r.get('evidenceSetId')==s['id']])for s in summary.get('evidenceSets',[])]
token_files=unpack(ROOT/packs[1][0]['file']);token_manifest=json.loads(token_files['tokenizer/manifest.json'])
for f in token_manifest['files']:
 b=token_files['tokenizer/'+f['file']].encode();assert len(b)==f['bytes']and hashlib.sha256(b).hexdigest()==f['sha256']
vocabulary=json.loads(token_files['tokenizer/vocab.json']);added=json.loads(token_files['tokenizer/added_tokens.json']);names={**vocabulary,**added};by_token_id={i:t for t,i in vocabulary.items()};added_by_id={i:t for t,i in added.items()}
def special_names(v):
 if isinstance(v,list):return [n for x in v for n in special_names(x)]
 return [v['content']if isinstance(v,dict)else v]
specials={names[n]for v in json.loads(token_files['tokenizer/special_tokens_map.json']).values()for n in special_names(v)};assert specials==set(token_manifest['specialTokenIds'])
# Independently invert the byte alphabet; no Transformers import or audio decoder.
kept=list(range(33,127))+list(range(161,173))+list(range(174,256));unicode_points=kept[:];extra=0
for byte in range(256):
 if byte not in kept:kept.append(byte);unicode_points.append(256+extra);extra+=1
byte_of={chr(code):byte for byte,code in zip(kept,unicode_points)}
def whisper_letters(v):
 assert v['identity']['modelRevision']==token_manifest['modelRevision'];body=bytearray();byte_times=[]
 assert len(v['tokenIds'])==len(v['modelTokenTimestampsWithinClip'])
 for token,t in zip(v['tokenIds'],v['modelTokenTimestampsWithinClip']):
  if token in specials:continue
  b=added_by_id[token].encode()if token in added_by_id else bytes(byte_of[ch]for ch in by_token_id[token]);body.extend(b);byte_times.extend([t]*len(b))
 text=body.decode();assert text==v['rawModelText'];chars=[];offset=0
 for ch in text:
  width=len(ch.encode())
  if re.fullmatch('[א-ת]',ch):chars.append((ch,min(byte_times[offset:offset+width])))
  offset+=width
 return chars
count=0;observations=0;family_counts=collections.Counter();batch_counts=[]
for pack,reports in packs:
 body=(ROOT/pack['file']).read_bytes();assert len(body)==pack['bytes']and hashlib.sha256(body).hexdigest()==pack['sha256'];files=unpack(ROOT/pack['file']);contexts=json.loads(files['discovered-contexts.json']);raw={};decoded={};batch=0
 for name,text in files.items():
  if name.startswith('observations/')and not name.endswith('/recipe.json'):
   b=text.encode();raw[hashlib.sha256(b).hexdigest()]=json.loads(text)
 for report in reports:
  study=json.loads(files['studies/'+report['recordId']+'.json'])
  for w in study['words']:
   canonical,span=by_id[w['id']];assert canonical['hebrew']==w['hebrew']
   if not w['cue']:continue
   count+=1;batch+=1
   for family,values in w['cue']['allModelObservations'].items():
    for o in values:
     observations+=1;family_counts[family]+=1;v=raw[o['observationSha256']];d=contexts[family+':'+o['case']];assert d['rawLetters']==letters(v['rawModelText']);x=o['exactContext'];a,e=x['recognizerLetters'];b,z=x['readerLetters'];assert d['rawLetters'][a:e]==flat[b:z]and'\0'not in flat[b:z]and e-a==z-b==x['letters']>=12
     assert any(ngrams[flat[i:i+8]]==1 for i in range(b,z-7))
     first=bisect.bisect_left(starts,b);last=bisect.bisect_right(ends,z);full=[j for j in range(first,last)if b<=spans[j][0]and spans[j][1]<=z];assert len(full)==x['fullWords']>=3 and words[full[0]]['id']==x['firstFullWordId']and words[full[-1]]['id']==x['lastFullWordId']
     p,q=o['rawLetterRange'];assert p==a+span[0]-b and q-p==span[1]-span[0]and d['rawLetters'][p:q]==letters(w['hebrew'])and o['characterEvidence']['letter']==d['rawLetters'][p]
     if o['observationSha256']not in decoded:
      decoded[o['observationSha256']]=[(ch,t)for token,t in zip(v['rawTokens'],v['modelTokenTimestampsWithinClip'])for ch in token if re.fullmatch('[א-ת]',ch)]if family=='ctc'else whisper_letters(v)
     chars=decoded[o['observationSha256']];assert ''.join(ch for ch,t in chars)==d['rawLetters'];assert abs(v['identity']['sourceAnalysisSampleRange'][0]/16000+chars[p][1]-o['point'])<1e-8
 batch_counts.append(batch)
assert count==summary['agreedListeningCues']==155 and batch_counts==[61,94]
print(json.dumps({'wholeTorahWords':len(words),'concordantCueWords':count,'cuesPerEvidenceSet':batch_counts,'literalObservationsIndependentlyRechecked':observations,'observationsPerFamily':dict(family_counts),'allUniqueContextsAndExactWordRanges':True,'allCtcAndWhisperByteCharacterClocksExact':True,'wordBoundariesApproved':0}))
