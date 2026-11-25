"""Rebuild documented recording candidates and unreviewed support from pinned evidence."""
from pathlib import Path
import json,hashlib,zipfile,gzip,sys
ROOT=Path(__file__).resolve().parent.parent
PACK=ROOT/'assets/voice-studies/asael-genesis-passage-sources.zip'
PIN='644f57d6ebab54043fabb79fd3446620c249b1cbddac45d2f2718256fecb79dd'
sha=lambda b:hashlib.sha256(b).hexdigest()
raw=PACK.read_bytes();assert sha(raw)==PIN
catalog_bytes=(ROOT/'docs/ASAEL-SOURCE-CATALOG.json').read_bytes();catalog=json.loads(catalog_bytes)
with zipfile.ZipFile(PACK)as z:
 manifest=json.loads(z.read('manifest.json'))
 for r in manifest['files']:
  b=z.read(r['file']);assert len(b)==r['bytes']and sha(b)==r['sha256'],r['file']
 pins=json.loads(z.read('verified-originals.json'));assert pins['sourceCatalogSha256']==sha(catalog_bytes)
 clocks={r['recordId']:r for r in json.loads(z.read('decoded-original-clocks.json'))}
 summaries={r['recordId']:r for r in json.loads(z.read('alignment-summary.json'))}
 source_records={r['id']:r for r in catalog['recordings']};rows={r['id']:r for r in catalog['rows']}
 allowed={'asael-catalog-2460-17':'ב,ד-יט','asael-catalog-2460-18':'ב,ד-יט','asael-catalog-2460-53':'ה,כה-ו,ח','asael-catalog-2460-54':'ה,כה-ו,ח'}
 discrepancies={'שלישי':'The catalog states Genesis 2:20–4:21, while an unreviewed recognizer ending resembles Genesis 3:21. The discrepancy is unresolved; no corrected passage is assigned.',
 'רביעי':'The catalog states Genesis 4:22–5:18, while an unreviewed recognizer ending resembles Genesis 4:18. The discrepancy is unresolved; no corrected passage is assigned.',
 'חמישי':'The catalog states Genesis 5:19–26, while an unreviewed recognizer ending resembles Genesis 4:26. The discrepancy is unresolved; no corrected passage is assigned.'}
 records=[];support_records=[];packets={}
 for pin in pins['records']:
  rid=pin['recordId'];original=source_records[rid];row=rows[rid];clock=clocks[rid];binding_bytes=z.read('bindings/'+rid+'.json');binding=json.loads(binding_bytes);proposal_bytes=z.read('research/'+rid+'-word-support.json');proposal=json.loads(proposal_bytes)
  assert row==pin['catalogRow']and original['sourceCatalogRow']==rid and original['audio']['sha1']==pin['sha1']and original['audio']['bytes']==pin['bytes']and original['audio']['file']==pin['originalUrl']
  assert original['license']['id']=='CC-BY-SA-3.0'and row['performerLabel']=='עשהאל'and row['melodyLabel']=='אשכנזית'
  assert clock['originalSha256']==pin['sha256']and proposal['source']['sha256']==pin['sha256']and proposal['source']['duration']==clock['originalDecodedDuration']
  assert proposal['coverage']==binding['coverage']and proposal['sourceEditionCompared']is False and proposal['sourcePassageStatus']=='catalog-candidate-not-content-reviewed'
  assert[(w['id'],w['hebrew'])for w in proposal['words']]==[(w['id'],w['hebrew'])for w in binding['words']]
  for key in ['timedWords','syllableAlignment','phonemes','musicalNotes','independentReview']:assert proposal[key]is None
  assert all(w['approvedBoundary']is None and w['review']is None for w in proposal['words'])
  candidate=rid in allowed
  if candidate:assert row['passageNote']==allowed[rid]and row['section']in [['שני'],['שביעי']]
  else:assert row['section'][0]in discrepancies
  record={'recordId':rid,'studyId':original['studyId'],'sourceCatalogRow':rid,'sourceCatalogRevision':row['revision'],'sourceFileRevision':original['sourceFileRevision'],'sourceUrl':original['sourceUrl'],'originalUrl':original['audio']['file'],'filename':original['audio']['filename'],'bytes':pin['bytes'],'sha1':pin['sha1'],'sha256':pin['sha256'],'decodedDurationSeconds':clock['originalDecodedDuration'],'catalogDurationSeconds':clock['catalogDuration'],'performer':original['performer'],'pronunciationId':original['pronunciationId'],'deliveryId':original['deliveryId'],'sourcePronunciationLabel':row['pronunciationLabel'],'sourceMelodyLabel':row['melodyLabel'],'license':original['license'],'catalogPassageNote':row['passageNote'],'catalogProposedRange':binding['coverage'],'readerCoverage':binding['coverage']if candidate else None,'readerWords':len(binding['words'])if candidate else None,'readerBindingsSha256':sha(binding_bytes),'status':'unreviewed-catalog-passage-candidate'if candidate else'withheld-catalog-acoustic-discrepancy','discrepancy':None if candidate else discrepancies[row['section'][0]],'correctedCoverage':None,'sourceEditionCompared':False,'timedWords':None,'phonemes':None,'musicalNotes':None,'review':None,'voice':None}
  records.append(record)
  if candidate:
   b=gzip.compress(proposal_bytes,compresslevel=9,mtime=0);file='data/references/asael-word-support/'+rid+'.json.gz';packets[file]=b
   support_records.append({'recordId':rid,'file':file,'bytes':len(b),'sha256':sha(b),'words':len(proposal['words']),'originalSha256':pin['sha256']})
 assert len(records)==10 and len(support_records)==4 and sum(r['words']for r in support_records)==866
 pack={'file':str(PACK.relative_to(ROOT)),'bytes':len(raw),'sha256':PIN}
 inputs=[{'path':pack['file'],'sha256':PIN},{'path':'docs/ASAEL-SOURCE-CATALOG.json','sha256':sha(catalog_bytes)}]
 report={'schema':'tropetrain-asael-genesis-passages-v1','revision':1,'retrieved':'2026-11-25','status':'documentary-candidates-and-explicit-discrepancies','sourcePack':pack,'inputs':inputs,'counts':{'additionalOriginalsVerified':10,'originalBytesVerified':sum(r['bytes']for r in records),'readerCandidateRecordings':4,'readerCandidatePassages':2,'readerCandidateWordOccurrences':866,'withheldDiscrepantRecordings':6,'newBundledAudio':0,'newApprovedWordTimes':0,'newReviewedPronunciationGrammars':0,'newSingingVoices':0},'records':records,'previouslyUnresolvedRows':[{'recordId':rid,'catalogPassageNote':rows[rid]['passageNote'],'readerCoverage':None,'correctedCoverage':None,'status':'unchanged-unresolved-source-range'}for rid in ['asael-catalog-2460-46','asael-catalog-2460-47']],'catalogLicense':catalog['catalogLicense'],'attribution':catalog['attribution'],'limits':['A source catalog label is documentary evidence, not musical, phonetic or content review.','Only two explicitly stated passage candidates are exposed beside the reader; all source discrepancies remain withheld, without corrected ranges.','Automatic recognizer output never replaces Hebrew or certifies a source correction. A finite forced path does not prove coverage.','Each unchanged source keeps its own voice, clock, melody and pronunciation. Text styles, instrument settings and personal timing drafts are independent.'],'acceptedSourceEditionComparison':None,'acceptedWordTimes':None,'phonemes':None,'musicalReview':None,'newVoice':None,'kinnorEquivalence':None}
 model=json.loads(z.read('research/'+support_records[0]['recordId']+'-word-support.json'))['model']
 support_report={'format':'tropetrain-asael-genesis-word-support-catalog-v1','revision':1,'status':'unreviewed-model-support','retrieved':'2026-11-25','records':support_records,'sourcePack':pack,'inputs':inputs,'model':model,'diagnostics':{r['recordId']:{k:v for k,v in summaries[r['recordId']].items()if k in ['CER','WER','allDirect','noDirect']}for r in support_records},'withheldRecordings':[r['recordId']for r in records if r['readerCoverage']is None],'purpose':'Optional one-second-context audition and manual review of catalog passage candidates. No word boundaries are filled or certified.','review':None,'newSingingVoice':None}
 outputs={'docs/ASAEL-GENESIS-PASSAGES.json':(json.dumps(report,ensure_ascii=False,indent=2)+'\n').encode(),'docs/ASAEL-GENESIS-WORD-SUPPORT.json':(json.dumps(support_report,ensure_ascii=False,indent=2)+'\n').encode(),'asael-genesis-passage-data.js':('// Generated from pinned documentary source evidence.\nexport const ASAEL_GENESIS_PASSAGES='+json.dumps(report,ensure_ascii=False,separators=(',',':'))+';\n').encode(),'asael-genesis-word-support-summary.js':('// Generated from pinned unreviewed acoustic evidence.\nexport const ASAEL_GENESIS_WORD_SUPPORT='+json.dumps(support_report,ensure_ascii=False,separators=(',',':'))+';\n').encode(),**packets}
 for n,b in outputs.items():
  p=ROOT/n
  if '--check'in sys.argv:assert p.read_bytes()==b,n
  else:p.parent.mkdir(exist_ok=True,parents=True);p.write_bytes(b)
print('Verified ten unchanged originals; four candidate reader recordings/866 word-support entries, six discrepancies withheld; no approved timings or voice.')
