import {restoredPortableHtml,portableFileBytes} from './portable-artifact.mjs';
import test from'node:test';import assert from'node:assert/strict';import{readFileSync}from'node:fs';import{gunzipSync}from'node:zlib';import{createHash}from'node:crypto';
import{PHONETIC_WORDS,loadPhoneticWords,validatePhoneticWords,phoneticWordsAvailable,phoneticWordView}from'../phonetic-word.js';
import{voiceRecording,voiceCoverage,VOICE_STUDIES}from'../voice-studies.js';import{getCorpus}from'../library.js';import{createWordTimingDraft}from'../word-timing-draft.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url)),hash=b=>createHash('sha256').update(b).digest('hex'),corpus=await getCorpus();
const pairs=['ashkenazic-as-recorded','israeli-as-recorded'].map(style=>{const record=voiceRecording('asael-bereshit',style,'ashkenazic-melody'),coverage=voiceCoverage(record),words=corpus.passage([{...coverage,id:'phonetic-check'}]).verses.flatMap(v=>v.words);return{record,draft:createWordTimingDraft(record,coverage,words)};});
const packets=PHONETIC_WORDS.records.map(r=>JSON.parse(gunzipSync(read(r.file))));

test('both originals retain469exact marked words in two separately checked source-text comparisons without filling any sound or time',async()=>{
 assert.equal(PHONETIC_WORDS.records.length,2);assert.equal(PHONETIC_WORDS.windows,28);assert.equal(PHONETIC_WORDS.review,null);assert.equal(PHONETIC_WORDS.newSingingVoice,null);assert.equal(VOICE_STUDIES.recordings.length,72);
 for(let i=0;i<2;i++){
  const{record,draft}=pairs[i],entry=PHONETIC_WORDS.records[i],before=JSON.stringify(draft),bytes=read(entry.file);assert.equal(bytes.length,entry.bytes);assert.equal(hash(bytes),entry.sha256);assert(phoneticWordsAvailable(record));
  const p=await loadPhoneticWords(record,draft);assert.equal(p.analysisClock.analysisFrames,Math.ceil(p.analysisClock.originalDecodedFrames*16000/p.analysisClock.originalRate));assert.equal(p.modelWindows.at(-1).sourceClock.coreSeconds[1],p.analysisClock.analysisDuration);assert.notEqual(p.analysisClock.analysisDuration,p.source.duration);for(const style of['sephardic','ashkenazic']){assert.deepEqual(p.studies[style].words.map(w=>[w.id,w.hebrew]),draft.words.map(w=>[w.id,w.hebrew]));assert(p.studies[style].words.every(w=>w.approvedWordBoundary===null&&w.phonemes===null&&w.audioTimes===null&&w.review===null));}
  assert.equal(JSON.stringify(draft),before);assert(draft.words.every(w=>w.start===null&&w.end===null));assert.equal(p.studies.sephardic.words.at(-1).id,'gen-2-3-16');assert.equal(p.studies.sephardic.words.at(-1).hebrew,'לַעֲשֽׂוֹת׃');
 }
 assert.notEqual(packets[0].source.duration,packets[1].source.duration);assert.equal(hash(read(PHONETIC_WORDS.sourcePack.file)),PHONETIC_WORDS.sourcePack.sha256);
});

test('model whitespace cannot move the first word’s tav into the next Hebrew word',()=>{
 const p=packets[0],a=phoneticWordView(p,0,'ashkenazic'),b=phoneticWordView(p,1,'ashkenazic'),tav=a.word.sourceEvents.find(e=>e.categoryId==='TAV_0DAG');
 const s=a.word.candidateConsonants.find(c=>c.sourceEventCandidates.includes(tav.eventId));assert.equal(s.modelGlyph,'s');
 const word2Context=b.contexts.find(c=>c.window===s.modelWindow);assert(word2Context);assert(s.modelCharacterRange[0]>=word2Context.textRange[0]&&s.modelCharacterRange[1]<=word2Context.textRange[1]);
 assert(a.contexts.some(c=>c.text.includes(word2Context.text)));assert.equal(a.word.id,'gen-1-1-1');assert.equal(b.word.id,'gen-1-1-2');assert.equal(b.word.hebrew,'בָּרָ֣א');
 assert(b.word.candidateConsonants.every(c=>!c.sourceEventCandidates.includes(tav.eventId)));
});

