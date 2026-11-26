"""Reproduce the separate unreviewed source-cue packets from pinned research."""
from pathlib import Path
import json,hashlib,zipfile,gzip,sys,math,re
ROOT=Path(__file__).resolve().parent.parent
PACK=ROOT/'assets/references/torah-observed-cues-sources.zip'
PACK_SHA='e7ca0ae5a56b90101122a249c2267075fc44189a62bcb2b62a6ca4e44438713a'
sha=lambda b:hashlib.sha256(b).hexdigest();encode=lambda v:(json.dumps(v,ensure_ascii=False,indent=2,allow_nan=False)+'\n').encode()
def generate():
 raw=PACK.read_bytes();assert sha(raw)==PACK_SHA
 outputs={};records=[]
 with zipfile.ZipFile(PACK)as z:
  manifest=json.loads(z.read('manifest.json'));assert manifest['format']=='tropetrain-torah-observed-cues-source-pack-v1'and manifest['readerWords']==79985 and manifest['noAudioOrWeights']is True
  assert manifest['storageFormat']=='exact-utf8-files-json-v1';container=z.read('files.json');assert len(container)==manifest['filesContainer']['bytes']and sha(container)==manifest['filesContainer']['sha256'];files=json.loads(container);assert set(files)=={f['file']for f in manifest['files']}
  get=lambda name:files[name].encode('utf8')
  assert manifest['referencePacketSha256']==sha((ROOT/'data/references/torah-library.json.gz').read_bytes())
  for f in manifest['files']:
   b=get(f['file']);assert len(b)==f['bytes']and sha(b)==f['sha256'],f['file']
  plan=json.loads(get('NEW-RECOGNIZER-PLAN.json'));rules=plan['integrationGates'];assert plan['expectedTranscript']is None and plan['audioOutput']is False and plan['sourceAudioUploaded']is False and plan['old807TimingGatesChanged']is False
  assert rules['literalLetters']==12 and rules['wholeWords']==3 and rules['maxInterModelPointDifferenceSeconds']==.75 and rules['edgeExclusionSeconds']==.25 and rules['minimumLocalRmsDbfs']==-55 and rules['overlapOccurrenceClusterDiameterSeconds']==.75 and rules['listeningContextSecondsEachSide']==2
  raw_values={};family_counts={'ctc':0,'whisper':0}
  for f in manifest['files']:
   if not f['file'].startswith('observations/')or f['file'].endswith('/recipe.json'):continue
   v=json.loads(get(f['file']));family=f['file'].split('/')[1];family_counts[family]+=1;assert v['complete']and v['expectedTranscript']is None and v['recognitionPrompt']is None and v['knownPassageSentToDecoder']is False
   raw_values[f['sha256']]=v
  assert family_counts=={'ctc':51,'whisper':25}
  reference=json.loads(gzip.decompress((ROOT/'data/references/torah-library.json.gz').read_bytes()));by_id={r['id']:r for r in reference['recordings']}
  shared_models=None;shared_controls=None
  for rid in ['pt-portion-20-3','pt-portion-13-7']:
   v=json.loads(get('studies/'+rid+'.json'));r=by_id[rid];assert r==json.loads(get('reference-records/'+rid+'.json'))
   bindings=json.loads(get('reader-bindings/'+rid+'.json'));assert v['source']['sha1']==r['audio']['sha1']and v['source']['bytes']==r['audio']['bytes']and v['candidateCoverage']==r['coverage']==bindings['catalogCoverage']
   assert sha(get('original-timings/'+rid+'.txt'))==r['timingSource']['sha256'];assert v['source']['sha256']==bindings['sourceOriginalSha256']
   assert [(w['id'],w['hebrew'])for w in v['words']]==[(w[0],w[1])for w in r['words']]==[(w['id'],w['hebrew'])for w in bindings['words']]
   assert v['rules']==rules and v['sourceClockFitted']is False and v['sourceEditionCompared']is False and v['wordDurationInferred']is False and v['boundaryAutofill']is False and v['frontendMismatchRetained']is True
   for k in ['actualRecordingCoverage','acceptedWordTimes','phonemes','syllableAlignment','musicalNotes','newVoice','review','trainingHeldOut']:assert v[k]is None
   if shared_models is None:shared_models=v['models'];shared_controls=v['controls']
   else:assert shared_models==v['models']and shared_controls==v['controls']
   count=0
   for w in v['words']:
    assert w['approvedBoundary']is None and w['review']is None
    if w['cue']is None:assert w['withheldReason'];continue
    count+=1;c=w['cue'];assert w['withheldReason']is None and c['wordStart']is None and c['wordEnd']is None and c['review']is None and c['allModelObservations']==w['observations'];points=[]
    for family in ['ctc','whisper']:
     obs=c['allModelObservations'][family];assert obs
     for o in obs:
      x=o['exactContext'];assert o['wordId']==w['id']and o['hebrew']==w['hebrew']and x['letters']>=12 and x['fullWords']>=3 and x['someEightLetterContextUniqueAcrossWholeTorah']is True
      original=raw_values[o['observationSha256']];identity=original['identity'];assert identity['recordId']==rid and identity['sourceOriginalSha256']==v['source']['sha256']and identity['sourceAnalysisSampleRange']==o['sourceSampleRange']and identity['case']==o['case']
      lo,hi=[s/16000 for s in o['sourceSampleRange']];margin=min(o['point']-lo,hi-o['point']);assert margin>=.25 and abs(margin-o['chunkInteriorSeconds'])<1e-8
      if family=='ctc':
       e=o['characterEvidence'];assert any(t==e['rawToken']and abs(lo+s-o['point'])<1e-8 for t,s in zip(original['rawTokens'],original['modelTokenTimestampsWithinClip']))
      else:
       assert original['hitGenerationLengthCap']is False
       e=o['characterEvidence'];assert all(t in original['tokenIds']for t in e['rawTokenIds']);assert any(abs(lo+s-o['point'])<1e-8 for s in original['modelTokenTimestampsWithinClip'])
      points.append(o['point'])
     chosen=sorted(obs,key=lambda o:(-o['chunkInteriorSeconds'],o['sourceSampleRange'][0],-o['exactContext']['letters'],o['point']))[0];assert c[family]==chosen
    spread=max(points)-min(points);assert spread<=.75 and spread==c['allObservationSpreadSeconds'];assert c['point']==c['ctc']['point']and abs(c['ctc']['point']-c['whisper']['point'])==c['clockDifferenceSeconds']
    assert 0<=c['point']<v['source']['duration']and c['context']=={'start':max(0,c['point']-2),'end':min(v['source']['duration'],c['point']+2)}
    s=c['localSignal'];assert s['rms']>0 and s['rmsDbfs']>=-55 and abs(20*math.log10(s['rms'])-s['rmsDbfs'])<1e-8 and s['speechOrPhonemeConfirmed']is False
   assert count==v['counts'].get('agreed-listening-cue',0)>0
   file='data/references/torah-observed-cues/'+rid+'.json.gz';b=gzip.compress(encode(v),compresslevel=9,mtime=0);outputs[file]=b
   cues=[w for w in v['words']if w['cue']];withheld={w['id']for w in bindings['words']if w['existingSourceWindow']is None};default=next((w for w in cues if w['id']in withheld),cues[0])
   records.append({'recordId':rid,'title':r['title'],'source':v['source'],'candidateCoverage':v['candidateCoverage'],'originalTimingSourceSha256':r['timingSource']['sha256'],'readerWords':len(v['words']),'agreedListeningCues':count,'wordsWithoutCue':len(v['words'])-count,'counts':v['counts'],'defaultReviewWordId':default['id'],'defaultReviewHebrew':default['hebrew'],'defaultReviewPoint':default['cue']['point'],'packet':{'file':file,'bytes':len(b),'sha256':sha(b)}})
  for control in shared_controls:
   original=raw_values[control['sha256']];assert original['identity']['recordId']is None and original['rawModelText']==control['rawModelText'];assert control['literalAnchorCount']==0
   if control['family']=='ctc':assert control['rawHebrewLetters']==''
  old_zero=json.loads(get('research/prior-failed-zero-control.json'));assert old_zero['rawModelText']=='בשֽר׃'
  report={'format':'tropetrain-torah-observed-cues-summary-v1','status':'unreviewed-listening-cues','sourcePack':{'file':str(PACK.relative_to(ROOT)),'bytes':len(raw),'sha256':PACK_SHA},'records':records,'readerWords':sum(r['readerWords']for r in records),'agreedListeningCues':sum(r['agreedListeningCues']for r in records),'wordsWithoutCue':sum(r['wordsWithoutCue']for r in records),'rules':rules,'models':shared_models,'controls':shared_controls,'priorFailedSilenceControl':old_zero['rawModelText'],'old807TimingGatesChanged':False,'acceptedWordTimes':None,'phonemes':None,'syllableAlignment':None,'musicalNotes':None,'newVoice':None,'review':None,'limits':'Sparse source-only research listening points, never heard onsets or word durations. Every overlapping observation retained; conflicting clocks withheld. Original text, accents and timing issues unchanged; frontend mismatch, failed chant-model silence control and training uncertainty retained. No independent pronunciation style or historical melody grammar is synthesized.'}
  outputs['docs/TORAH-OBSERVED-CUES.json']=encode(report);outputs['torah-observed-cues-summary.js']=('// Generated source-only research evidence; no approved word timings.\nexport const TORAH_OBSERVED_CUES='+json.dumps(report,ensure_ascii=False,separators=(',',':'))+';\n').encode()
 return outputs
outputs=generate()
if '--check'in sys.argv:
 for name,b in outputs.items():assert (ROOT/name).read_bytes()==b,name+' is stale'
else:
 for name,b in outputs.items():p=ROOT/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(b)
print('Source listening cues reproduced; unchanged marked words, original clocks, null boundaries and retained controls.')
