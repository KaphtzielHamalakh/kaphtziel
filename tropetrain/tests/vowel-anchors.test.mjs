import {restoredPortableHtml,portableFileBytes} from './portable-artifact.mjs';
import test from'node:test';import assert from'node:assert/strict';import{readFileSync}from'node:fs';import{gunzipSync}from'node:zlib';import{createHash}from'node:crypto';
import{VOWEL_ANCHORS,loadVowelAnchors,validateVowelAnchors,vowelAnchorsAvailable,vowelWordView}from'../vowel-anchors.js';
import{PHONETIC_WORDS}from'../phonetic-word.js';import{voiceRecording,voiceCoverage}from'../voice-studies.js';import{getCorpus}from'../library.js';import{createWordTimingDraft}from'../word-timing-draft.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url)),hash=b=>createHash('sha256').update(b).digest('hex'),corpus=await getCorpus();
const pairs=['ashkenazic-as-recorded','israeli-as-recorded'].map(style=>{const record=voiceRecording('asael-bereshit',style,'ashkenazic-melody'),coverage=voiceCoverage(record),words=corpus.passage([{...coverage,id:'vowel-check'}]).verses.flatMap(v=>v.words);return{record,draft:createWordTimingDraft(record,coverage,words)};});
const packets=VOWEL_ANCHORS.records.map(r=>JSON.parse(gunzipSync(read(r.file)))),prior=PHONETIC_WORDS.records.map(r=>JSON.parse(gunzipSync(read(r.file))));

test('structural vowel packets preserve both originals, all469marked words and unassigned sounds/times in independent comparisons',async()=>{
 for(let i=0;i<2;i++){
  const{record,draft}=pairs[i],entry=VOWEL_ANCHORS.records[i],before=JSON.stringify(draft);assert(vowelAnchorsAvailable(record));assert.equal(hash(read(entry.file)),entry.sha256);
  const packet=await loadVowelAnchors(record,draft,prior[i]);for(const style of['sephardic','ashkenazic']){
   const s=packet.studies[style];assert.deepEqual(s.words.map(w=>[w.id,w.hebrew]),draft.words.map(w=>[w.id,w.hebrew]));assert.equal(s.words.flatMap(w=>w.sourceVowels).length,1106);assert(s.words.every(w=>w.phonemes===null&&w.syllableTimes===null&&w.audioTimes===null&&w.review===null));
  }
  assert.equal(JSON.stringify(draft),before);assert(draft.words.every(w=>w.start===null&&w.end===null));assert.deepEqual(packet.analysisClock,prior[i].analysisClock);assert.equal(packet.studies.sephardic.words.at(-1).id,'gen-2-3-16');
 }
 assert.equal(VOWEL_ANCHORS.review,null);assert.equal(VOWEL_ANCHORS.newSingingVoice,null);assert.equal(hash(read(VOWEL_ANCHORS.sourcePack.file)),VOWEL_ANCHORS.sourcePack.sha256);
});

test('pronunciation source syllables and raw model vowel quality disagree explicitly without changing Hebrew or the recording',()=>{
 const packet=packets[0],before=JSON.stringify(packet),ash=vowelWordView(packet,1,'ashkenazic'),seph=vowelWordView(packet,1,'sephardic');
 assert.equal(ash.word.hebrew,'בָּרָ֣א');assert.equal(ash.word.hebrew,seph.word.hebrew);assert.deepEqual(ash.rows.map(r=>r.source.sourceUnitText),['bo','ro']);assert.deepEqual(seph.rows.map(r=>r.source.sourceUnitText),['ba','ra']);assert.deepEqual(ash.rows.map(r=>r.source.sourceRealization.text),['o','o']);
 assert.deepEqual(ash.word.candidateVowels.map(c=>c.modelText),['a','ˈu ']);assert.deepEqual(seph.word.candidateVowels.map(c=>c.modelText),['a','ˈu ']);assert(ash.word.candidateVowels.every(c=>c.vowelQualityCompared===false&&c.phonemes===null&&c.quantity===null));assert.equal(JSON.stringify(packet),before);
 assert.deepEqual(vowelWordView(packets[1],1,'sephardic').word.candidateVowels.map(c=>c.modelText),['a','ˈa ']);
});

test('shared consonants, source stress and37source-mark differences retain their separate full marked ranges',()=>{
 for(const packet of packets)for(const style of['sephardic','ashkenazic']){
  const source=packet.studies[style].words.flatMap(w=>w.sourceVowels),shared=source.filter(v=>v.parentSyllableReaderRanges.some(r=>r.role==='shared-consonant'));
  assert.equal(shared.length,101);assert.equal(source.filter(v=>!v.sourceMarkedTextEqualsWrittenRanges).length,37);assert(source.every(v=>typeof v.sourceStress==='boolean'&&v.individualVowelPointRange===null));
  const ha=vowelWordView(packet,4,style).rows[0].source;assert.equal(ha.sourceHebrew.text,'הַ');assert.equal(ha.sourceUnitText,'hash');assert.deepEqual(ha.parentSyllableReaderRanges.map(r=>r.text),['הַ','שָּׁ']);
  const hi=packet.studies[style].words.find(w=>w.id==='gen-1-5-2').sourceVowels.at(-1);assert.equal(hi.sourceMarkedTextEqualsWrittenRanges,false);assert.equal(hi.sourceHebrew.text,'הִ֤ים');assert.equal(hi.parentSyllableReaderRanges[0].text,'הִ֤ים ׀');
 }
});

