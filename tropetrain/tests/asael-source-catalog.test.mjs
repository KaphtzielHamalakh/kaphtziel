import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {ASAEL_SOURCE_CATALOG as catalog} from '../asael-source-catalog-data.js';
import {VOICE_STUDIES,VOICE_SOURCE_STUDIES,VOICE_SOURCE_RECORDINGS,voiceStudy,voiceRecording,voiceAudioRecord,voiceCoverage,restoreVoicePreferences} from '../voice-studies.js';
import {sourceCatalogPortions,sourceCatalogReadings} from '../asael-source-finder.js';
import {createWordTimingDraft} from '../word-timing-draft.js';
import {ReferenceAudioStore} from '../reference-audio-store.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url)),hash=b=>createHash('sha256').update(b).digest('hex');

test('all54primary parashah catalogs resolve their846Asael rows to licensed originals, including older redirected links',()=>{
  assert.deepEqual(catalog,JSON.parse(read('docs/ASAEL-SOURCE-CATALOG.json')));
  assert.equal(hash(read(catalog.sourcePack.file)),catalog.sourcePack.sha256);
  assert.equal(catalog.sources.length,55);assert.equal(catalog.rows.length,846);assert.equal(catalog.readings.length,651);
  assert.equal(new Set(catalog.rows.map(r=>r.canonicalFile)).size,820);
  assert.deepEqual(catalog.counts.explicitPronunciationLabels,{'אשכנזית':195,'ישראלית':647,'ישאלית':4});
  assert(catalog.rows.some(r=>r.fileLabel==='Ekev-3_hi_(Asael).ogg'&&r.canonicalFile.includes("'Ekev-3 Asael.oga")));
  for(const row of catalog.rows){
    const page=catalog.sources.find(p=>p.pageId===row.pageId),record=VOICE_SOURCE_RECORDINGS.find(r=>r.id===row.recordId);
    assert(page&&record);assert.equal(row.revision,page.revision);assert.equal(record.license.id,'CC-BY-SA-3.0');
    assert.equal(record.sourceCatalogRevision,row.revision);assert.equal(record.performer,'Asael (עשהאל)');
    assert.match(record.audio.sha1,/^[a-f0-9]{40}$/);assert(record.audio.bytes>0&&record.audio.estimatedDurationSeconds>0);
  }
});

test('each of five Torah book filters reaches its actual parashah entries and keeps related readings separate',()=>{
  assert.deepEqual(['gen','exo','lev','num','deu'].map(b=>sourceCatalogPortions(b).length),[12,11,10,10,11]);
  assert.equal(sourceCatalogPortions('invented').length,0);
  for(const portion of catalog.portions){
    const readings=sourceCatalogReadings(portion.id);assert(readings.length>0);
    for(const reading of readings){
      assert.equal(reading.portionId,portion.id);assert.equal(voiceStudy(reading.studyId).id,reading.studyId);
      for(const id of reading.sourceRowIds)assert(catalog.rows.some(row=>row.id===id));
    }
  }
  assert(catalog.readings.some(r=>r.name==='הפטרה'));assert(catalog.readings.some(r=>r.name.includes('כהן')));
  const final=catalog.portions.find(p=>p.id==='asael-parashah-2988');assert(sourceCatalogReadings(final.id).length===15);
  assert.equal(catalog.rows.filter(r=>r.pageId!==r.hostPageId).length,30);
  const special=catalog.recordings.filter(r=>r.sourceMelodyLabel==='אשכנזית לימים נוראים');assert.equal(special.length,2);
  for(const r of special){assert.equal(r.deliveryId,'ashkenazic-high-holiday-melody');assert.equal(voiceStudy(r.studyId).deliveries[0].id,r.deliveryId);assert.throws(()=>voiceRecording(r.studyId,r.pronunciationId,'ashkenazic-melody'));}

});

test('source table labels support exactly their recorded choices, with no borrowed Ashkenazic option or repaired exceptional spelling',()=>{
  for(const study of catalog.studies){
    assert.equal(study.deliveries.length,1);assert.equal(study.deliveries[0].kind,'chanted');
    const rowIds=catalog.readings.find(r=>r.studyId===study.id).sourceRowIds;
    const rows=rowIds.map(id=>catalog.rows.find(r=>r.id===id));
    assert.equal(study.pronunciations.length,rows.length);
    for(const p of study.pronunciations){const r=voiceRecording(study.id,p.id,study.deliveries[0].id);assert(rows.some(row=>row.recordId===r.id));}
    if(!rows.some(row=>row.pronunciationLabel==='אשכנזית'))assert.throws(()=>voiceRecording(study.id,'ashkenazic-as-recorded',study.deliveries[0].id));
    assert.throws(()=>voiceRecording(study.id,study.pronunciations[0].id,'spoken'));
  }
  for(const row of catalog.rows.filter(r=>r.pronunciationLabel==='ישאלית')){
    const r=VOICE_SOURCE_RECORDINGS.find(r=>r.id===row.recordId);assert.match(r.pronunciationId,/^source-spelling-/);
    assert.match(voiceStudy(r.studyId).pronunciations[0].name,/Unassigned/);
  }
});