test('reciprocal shared halves retain both syllable/marked-cluster links in one source consonant event',()=>{
 for(const p of packets)for(const style of['sephardic','ashkenazic']){
  const events=p.studies[style].words.flatMap(w=>w.sourceEvents),shared=events.filter(e=>e.sourceSegmentIds.length===2);assert.equal(events.length,1504);assert.equal(shared.length,101);
  assert(shared.every(e=>e.sourceUnitIds.length===2&&new Set(e.sourceUnitIds).size===2&&e.eventId===e.sourceSegmentIds.join('+')&&e.quantity===null));
  for(const e of shared){assert.deepEqual(new Set(e.sourceClusters.map(c=>c.part)),new Set(['first-half-shared','second-half-shared']));assert.equal(e.sourceClusters[0].readerClusterRanges[0].text,e.sourceClusters[1].readerClusterRanges[0].text);}
 }
});

test('the MAM text comparison changes independently of fixed model output, marked Hebrew, source clock and personal draft',()=>{
 const p=packets[0],before=JSON.stringify(p),a=phoneticWordView(p,0,'sephardic'),b=phoneticWordView(p,0,'ashkenazic');assert.equal(a.word.hebrew,b.word.hebrew);assert.deepEqual(a.word.sourceEvents.find(e=>e.categoryId==='TAV_0DAG').classes,['T']);assert.deepEqual(b.word.sourceEvents.find(e=>e.categoryId==='TAV_0DAG').classes,['S']);assert.equal(JSON.stringify(p),before);
 assert.throws(()=>phoneticWordView(p,0,'galician'));assert.throws(()=>phoneticWordView(p,-1,'sephardic'));assert(p.studies.ashkenazic.words.some(w=>!w.candidateConsonants.length));
 assert(p.studies.ashkenazic.diagnostics.ambiguousReferencesWithheld>0);assert(p.studies.ashkenazic.diagnostics.crossModelClockDisagreementsWithheld>0);
});

test('altered Hebrew, wrong original, source clusters, model clock, shared halves and forged approval are refused',()=>{
 assert.throws(()=>validatePhoneticWords(packets[0],pairs[1].draft),/different source/);
 const changes=[p=>p.studies.sephardic.words[0].hebrew='בראשית',p=>p.studies.sephardic.words.reverse(),p=>p.wordTimes=[],p=>p.phonemes=[],p=>p.studies.sephardic.words[0].review='approved',p=>p.model.revision='invented',p=>p.analysisClock.analysisFrames++,p=>p.modelWindows[1].sourceClock.coreSeconds[0]=0,p=>p.studies.sephardic.words[0].sourceEvents[0].sourceClusters[0].readerClusterRanges[0].text='ב',p=>p.studies.sephardic.words[0].candidateConsonants[0].modelCharacterRange=[-1,0],p=>p.studies.sephardic.words[0].candidateConsonants[0].sourceEventCandidates=['other-word']];
 for(const change of changes){const p=structuredClone(packets[0]);change(p);assert.throws(()=>validatePhoneticWords(p,pairs[0].draft));}
});

test('unknown source and corrupt packets cannot load a fallback pronunciation or modify a personal timing draft',async()=>{
 const{record,draft}=pairs[0],before=JSON.stringify(draft);await assert.rejects(loadPhoneticWords(record,draft,{readPacket:async()=>new Uint8Array([1,2,3])}),/checksum/);assert.equal(JSON.stringify(draft),before);assert(!phoneticWordsAvailable(voiceRecording('foreman-genesis','forte-lene','spoken')));
 assert.equal(PHONETIC_WORDS.approvedWordBoundaries,0);assert.equal(PHONETIC_WORDS.algorithmChecks,7);assert.equal(PHONETIC_WORDS.exhaustiveOracleSequencePairs,225);
});

test('normal and portable distributions expose opt-in phonetic research and embed evidence without model weights',()=>{
 const normal=read('index.html').toString(),portable=restoredPortableHtml(read('TropeTrain.html')).toString();
 for(const id of['phonetic-word-review','phonetic-word-hebrew','phonetic-word-load','phonetic-word-evidence','phonetic-word-context','phonetic-word-status']){assert(normal.includes(`id="${id}"`));assert(portable.includes(`id="${id}"`));}
 assert(portable.includes('href="data:application/zip;base64,'+read(PHONETIC_WORDS.sourcePack.file).toString('base64')+'"'));assert(!read('sw.js').toString().includes('model.safetensors'));assert(portableFileBytes()<100*1024*1024);
});