test('missing model vowels and ambiguous/deleted anchors stay unfilled, with original clock disagreements withheld',()=>{
 const ash=packets[0].studies.ashkenazic,isr=packets[1].studies.sephardic;
 assert.equal(ash.diagnostics.candidateObservations,605);assert.equal(ash.diagnostics.wordsWithObservations,303);assert.equal(ash.diagnostics.sourceVowelsWithoutObservation,501);assert.equal(isr.diagnostics.candidateObservations,941);assert.equal(isr.diagnostics.wordsWithObservations,436);assert.equal(isr.diagnostics.sourceVowelsWithoutObservation,165);
 assert.equal(isr.diagnostics.withheldOrExcludedInterconsonantCases['original-word-audition-clock-disagreement'],2);assert(ash.diagnostics.withheldOrExcludedInterconsonantCases['ambiguous-or-unmatched-anchor']>0);assert(ash.diagnostics.withheldOrExcludedInterconsonantCases['source-vowel-count-2']>0);
 assert.equal(vowelWordView(packets[0],26,'ashkenazic').word.candidateVowels.length,0);assert(vowelWordView(packets[0],26,'ashkenazic').rows.every(r=>!r.observations.length));
});

test('all1120source syllable units are retained, including14unsplit furtive-patah compounds with no invented vowel or phoneme',()=>{
 for(let n=0;n<2;n++)for(const style of['sephardic','ashkenazic']){
  const rows=packets[n].studies[style].words.flatMap((_,i)=>vowelWordView(packets[n],i,style).rows),compounds=rows.filter(r=>r.unsplitCompound);
  assert.equal(rows.length,1120);assert.equal(new Set(rows.map(r=>r.source.sourceUnitId)).size,1120);assert.equal(compounds.length,14);
  for(const row of compounds){const s=row.source,w=prior[n].studies[style].words.find(w=>w.id===s.wordId),event=w.sourceEvents.find(e=>e.sourceUnitIds.includes(s.sourceUnitId));assert.equal(event.categoryId,s.categoryId);assert.equal(event.eventId,s.sourceSegmentId);assert.equal(s.categoryKind,'vowel-consonant-pair');assert.equal(row.observations.length,0);assert.equal(s.phonemes,null);assert.equal(s.audioTimes,null);assert.equal(s.individualVowelPointRange,null);for(const r of s.parentSyllableReaderRanges)assert.equal(w.hebrew.slice(r.start,r.end),r.text);}
  const events=new Map(prior[n].studies[style].words.flatMap(w=>w.sourceEvents).map(e=>[e.eventId,e]));for(const word of packets[n].studies[style].words)for(const candidate of word.candidateVowels)assert(!events.get(candidate.rightAnchor.sourceEventId).categoryId.startsWith('FPP_PATAX_'));
  const ru=vowelWordView(packets[n],packets[n].studies[style].words.findIndex(w=>w.id==='gen-1-2-9'),style);assert.equal(ru.rows.find(r=>r.source.categoryId==='SHURUQ').observations.length,0);assert.equal(ru.rows.at(-1).source.sourceUnitText,'aḥ');assert(ru.rows.at(-1).unsplitCompound);
 }
});

test('forged vowel approval, changed marks, wrong anchors, altered raw spaces and source clock drift are refused',()=>{
 assert.throws(()=>validateVowelAnchors(packets[0],pairs[1].draft,prior[1]));
 const changes=[p=>p.studies.ashkenazic.words[0].hebrew='בראשית',p=>p.studies.sephardic.words.reverse(),p=>p.phonemes=['a'],p=>p.analysisClock.analysisFrames++,p=>p.studies.sephardic.words[0].sourceVowels[0].individualVowelPointRange=[0,1],p=>p.studies.sephardic.words[0].sourceVowels[0].parentSyllableReaderRanges[0].text='ב',p=>p.studies.sephardic.words[0].candidateVowels[0].review='approved',p=>p.studies.sephardic.words[0].candidateVowels[0].vowelQualityCompared=true,p=>p.studies.sephardic.words[0].candidateVowels[0].modelText+=' ',p=>p.studies.sephardic.words[0].candidateVowels[0].rightAnchor.modelWindow++,p=>p.studies.sephardic.words[0].candidateVowels[0].leftAnchor.sourceEventId='missing'];
 for(const mutate of changes){const p=structuredClone(packets[0]);mutate(p);assert.throws(()=>validateVowelAnchors(p,pairs[0].draft,prior[0]));}
});

test('unknown styles/originals and corrupt vowel packets cannot fall back or modify manual drafts',async()=>{
 const{record,draft}=pairs[0],before=JSON.stringify(draft);await assert.rejects(loadVowelAnchors(record,draft,prior[0],{readPacket:async()=>new Uint8Array([1,2,3])}),/checksum/);assert.equal(JSON.stringify(draft),before);assert(!vowelAnchorsAvailable(voiceRecording('foreman-genesis','forte-lene','spoken')));assert.throws(()=>vowelWordView(packets[0],1,'galician'));assert.throws(()=>vowelWordView(packets[0],-1,'ashkenazic'));
});

test('normal and portable distributions expose opt-in vowel evidence without a synthesized pronunciation voice',()=>{
 const normal=read('index.html').toString(),portable=restoredPortableHtml(read('TropeTrain.html')).toString();for(const id of['vowel-anchor-review','vowel-anchor-hebrew','vowel-anchor-caption-hebrew','vowel-anchor-load','vowel-anchor-rows','vowel-anchor-status']){assert(normal.includes(`id="${id}"`));assert(portable.includes(`id="${id}"`));}
 assert(portable.includes('href="data:application/zip;base64,'+read(VOWEL_ANCHORS.sourcePack.file).toString('base64')+'"'));assert(read('sw.js').toString().includes('ASAEL-VOWEL-ANCHORS.json'));assert(portableFileBytes()<100*1024*1024);
});
