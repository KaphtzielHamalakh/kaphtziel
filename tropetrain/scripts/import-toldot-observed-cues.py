"""Verify pinned source-linked Toldot reading and sparse, unreviewed listening cues."""
from pathlib import Path
import json,hashlib,zipfile,gzip,re,sys,collections
ROOT=Path(__file__).resolve().parent.parent;PACK=ROOT/'assets/voice-studies/toldot-observed-cues-sources.zip';PACK_SHA='4325eacead2b8d2b7d4bf592f5215e7a3f9eca58332d07ba3cf03d15a0502db8';sha=lambda b:hashlib.sha256(b).hexdigest();encode=lambda v:(json.dumps(v,ensure_ascii=False,indent=2)+'\n').encode()
def generate():
 raw=PACK.read_bytes();assert sha(raw)==PACK_SHA
 with zipfile.ZipFile(PACK)as z:
  m=json.loads(z.read('manifest.json'))
  for item in m['files']:
   b=z.read(item['file']);assert len(b)==item['bytes']and sha(b)==item['sha256']
  v=json.loads(z.read('observed-cues.json'));e=json.loads(z.read('candidate-evidence.json'));bindings=json.loads(z.read('reader-bindings.json'));pages={p['pageid']:p for p in json.loads(z.read('primary/reading-divisions.json'))['query']['pages']if'missing'not in p};primary=pages[383721];assert primary['revisions'][0]['revid']==1006294
  section=primary['revisions'][0]['slots']['main']['content'].split('==ששי==',1)[1].split('==שביעי==',1)[0];values=dict(zip('אבגדהוזחטיכלמנסעפצקרשת',[1,2,3,4,5,6,7,8,9,10,20,30,40,50,60,70,80,90,100,200,300,400]));number=lambda s:sum(values[c]for c in s);refs=[['gen',number(c),number(d)]for c,d in re.findall(r'\{\{מקרא ותרגום ורש"י\|בראשית\|([^|{}]+)\|([^|{}]+)\}\}',section)];assert refs==e['companionText']['explicitReferences']and len(refs)==23
  for name in ['primary/commons-original.json','primary/commons-recheck.json']:
   pages_value=json.loads(z.read(name))['query']['pages'];page=(pages_value[0]if isinstance(pages_value,list)else next(iter(pages_value.values())));i=page['imageinfo'][0];assert i['sha1']==v['source']['sha1']and i['size']==v['source']['bytes']and i['extmetadata']['LicenseShortName']['value']=='CC BY-SA 3.0'
  assert v['recordId']==e['recordId']=='asael-catalog-183403-30';assert v['candidateCoverage']==e['candidateCoverage'];assert v['source']['sha256']==e['originalSha256'];assert v['source']['duration']==278.82521541950115
  assert len(v['words'])==len(bindings['words'])==358;assert [(w['id'],w['hebrew'])for w in v['words']]==[(w['id'],w['hebrew'])for w in bindings['words']]
  assert v['actualRecordingCoverage']is None and v['sourceEditionCompared']is False and v['sourceClockFitted']is False
  for k in ['timedWords','syllableAlignment','phonemes','musicalNotes','independentReview','acceptedWordTimes','newVoice']:assert v[k]is None
  rules=v['rules'];assert rules['minimumExactBlockLetters']==12 and rules['minimumFullyCoveredWords']==3 and rules['maximumClockDisagreementSeconds']==.75 and rules['contextSecondsEachSide']==2 and rules['minimumPointActivityRmsDbfs']==-55 and rules['wordDurationInferred']is False and rules['boundaryAutofill']is False;assert rules['knownPassageSuppliedToEitherDecoder']is False
  ctc=json.loads(z.read('research/ctc.json'));wh=json.loads(z.read('research/whisper.json'));zero=json.loads(z.read('research/silence-control.json'));assert ctc['expectedTranscript']is None and ctc['recognitionPrompt']is None and ctc['languageModel']is None and wh['expectedTranscript']is None and wh['recognitionPrompt']is None and wh['knownPassageSentToDecoder']is False;assert zero['rawModelText']==v['negativeControl']['rawModelText']=='בשֽר׃'and v['negativeControl']['directRecognizerControlFailed']is True and v['negativeControl']['agreementCuesPassed']==0
  count=0
  for w in v['words']:
   assert w['approvedBoundary']is None and w['review']is None
   if w['cue']is None:assert w['withheldReason'];continue
   c=w['cue'];assert w['withheldReason']is None;assert c['wordStart']is None and c['wordEnd']is None and c['review']is None;assert c['point']==c['ctc']['point'];assert abs(c['ctc']['point']-c['whisper']['point'])==c['clockDifferenceSeconds']<=.75;assert c['localSignal']['rmsDbfs']>=-55 and c['localSignal']['speechOrPhonemeConfirmed']is False;assert c['context']=={'start':max(0,c['point']-2),'end':min(v['source']['duration'],c['point']+2)}
   for model in ['ctc','whisper']:
    o=c[model];assert o['wordId']==w['id']and o['hebrew']==w['hebrew'];x=o['exactContext'];assert x['letters']>=12 and x['fullWords']>=3 and x['someEightLetterContextUniqueAcrossWholeTorah']is True
   count+=1
  assert count==3;assert [w['id']for w in v['words']if w['cue']]==['gen-28-4-2','gen-28-4-3','gen-28-4-4']
  pack={'file':str(PACK.relative_to(ROOT)),'bytes':len(raw),'sha256':PACK_SHA};data=gzip.compress(encode(v),compresslevel=9,mtime=0);file='data/references/toldot-observed-cues/asael-catalog-183403-30.json.gz'
  report={**e,'schema':'tropetrain-toldot-observed-cues-summary-v1','studyId':'asael-source-183403-fa76baa698','sourcePack':pack,'packet':{'file':file,'bytes':len(data),'sha256':sha(data)},'source':v['source'],'defaultReviewWordId':'gen-28-4-4','readerWords':358,'agreedListeningCues':3,'wordsWithoutCue':355,'rules':rules,'models':v['models'],'negativeControl':v['negativeControl'],'timedWords':None,'phonemes':None,'syllableAlignment':None,'musicalNotes':None,'independentReview':None,'acceptedWordTimes':None,'newVoice':None,'musicalReview':None,'phonologicalReview':None,'kinnorEquivalence':None,'limits':v['limits']}
  return {file:data,'docs/TOLDOT-OBSERVED-CUES.json':encode(report),'toldot-observed-cues-summary.js':('// Generated source evidence; sparse listening cues, never word extents.\nexport const TOLDOT_OBSERVED_CUES='+json.dumps(report,ensure_ascii=False,separators=(',',':'))+';\n').encode()}
outputs=generate()
if '--check'in sys.argv:
 for name,b in outputs.items():assert (ROOT/name).read_bytes()==b,name+' is stale'
else:
 for name,b in outputs.items():p=ROOT/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(b)
print('Toldot observed cues:358unchanged candidate words;3listening cues;355withheld;0approved boundaries.')