test('missing and conflicting catalog ranges never assign Hebrew words, corrected passages, timing or phoneme evidence',()=>{
  const disputed=catalog.rows.find(r=>r.fileLabel==='Aa Genesis Bereshit-6 Asael.oga');assert.equal(disputed.passageNote,'ה,א-כד');
  for(const r of catalog.recordings){
    assert.equal(voiceCoverage(r),null);assert.equal(r.year,null);assert(r.sourceUploadYear>=2005);
    for(const field of ['coverage','timedWords','syllableAlignment','phonemes','musicalNotes','independentReview'])assert.equal(r[field],null);
    assert.throws(()=>createWordTimingDraft(r,voiceCoverage(r),[{sourceHebrew:'בְּרֵאשִׁ֖ית',id:'gen-1-1-1'}]),/source passage/);
  }
  assert.equal(voiceCoverage(VOICE_STUDIES.recordings.find(r=>r.id==='asael-2005-gen-opening-israeli')).end.chapter,2);
});

test('archive choices resolve original absolute URLs and restore separate source spans without adding instrument settings',()=>{
  const r=catalog.recordings.find(r=>r.sourcePronunciationLabel==='אשכנזית'),other=catalog.recordings.find(s=>s.studyId===r.studyId&&s.id!==r.id);
  const restored=restoreVoicePreferences({studyId:r.studyId,pronunciationId:r.pronunciationId,deliveryId:r.deliveryId,volume:0,repeat:false,
    spans:{[r.id]:{start:1,end:3},[other.id]:{start:2,end:4}}});
  assert.equal(restored.studyId,r.studyId);assert.deepEqual(restored.spans,{[r.id]:{start:1,end:3},[other.id]:{start:2,end:4}});
  assert.equal('transpose'in restored,false);assert.equal('melodyId'in restored,false);
  for(const original of catalog.recordings){
    const before=JSON.stringify(original),runtime=voiceAudioRecord(original,'https://kaphtziel.com/tropetrain/');
    assert.equal(runtime.audio.url,original.audio.file);assert.match(runtime.audio.url,/^https:\/\/upload\.wikimedia\.org\/wikipedia\/commons\//);
    assert.equal(runtime.audio.localFile,null);assert.equal(JSON.stringify(original),before);assert.equal(original.originalBytesVerifiedLocally,false);
  }
});

test('the original72recordings and their settings remain intact while the archive uses on-demand checksum verification',async()=>{
  assert.equal(VOICE_STUDIES.recordings.length,72);assert.equal(VOICE_SOURCE_STUDIES.length,655);assert.equal(VOICE_SOURCE_RECORDINGS.length,916);
  assert.deepEqual(VOICE_STUDIES,JSON.parse(read('docs/VOICE-STUDIES.json')));
  const original=catalog.recordings[0],record=voiceAudioRecord(original,'https://kaphtziel.com/tropetrain/');let fetched=0;
  const store=new ReferenceAudioStore({cache:{keys:async()=>[],get:async()=>null,put:async()=>{}},fetchFile:async()=>{fetched++;return{ok:true,arrayBuffer:async()=>new ArrayBuffer(10)};}});
  assert.equal(await store.has(record),false);assert.equal(fetched,0);
  await assert.rejects(store.load(record),/size differs/);assert.equal(await store.has(record),false);assert.equal(fetched,1);
});

test('normal and portable distributions expose the archive finder and retain source evidence while optional media is not preloaded',()=>{
  const normal=read('index.html').toString(),portable=read('TropeTrain.html').toString(),sw=read('sw.js').toString();
  for(const id of ['asael-source-finder','asael-source-book','asael-source-portion','asael-source-reading','asael-source-open','voice-study-catalog-note']){
    assert(normal.includes(`id="${id}"`));assert(portable.includes(`id="${id}"`));
  }
  assert(portable.includes('href="data:application/zip;base64,'+read(catalog.sourcePack.file).toString('base64')+'"'));
  assert(!sw.includes('upload.wikimedia.org'));assert.equal(catalog.counts.newAudioPayloadsBundled,0);
  assert.equal(catalog.counts.newWordTimings,0);assert.equal(catalog.counts.newReviewedSingingGrammars,0);
  assert(read('TropeTrain.html').length<100*1024*1024,'Portable build must fit GitHub regular-file limit.');
});
