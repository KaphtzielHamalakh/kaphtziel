import test from 'node:test';import assert from 'node:assert/strict';import{readFileSync}from'node:fs';import{createHash}from'node:crypto';import{execFileSync}from'node:child_process';
import{SOURCE_READERS as c,readerCatalogPortions,readerCatalogReadings}from'../source-readers.js';
import{VOICE_SOURCE_RECORDINGS,VOICE_SOURCE_STUDIES,VOICE_FEATURED_STUDIES,voiceStudy,voiceRecording,voiceChoices,voiceCombinations,voiceCoverage,restoreVoicePreferences}from'../voice-studies.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url)),sha=b=>createHash('sha256').update(b).digest('hex'),featured=c.featuredStudyId,pairs=()=>voiceCombinations(featured);

test('additional readers are reproducible from exact primary tables, per-file metadata and native clock evidence',()=>{
 assert.deepEqual(c,JSON.parse(read('docs/SOURCE-READERS.json')));assert.equal(read(c.sourcePack.file).length,c.sourcePack.bytes);assert.equal(sha(read(c.sourcePack.file)),c.sourcePack.sha256);assert.equal(sha(read(c.catalogSourcePack)),c.catalogSourceSha256);
 execFileSync('python3',['scripts/import-source-readers.py','--check']);
 assert.deepEqual(c.counts,{catalogRows:281,sourceReadings:277,canonicalFiles:267,newRecordingReferences:266,portions:27,books:5,readerLabels:18,melodyLabels:14,licenseFiles:{'CC BY 2.5':35,'Public domain':6,'CC BY-SA 3.0':176,'CC BY-SA 4.0':43,CC0:7},verifiedOriginals:6,newBundledAudio:0,newAcceptedWordTimes:0,newReviewedMelodyGrammars:0,newSingingVoices:0});
 assert.equal(new Set(c.files.map(f=>f.canonicalFile)).size,267);assert.equal(new Set(c.rows.map(r=>r.id)).size,281);
 for(const row of c.rows){assert(row.hostRevision>0&&row.sourceRevision>0&&row.line>0);assert(row.sourceUrl.endsWith('oldid='+row.sourceRevision));assert(c.files.some(f=>f.canonicalFile===row.canonicalFile&&f.recordId===row.recordId));assert(voiceStudy(row.studyId).recordingIds.includes(row.recordId));}
});

test('all 917 accepted original records retain exact values, IDs, source clocks, coverage and order',()=>{
 assert.equal(sha(JSON.stringify(VOICE_SOURCE_RECORDINGS.slice(0,917))),'d22dc8f3b930fa0707fb1302001ce138ac1b3d24c314d63b85fed57073feb981');
 assert.equal(VOICE_SOURCE_RECORDINGS.length,1183);assert.equal(VOICE_SOURCE_STUDIES.length,933);assert.equal(VOICE_FEATURED_STUDIES.length,7);
 assert.equal(new Set(VOICE_SOURCE_RECORDINGS.map(r=>r.id)).size,1183);assert.equal(new Set(VOICE_SOURCE_STUDIES.map(s=>s.id)).size,933);
 const itamar=VOICE_SOURCE_RECORDINGS.find(r=>r.id==='itamar-genesis-2-4-19');assert(c.rows.some(row=>row.recordId===itamar.id));assert(!c.recordings.some(r=>r.id===itamar.id));
});

test('five actual Chukat performances are reachable across the disconnected source matrix without a substitute pair',()=>{
 const s=voiceStudy(featured);assert.equal(pairs().length,5);assert.equal(s.deliveries.length,5);assert.equal(s.pronunciations.length,2);
 const a=pairs().find(p=>voiceRecording(featured,p.pronunciationId,p.deliveryId).sourceMelodyLabel==='אשכנזי'),first=pairs()[0];
 assert.notEqual(first.pronunciationId,a.pronunciationId);assert(voiceChoices(featured,first.pronunciationId,first.deliveryId).deliveries.find(d=>d.id===a.deliveryId).disabled);
 assert.throws(()=>voiceRecording(featured,first.pronunciationId,a.deliveryId),/unavailable/);assert.throws(()=>voiceRecording(featured,a.pronunciationId,first.deliveryId),/unavailable/);
 for(const p of pairs()){const r=voiceRecording(featured,p.pronunciationId,p.deliveryId);assert.equal(r.id,p.id);assert.equal(voiceCombinations(featured).find(x=>x.id===r.id).name,p.name);}
});

