import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {PronunciationLibrary} from '../pronunciation.js';
import {PHONOLOGY_PROFILES,phonologyWordProposal} from '../pronunciation-phonology.js';
import {sourceMaqafChain,MAQAF_STRESS_SOURCE} from '../pronunciation-stress.js';
const json=name=>JSON.parse(gunzipSync(readFileSync(new URL('../data/pronunciation/'+name+'.json.gz',import.meta.url))));
const library=new PronunciationLibrary(json('torah-display'),{underlay:json('torah-underlay'),segments:json('torah-segments')});
const fixture=(id,style='sephardic')=>{const hit=library.byWord.get(id),word={id,sourceHebrew:hit.group.readerHebrew[hit.index]};return{word,study:library.study(word,style)};};
const report=(id,style='sephardic',profile=1)=>{const{word,study}=fixture(id,style);return phonologyWordProposal(study,word,style,PHONOLOGY_PROFILES[profile].id);};
const selected=r=>r.routes.flatMap(route=>route.units.filter(u=>u.selected));

test('a complete maqaf chain supplies primary exclusion without changing source syllables or either text style',()=>{
 for(const style of['sephardic','ashkenazic'])for(const profile of[0,1]){
  const{word,study}=fixture('gen-11-4-3',style),before=JSON.stringify(study),r=phonologyWordProposal(study,word,style,PHONOLOGY_PROFILES[profile].id),units=selected(r),last=units.at(-1),segol=last.fragments.find(f=>f.source.categoryId==='SEGOL_V');
  assert.equal(r.hebrew,'נִבְנֶה־');assert.equal(last.context.primaryStress,false);assert.equal(last.context.stressBasis,'source-maqaf-primary-in-final-word');assert.deepEqual(segol.proposal.candidatePhonemes,['ɛ']);
  assert.deepEqual(last.context.maqafPrimary.readerWordIds,['gen-11-4-3','gen-11-4-4']);assert.deepEqual(last.context.maqafPrimary.markedHebrew,['נִבְנֶה־','לָּ֣נוּ']);assert.equal(last.context.maqafPrimary.primaryWordId,'gen-11-4-4');assert.equal(last.context.maqafPrimary.wordHasMeteg,false);
  assert(units.every(u=>u.sourceStress===false&&u.ownerWordId===word.id));assert.equal(JSON.stringify(study),before);assert.equal(r.phonemes,null);assert.equal(r.notes,null);assert.equal(r.audioTimes,null);assert.equal(r.singingVoice,null);assert.equal(r.playable,false);assert.equal(r.prosodySources[0].id,MAQAF_STRESS_SOURCE.id);
 }
 const a=report('gen-11-4-3'),b=report('gen-11-4-3','ashkenazic');assert.deepEqual(selected(a).map(u=>u.readerRanges),selected(b).map(u=>u.readerRanges));assert.notEqual(a.routes[0].units[2].sourceText,b.routes[0].units[2].sourceText);
});

test('meteg remains a separate uncertainty even when the group primary belongs to its final word',()=>{
 for(const style of['sephardic','ashkenazic']){
  const r=report('gen-1-12-9',style),unit=selected(r).find(u=>u.fragments.some(f=>f.source.categoryId==='SEGOL_V')),segol=unit.fragments.find(f=>f.source.categoryId==='SEGOL_V');
  assert.equal(r.hebrew,'עֹֽשֶׂה־');assert.equal(unit.context.primaryStress,false);assert.equal(unit.context.maqafPrimary.wordHasMeteg,true);assert.equal(segol.proposal.candidatePhonemes,null);assert.equal(segol.proposal.rule,'mideastern-segol-maqaf-meteg-needs-evidence');assert.deepEqual(segol.proposal.alternatives,['ɛ','ej']);assert.equal(segol.proposal.phonemes,null);assert.equal(unit.sourceStress,false);
  assert.deepEqual(selected(report('gen-1-12-9',style,0)).find(u=>u.fragments.some(f=>f.source.categoryId==='SEGOL_V')).fragments.find(f=>f.source.categoryId==='SEGOL_V').proposal.candidatePhonemes,['ɛ']);
 }
 const final=selected(report('gen-1-3-5'))[0].context.maqafPrimary;assert(final);assert(final.markedHebrew.at(-1).includes('\u05bd'));assert(!final.precedingMetegWordIds.includes(final.primaryWordId));assert.deepEqual(final.precedingMetegWordIds,['gen-1-3-5']);
});

