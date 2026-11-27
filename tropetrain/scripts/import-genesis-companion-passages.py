"""Rebuild two unreviewed companion candidates; no source clock is inferred."""
from pathlib import Path
import gzip,hashlib,json,re,sys,zipfile
ROOT=Path(__file__).resolve().parent.parent
PACK='assets/voice-studies/genesis-companion-sources.zip'
PACK_SHA='380b5b8a69cb0d72edb6500a675527246f9a431d90381b83e62f7bdd31d4a625'
sha=lambda b:hashlib.sha256(b).hexdigest();encode=lambda v:(json.dumps(v,ensure_ascii=False,indent=2)+'\n').encode()
def generate():
 raw=(ROOT/PACK).read_bytes();assert sha(raw)==PACK_SHA
 with zipfile.ZipFile(ROOT/PACK)as z:
  manifest=json.loads(z.read('manifest.json'));carrier=z.read(manifest['carrier']['file']);assert len(carrier)==manifest['carrier']['bytes']and sha(carrier)==manifest['carrier']['sha256'];shared=json.loads(carrier);assert shared['format']=='tropetrain-lossless-utf8-files-v1';files={n:t.encode('utf-8')for n,t in shared['files'].items()}
  assert len(files)==43
  for r in manifest['files']:assert len(files[r['file']])==r['bytes']and sha(files[r['file']])==r['sha256']
  for r in manifest['supportFiles']:
   b=z.read(r['file']);assert len(b)==r['bytes']and sha(b)==r['sha256']
 derivation=json.loads(files['derivation.json']);discovery=json.loads(files['research/GENESIS-CONTENT-DISCOVERY.json']);plan=json.loads(files['research/GENESIS-DISCOVERY-PLAN.json'])
 assert sha(files['research/GENESIS-DISCOVERY-PLAN.json'])==derivation['discoveryPlanSha256']==discovery['planSha256']=='1901832fa36fa7aa38543f7e70fabed0a7b968b723738f941574a0107600d709'
 assert sha(files['research/GENESIS-CONTENT-DISCOVERY.json'])==derivation['discoverySha256']and discovery['sourceCorpusWords']==79985
 assert derivation['counts']['audioDecoderRuns']==0 and derivation['counts']['newApprovedWordTimes']==0 and derivation['counts']['newSingingVoices']==0
 catalog_raw=(ROOT/'docs/ASAEL-SOURCE-CATALOG.json').read_bytes();old_raw=(ROOT/'docs/ASAEL-GENESIS-PASSAGES.json').read_bytes();assert sha(catalog_raw)==derivation['originalCatalogSha256']and sha(old_raw)==derivation['oldPassageReportSha256'];catalog=json.loads(catalog_raw);old={r['recordId']:r for r in json.loads(old_raw)['records']};rows={r['id']:r for r in catalog['rows']}
 assert sha((ROOT/derivation['oldSourcePack']['file']).read_bytes())==derivation['oldSourcePack']['sha256']
 primary=next(p for p in json.loads(files['primary/companions-00.json'])['query']['pages']if p.get('pageid')==383716);assert primary['revisions'][0]['revid']==1006289;text=primary['revisions'][0]['slots']['main']['content'];values=dict(zip('אבגדהוזחטיכלמנסעפצקרשת',[1,2,3,4,5,6,7,8,9,10,20,30,40,50,60,70,80,90,100,200,300,400]));number=lambda t:sum(values[c]for c in t)
 gen_raw=(ROOT/'data/torah/gen.json').read_bytes();gen=json.loads(gen_raw);outputs={};records=[]
 expected={'asael-catalog-2460-26':('שלישי','רביעי',372),'asael-catalog-2460-33':('רביעי','חמישי',285)}
 assert {r['recordId']for r in derivation['records']}==set(expected)
 for r in derivation['records']:
  rid=r['recordId'];before=old[rid];row=rows[rid];heading,next_heading,count=expected[rid];assert before['readerCoverage']is None and before['review']is None and before['correctedCoverage']is None;assert row['passageNote']==r['originalCatalogPassageNote']and row['section']==[heading]
  assert all(r[k]==before[k]for k in ['sourceCatalogRow','sourceCatalogRevision','sourceFileRevision','originalUrl','filename','bytes','sha1','sha256','decodedDurationSeconds','pronunciationId','deliveryId','performer','license'])
  section=text.split('=='+heading+'==',1)[1].split('=='+next_heading+'==',1)[0];refs=[('gen',number(c),number(v))for c,v in re.findall(r'\{\{מקרא ותרגום ורש"י\|בראשית\|([^{}|]+)\|([^{}|]+)\}\}',section)];assert list(refs[0])==r['companion']['firstSourceReference']and list(refs[-1])==r['companion']['lastSourceReference'];assert len(refs)==(27 if count==372 else 21)
  binding_raw=files['bindings/'+rid+'.json'];assert sha(binding_raw)==r['readerBindingsSha256'];binding=json.loads(binding_raw);words=[{'id':w['id'],'hebrew':w['sourceHebrew']}for c in gen['chapters']for v in c['verses']if('gen',c['number'],v['number'])in refs for w in v['tokens']if w['kind']in ['w','q']];assert words==binding['words']and len(words)==count==r['candidateWords'];assert binding['coverage']==r['candidateCoverage']and binding['editionCompared']is False and binding['acceptedTimes']is None
  obs=next(x for x in discovery['records']if x['recordId']==rid);gate=obs['admission'];assert gate==r['contentGate']and gate['passesPredeclaredReviewCandidateGate'];assert gate['insideCandidate']>=3 and gate['distinctCandidateVerses']>=3 and gate['fractionInside']>=.9 and gate['firstHalf']and gate['lastHalf'];assert sha(files['old-observations/'+rid+'.json'])==r['sourceObservationSha256']
  for k in ['actualRecordingCoverage','acceptedWordTimes','phonemes','musicalReview','phonologicalReview','review','newVoice']:assert r[k]is None
  assert r['sourceEditionCompared']is False and r['pronunciationId']=='israeli-as-recorded'
  file='data/references/genesis-companion-bindings/'+rid+'.json.gz';packed=gzip.compress(binding_raw,compresslevel=9,mtime=0);outputs[file]=packed;records.append({**r,'readerBindingsPacket':{'file':file,'bytes':len(packed),'sha256':sha(packed)}})
 assert {r['recordId']for r in derivation['withheldRecords']}=={'asael-catalog-2460-25','asael-catalog-2460-32','asael-catalog-2460-39','asael-catalog-2460-40'}
 report={**derivation,'records':records,'sourcePack':{'file':PACK,'bytes':len(raw),'sha256':PACK_SHA,'logicalFiles':43},'inputs':[{'path':PACK,'sha256':PACK_SHA},{'path':'docs/ASAEL-SOURCE-CATALOG.json','sha256':sha(catalog_raw)},{'path':'docs/ASAEL-GENESIS-PASSAGES.json','sha256':sha(old_raw)},{'path':'data/torah/gen.json','sha256':sha(gen_raw)}]}
 outputs['docs/GENESIS-COMPANION-PASSAGES.json']=encode(report);outputs['genesis-companion-passage-data.js']=('// Generated from pinned companion text and old source-only observations. No word times or review.\nexport const GENESIS_COMPANION_PASSAGES='+json.dumps(report,ensure_ascii=False,separators=(',',':'))+';\n').encode();return outputs,report
if __name__=='__main__':
 outputs,report=generate()
 for name,raw in outputs.items():
  p=ROOT/name
  if '--check'in sys.argv:assert p.read_bytes()==raw,name
  else:p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(raw)
 print(json.dumps(report['counts']))