test('source pronunciation conflict, creator attribution, PD dedication and five independent clocks stay explicit',()=>{
 const records=pairs().map(p=>voiceRecording(featured,p.pronunciationId,p.deliveryId));assert.deepEqual(records.map(r=>r.sourceMelodyLabel),['ספרדי-ירושלמי','ספרדי-מרוקאית','ספרדי-טורקית','אשכנזי','ספרדי-פורטוגזית']);
 const conflict=records.find(r=>r.sourceMelodyLabel==='אשכנזי');assert.equal(conflict.sourcePronunciationLabel,'מעורב');assert(conflict.sourceLabelConflict.includes('MAM catalog says מעורב'));assert(conflict.sourceLabelConflict.includes('Commons description says Ashkenazi'));
 assert.equal(new Set(records.map(r=>r.audio.sha256)).size,5);assert.equal(new Set(records.map(r=>r.audio.estimatedDurationSeconds)).size,5);
 for(const r of records){assert.equal(r.catalogReaderLabel,'Nombody');assert.equal(r.creatorAttribution,'Joshua Hosseinof');assert.equal(r.license.id,'Public domain · PD-self');assert.equal(r.license.url,'https://commons.wikimedia.org/wiki/Template:PD-self');assert(r.originalBytesVerifiedLocally);assert.equal(r.audio.estimatedDurationSeconds,r.nativeDecode.frames/r.nativeDecode.rate);assert.equal(r.nativeDecode.audioOutput,false);assert.equal(r.year,null);}
});

test('unverified passages and entire source grammars stay null despite catalog numbers and headings',()=>{
 for(const r of c.recordings){assert.equal(voiceCoverage(r),null);for(const key of['timedWords','syllableAlignment','phonemes','musicalNotes','independentReview'])assert.equal(r[key],null);assert(r.sourceUrl.startsWith('https://commons.wikimedia.org/'));assert(r.license.id&&r.license.url);assert(r.audio.file.startsWith('https://upload.wikimedia.org/'));}
 const orel=c.recordings.find(r=>r.catalogReaderLabel==='אוראל');assert(orel.originalBytesVerifiedLocally);assert(c.rows.some(row=>row.recordId===orel.id&&row.passageNote==='א,א-ב,ג'));assert.equal(orel.coverage,null);
 for(const key of['acceptedWordTimes','musicalReview','kinnorEquivalence'])assert.equal(c[key],null);
});

test('record-specific spans restore for every real pair without copying timing or manufacturing a missing combination',()=>{
 const ps=pairs(),spans=Object.fromEntries(ps.map((p,i)=>[p.id,{start:i+.125,end:i+2}]));spans['seed-esther-2011']={start:.5,end:1.5};
 for(const p of ps){const saved=restoreVoicePreferences({studyId:featured,pronunciationId:p.pronunciationId,deliveryId:p.deliveryId,volume:0,repeat:true,spans});assert.equal(voiceRecording(saved.studyId,saved.pronunciationId,saved.deliveryId).id,p.id);assert.deepEqual(saved.spans,spans);assert(saved.repeat);}
 const a=ps.find(p=>p.pronunciationId!==ps[0].pronunciationId);assert.equal(restoreVoicePreferences({studyId:featured,pronunciationId:ps[0].pronunciationId,deliveryId:a.deliveryId}).studyId,'seed-esther');
});

test('every catalog combination resolves to its own canonical original and all five book finders remain nonempty',()=>{
 for(const book of['gen','exo','lev','num','deu']){const portions=readerCatalogPortions(book);assert(portions.length);for(const portion of portions)assert(readerCatalogReadings(portion.id).length);}
 for(const s of c.studies){const combinations=voiceCombinations(s.id);assert.equal(combinations.length,s.recordingIds.length);for(const p of combinations)assert.equal(voiceRecording(s.id,p.pronunciationId,p.deliveryId).id,p.id);assert(voiceRecording(s.id,s.pronunciations[0].id,s.deliveries[0].id));}
});