test('stress inference refuses a missing join, open chain, foreign verse, noncontiguous IDs or ambiguous primary',()=>{
 const{study}=fixture('gen-11-4-3'),cell=study.rows[0].styles.sephardic[0];assert(sourceMaqafChain(study,cell.units,1));
 for(const kind of['missing-maqaf','dangling-maqaf','foreign-verse','word-gap','duplicate-id','no-primary','two-primaries','prefix-accent','paseq']){
  const s=structuredClone(study),units=s.rows[0].styles.sephardic[0].units;
  if(kind==='missing-maqaf')s.readerHebrew[0]=s.readerHebrew[0].replace('־','-');
  if(kind==='dangling-maqaf')s.readerHebrew[1]+='־';
  if(kind==='foreign-verse')s.readerIds[1]='gen-11-5-4';
  if(kind==='word-gap')s.readerIds[1]='gen-11-4-5';
  if(kind==='duplicate-id')s.readerIds[1]=s.readerIds[0];
  if(kind==='no-primary')units.forEach(u=>u.sourceStress=false);
  if(kind==='two-primaries')units[0].sourceStress=true;
  if(kind==='prefix-accent')s.readerHebrew[0]='נִבְנֶ֣ה־';
  if(kind==='paseq')s.readerHebrew[0]='נִבְנֶה ׀־';
  assert.equal(sourceMaqafChain(s,units,1),null,kind);
 }
});

test('source-only ranges, missing written coverage and broken reciprocal halves cannot establish group stress',()=>{
 const{study}=fixture('gen-11-4-3');
 for(const kind of['null-range','range-text','missing-unit','missing-branch']){
  const s=structuredClone(study),units=s.rows[0].styles.sephardic[0].units;
  if(kind==='null-range')units[0].sourceSegments.variants[0].readerRanges=null;
  if(kind==='range-text')units[0].sourceSegments.variants[0].readerRanges[0].text='נב';
  if(kind==='missing-unit')units.shift();
  if(kind==='missing-branch')units[0].sourceSegments.variants=[];
  assert.equal(sourceMaqafChain(s,units,1),null,kind);
 }
 const s=fixture('gen-1-16-7').study,units=s.rows[0].styles.sephardic[0].units;assert(sourceMaqafChain(s,units,1));
 units.flatMap(u=>u.sourceSegments.variants[0].segments).find(s=>s.part==='first-half-shared').sharedWithUnitId='missing';assert.equal(sourceMaqafChain(s,units,1),null);
});

test('combined ownership and repeated occurrences retain original source IDs without fabricated stress or phoneme timing',()=>{
 for(const id of['deu-32-6-1','deu-32-6-2']){const r=report(id);assert(selected(r).every(u=>u.ownerWordId===null&&u.occurrenceId===null&&u.context.maqafPrimary===null));}
 const{word,study}=fixture('gen-22-8-4'),before=JSON.stringify(study),r=phonologyWordProposal(study,{...word,id:'lesson-repeat',sourceWordId:word.id},'sephardic',PHONOLOGY_PROFILES[1].id);
 assert.equal(r.hebrew,'יִרְאֶה־');assert(selected(r).every(u=>u.occurrenceId==='lesson-repeat'&&u.ownerWordId===word.id));assert(selected(r).every(u=>u.context.maqafPrimary.primaryWordId==='gen-22-8-5'));assert.equal(JSON.stringify(study),before);
 for(const route of r.routes)for(const event of route.events)for(const key of['phonemes','enginePhones','quantity','duration','noteIds','audioTimes','review'])assert.equal(event[key],null);
});
