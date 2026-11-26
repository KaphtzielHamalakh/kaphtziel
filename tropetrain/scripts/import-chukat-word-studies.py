"""Rebuild source-linked reader candidates and unreviewed per-original word support."""
from pathlib import Path
import collections,gzip,hashlib,json,re,sys,zipfile
ROOT=Path(__file__).resolve().parent.parent;PACK=ROOT/'assets/voice-studies/chukat-word-sources.zip';PACK_SHA='76605ca188a61f38a7957077f8b6063528ad153efc71262779816e77ab326923';sha=lambda b:hashlib.sha256(b).hexdigest()

def generate():
 b=PACK.read_bytes();assert sha(b)==PACK_SHA;source_pack={'file':str(PACK.relative_to(ROOT)),'bytes':len(b),'sha256':PACK_SHA};catalog=json.loads((ROOT/'docs/SOURCE-READERS.json').read_text());originals={r['id']:r for r in catalog['recordings']};outputs={}
 with zipfile.ZipFile(PACK)as z:
  manifest=json.loads(z.read('manifest.json'))
  for item in manifest['files']:
   raw=z.read(item['file']);assert len(raw)==item['bytes']and sha(raw)==item['sha256']
  assert b'license: apache-2.0'in z.read('research/model-card.md');evidence=json.loads(z.read('candidate-evidence.json'));assert evidence['actualRecordingCoverage']is None and evidence['directNumericRecordingCaption']is None and evidence['sourceEditionCompared']is False
  pages={p.get('pageid'):p for p in json.loads(z.read('primary/reading-divisions.json'))['query']['pages']if'missing'not in p};primary=pages[383749];section=primary['revisions'][0]['slots']['main']['content'].split('==ראשון==',1)[1].split('==שני==',1)[0];values=dict(zip('אבגדהוזחטיכלמנסעפצקרשת',[1,2,3,4,5,6,7,8,9,10,20,30,40,50,60,70,80,90,100,200,300,400]));number=lambda s:sum(values[c]for c in s);refs=[{'chapter':number(c),'verse':number(v)}for c,v in re.findall(r'\{\{מקרא ותרגום ורש"י\|במדבר\|([^|{}]+)\|([^|{}]+)\}\}',section)];assert refs==evidence['explicitFirstReadingVerseReferences']==[{'chapter':19,'verse':v}for v in range(1,18)];assert evidence['candidateCoverage']=={'bookId':'num','start':refs[0],'end':refs[-1]};assert primary['revisions'][0]['revid']==1006441
  records=[];all_words=None;gaps=0;independent=0
  for item in evidence['recordings']:
   rid=item['recordId'];original=originals[rid];assert original['coverage']is None and item['directNumericRecordingNote']is None and item['actualRecordingBoundsConfirmed']is False;assert original['sourceCatalogRevision']==item['sourceCatalogRevision']==2898409
   raw=z.read('proposals/'+rid+'.json');value=json.loads(raw);bindings=json.loads(z.read('bindings/'+rid+'.json'));obs=json.loads(z.read('research/'+rid+'/unprompted-greedy.json'));discovery=json.loads(z.read('research/'+rid+'/content-anchors.json'))
   assert value['format']=='tropetrain-word-support-v1'and value['status']=='unreviewed-model-support'and value['sourcePassageStatus']=='linked-reading-candidate-not-content-reviewed'and value['sourceEditionCompared']is False
   assert obs['expectedTranscript']is None and obs['recognitionPrompt']is None and obs['languageModel']is None and discovery['scope']['readerBooks']==5 and discovery['scope']['readerWords']==79985;assert discovery['topSourceChapters'][0]['bookId']=='num'and discovery['topSourceChapters'][0]['chapter']==19
   assert value['source']=={'id':rid,'bytes':original['audio']['bytes'],'sha1':original['audio']['sha1'],'sha256':original['audio']['sha256'],'duration':original['audio']['estimatedDurationSeconds']};assert value['coverage']==bindings['coverage']==evidence['candidateCoverage'];assert value['inputs']['unpromptedObservationSha256']==sha(z.read('research/'+rid+'/unprompted-greedy.json'))
   assert value['model']=={'id':'imvladikon/wav2vec2-large-xlsr-53-hebrew','revision':'3dd308dda70b20507a6920b459052635973ae3cd','weightSha256':'ccb343830f577a24d1c7aa866a459ac93fbc00bd205abb1b90728cf1f767e0da','license':'Apache-2.0'}
   for k in['timedWords','syllableAlignment','phonemes','musicalNotes','independentReview']:assert value[k]is None
   assert len(value['words'])==len(bindings['words'])==255;words=[{'id':w['id'],'hebrew':w['hebrew']}for w in value['words']];assert words==[{'id':w['id'],'hebrew':w['hebrew']}for w in bindings['words']]
   if all_words is None:all_words=words
   else:assert words==all_words
   end=0
   for w in value['words']:
    assert w['approvedBoundary']is None and w['review']is None;span=w['modelSupport'];assert end<=span['start']<span['end']<=original['audio']['estimatedDurationSeconds'];end=span['end'];assert 0<=w['evidence']['lettersWithArgmaxSupport']<=w['evidence']['targetLetters'];gaps+=w['evidence']['lettersWithArgmaxSupport']==0;independent+=w['evidence']['independentWholeTorahGreedyLiteralWordAnchor']
   data=gzip.compress(raw,compresslevel=9,mtime=0);file='data/references/chukat-word-support/'+rid+'.json.gz';outputs[file]=data;records.append({'recordId':rid,'file':file,'bytes':len(data),'sha256':sha(data),'words':255,'originalSha256':original['audio']['sha256'],'wordsWithoutDirectLetterSupport':value['diagnostics']['wordsWithNoArgmaxSupportedLetters'],'independentLiteralWordAnchors':value['diagnostics']['independentWholeTorahLiteralWordAnchors']})
  assert len(records)==5 and len({r['recordId']for r in records})==5 and gaps==56 and independent==141
  passages={**evidence,'sourcePack':source_pack,'defaultReviewWordId':'num-19-4-13','readerWords':255,'status':'linked-reading-candidate-not-content-reviewed','counts':{'recordings':5,'readerWords':255,'confirmedRecordingBounds':0,'acceptedWordTimes':0,'newReviewedGrammars':0,'newVoices':0}}
  summary={'format':'tropetrain-chukat-word-support-v1','revision':1,'status':'unreviewed-model-support','records':records,'sourcePack':source_pack,'model':value['model'],'counts':{'recordings':5,'readerWordsPerCandidate':255,'modelIntervals':1275,'independentExactWordObservations':141,'independentDistinctWords':80,'wordsWithoutDirectLetterSupport':gaps,'acceptedWordTimes':0,'newReviewedMelodyGrammars':0,'newSingingVoices':0},'sourcePassageStatus':'linked-reading-candidate-not-content-reviewed','sourceEditionCompared':False,'review':None,'newSingingVoice':None,'limits':'Primary companion text explicitly lists this reading; exact recording bounds/edition stay unreviewed. Unprompted source recognition supports Numbers19as a chapter; subsequent constrained255word paths are hypotheses, not proof all words occur or physical boundaries. Every original keeps its own clock and initially blank personal draft.'}
  outputs['docs/CHUKAT-SOURCE-PASSAGES.json']=(json.dumps(passages,ensure_ascii=False,indent=2)+'\n').encode();outputs['docs/CHUKAT-WORD-SUPPORT.json']=(json.dumps(summary,ensure_ascii=False,indent=2)+'\n').encode();outputs['chukat-passage-data.js']=('// Generated source-linked reader candidates; actual recording coverage remains null.\nexport const CHUKAT_SOURCE_PASSAGES='+json.dumps(passages,ensure_ascii=False,separators=(',',':'))+';\n').encode();outputs['chukat-word-support-summary.js']=('// Generated unreviewed, source-specific listening support.\nexport const CHUKAT_WORD_SUPPORT='+json.dumps(summary,ensure_ascii=False,separators=(',',':'))+';\n').encode()
 return outputs,summary['counts']

if __name__=='__main__':
 outputs,counts=generate()
 for n,b in outputs.items():
  p=ROOT/n
  if '--check'in sys.argv:assert p.read_bytes()==b,n+' differs from pinned source evidence.'
  else:p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(b)
 print(json.dumps(counts))
