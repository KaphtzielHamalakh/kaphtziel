import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {gunzipSync} from 'node:zlib';import {createHash} from 'node:crypto';
import {PronunciationLibrary} from '../pronunciation.js';import {phonologyWordProposal as propose,phonologySourceForProfile,ALL_PHONOLOGY_PROFILES} from '../pronunciation-phonology.js';
import {MODERN_FINAL_PROFILE as profile,MODERN_FINAL_SOURCE as source} from '../modern-phonology.js';import {readerPhonologyWord} from '../pronunciation-phonology-reader.js';
import {getCorpus} from '../library.js';import {SourceSyllableUnderlay} from '../source-syllable-underlay.js';import {createReadingModel} from '../music.js';import {linkPronunciationProposalsToNotes as link} from '../pronunciation-note-proposals.js';
const j=n=>JSON.parse(gunzipSync(readFileSync(new URL('../data/pronunciation/'+n+'.json.gz',import.meta.url)))),lib=new PronunciationLibrary(j('torah-display'),{underlay:j('torah-underlay'),segments:j('torah-segments')});
const word=id=>{const h=lib.byWord.get(id);return{id,sourceHebrew:h.group.readerHebrew[h.index]};},report=(id,style='sephardic',p=profile.id)=>{const w=word(id);return propose(lib.study(w,style),w,style,p);};
const fragments=r=>r.routes.flatMap(r=>r.units.flatMap(u=>u.fragments));
test('optional final-consonant policy is explicitly separate from the existing modern inventory and every historical label',()=>{
 assert(ALL_PHONOLOGY_PROFILES.includes(profile));assert.equal(phonologySourceForProfile(profile.id),source);assert.equal(profile.inventoryProfileId,'phonikud-modern-inventory');assert.equal(source.license,'CC-BY-4.0');assert.equal(source.blobs.wordCleanup,'0aeeb9415670b9db9aff21136c9813dc145ab034');assert.equal(profile.kinnorAccentId,null);assert.equal(profile.playable,false);assert.equal(profile.singingVoice,null);assert.equal(profile.review,null);assert(source.scope.includes('No whole-word phonemizer'));assert(source.scope.includes('ij cleanup'));
});
test('both source styles preserve the exact shema word and propose optional final loss only in the new policy',()=>{
 for(const style of ['sephardic','ashkenazic']){
  const old=report('deu-6-4-1',style,'phonikud-modern-inventory'),r=report('deu-6-4-1',style),f=fragments(r).find(f=>f.source.categoryId==='AYIN_0DAG');assert.equal(r.hebrew,'שְׁמַ֖ע');assert.deepEqual(f.proposal.candidatePhonemes,[]);assert.equal(f.proposal.rule,'modern-optional-final-consonant-loss');assert.equal(f.proposal.evidence.sourceId,source.id);assert.equal(f.proposal.evidence.sourceFunction,'post_normalize');assert.equal(f.proposal.evidence.sourceOption,'use_post_normalize');assert.equal(f.proposal.evidence.sourcePattern,'ʔ$');assert.equal(fragments(old).find(f=>f.source.categoryId==='AYIN_0DAG').proposal.candidatePhonemes,null);
  for(const [i,u]of r.routes[0].units.entries()){assert.deepEqual(u.sourceHebrew,old.routes[0].units[i].sourceHebrew);assert.deepEqual(u.readerRanges,old.routes[0].units[i].readerRanges);assert.equal(u.sourceStress,old.routes[0].units[i].sourceStress);}assert.equal(r.counts.unassignedReferences,old.counts.unassignedReferences-1);
 }
});
test('multiword, maqaf, missing exact source range and unowned source boundaries never gain optional final loss',()=>{
 for(const mutation of ['multiword','maqaf','source-range','owner','empty-range','changed-range','group-id','trailing-silent']){
  const w=word('deu-6-4-1'),s=structuredClone(lib.study(w,'sephardic')),cell=s.rows[0].styles.sephardic[0];
  if(mutation==='multiword')s.readerIds.push('another-word');
  if(mutation==='maqaf'){const value=w.sourceHebrew+'־';s.readerHebrew[0]=value;s.sourceGroup.readerHebrew[0]=value;w.sourceHebrew=value;}
  if(mutation==='source-range')cell.units.at(-1).sourceSegments.variants[0].readerRanges=null;
  if(mutation==='empty-range')cell.units.at(-1).sourceSegments.variants[0].readerRanges=[];
  if(mutation==='changed-range')cell.units.at(-1).sourceSegments.variants[0].readerRanges[0].text='changed';
  if(mutation==='group-id')s.groupId+='-changed';
  if(mutation==='owner')cell.units.at(-1).sourceBoundaryReaderWordId=null;
  if(mutation==='trailing-silent'){const seg=structuredClone(cell.units.at(-1).sourceSegments.variants[0].segments.at(-1));seg.id+='-trailing';seg.kind='silent-letter';cell.units.at(-1).sourceSegments.variants[0].segments.push(seg);}
  if(mutation==='trailing-silent'){assert.throws(()=>propose(s,w,'sephardic',profile.id),/category, part or identity/);continue;}
  const r=propose(s,w,'sephardic',profile.id);assert(fragments(r).filter(f=>f.source.categoryId==='AYIN_0DAG'&&f.source.kind!=='silent-letter').every(f=>f.proposal.candidatePhonemes===null),mutation);assert(!fragments(r).some(f=>f.proposal.rule==='modern-optional-final-consonant-loss'),mutation);
 }
});
test('written vocal sheva, mappiq and collective source-word boundaries remain unresolved',()=>{
 assert.equal(fragments(report('deu-6-4-1')).find(f=>f.source.categoryId==='SHEVA_NA').proposal.candidatePhonemes,null);
 assert.equal(fragments(report('gen-2-15-9')).find(f=>f.source.categoryId==='HE_1MAPIQ').proposal.candidatePhonemes,null);
 const joint=report('deu-32-6-1');assert(joint.routes.flatMap(r=>r.units).every(u=>u.ownerWordId===null&&u.context.modernFinalCleanup.completeExactSingleSourceWord===false));assert(!fragments(joint).some(f=>f.proposal.rule==='modern-optional-final-consonant-loss'));
});
test('proposed loss is not confused with source silence or unknown and retains null accepted phones, voice and times',()=>{
 const w=word('deu-6-4-1'),r=readerPhonologyWord(w,lib.study(w,'sephardic'),'sephardic',profile.id);assert(r.entries.some(e=>e.text.includes('(∅)')));assert(r.entries.some(e=>e.parts.some(p=>p.references.some(x=>x.soundStatus==='unresolved'))));assert(r.entries.some(e=>e.parts.some(p=>p.references.some(x=>x.soundStatus==='proposed-absence'))));
 for(const event of r.evidence.routes.flatMap(r=>r.events))for(const key of ['phonemes','enginePhones','quantity','duration','noteIds','audioTimes','review'])assert.equal(event[key],null);assert.equal(r.newSingingVoice,null);
 const bara=readerPhonologyWord(word('gen-1-1-2'),lib.study(word('gen-1-1-2'),'sephardic'),'sephardic',profile.id);assert(bara.entries.some(e=>e.parts.some(p=>p.references.some(x=>x.soundStatus==='source-silent'))));
});
test('all twenty pinned prior-release modern word reports remain byte-identical',()=>{
 const fixture=JSON.parse(readFileSync(new URL('./fixtures/phonology-v81-modern-baseline.json',import.meta.url)));assert.equal(fixture.rows.length,20);for(const row of fixture.rows)assert.equal(createHash('sha256').update(JSON.stringify(report(row.id,row.style,'phonikud-modern-inventory'))).digest('hex'),row.sha256,row.id+' '+row.style);
});
test('the new option preserves reciprocal shared consonants, CGJ and original source variants',()=>{
 const shared=report('gen-8-20-7'),parts=fragments(shared).filter(f=>f.source.categoryId==='BET_1DAG_XAZAQ');assert.equal(parts.length,2);assert.equal(parts[0].eventId,parts[1].eventId);const cgj=report('gen-13-3-13');assert.equal(cgj.hebrew,'אֽ͏ָהֳלוֹ֙');assert.equal(cgj.routes.length,2);assert(cgj.routes.flatMap(r=>r.units).every(u=>u.readerRanges===null&&u.context.modernFinalCleanup.completeExactSingleSourceWord===false));
});
test('optional final text remains structurally linked to unchanged notes independently of key and tempo',async()=>{
 const passage=(await getCorpus()).passage([{id:'final',bookId:'deu',start:{chapter:6,verse:4},end:{chapter:6,verse:4}}]),model=createReadingModel(passage,{sourceUnderlay:new SourceSyllableUnderlay(lib)}),plan=model.buildPlan(0,0,{tempo:84,transpose:0}),before=JSON.stringify({words:model.words,plan}),r=link(plan,model.words,lib,'sephardic',profile.id);assert.equal(r.phonologySource.id,source.id);assert.equal(r.counts.linkedNotes,plan.length);assert(r.sourceEvents.some(e=>e.rule==='modern-optional-final-consonant-loss'));assert.equal(JSON.stringify({words:model.words,plan}),before);assert.deepEqual(link(model.buildPlan(0,0,{tempo:42,transpose:1}),model.words,lib,'sephardic',profile.id),r);assert.equal(r.voice,null);assert.equal(r.phonemes,null);assert.equal(r.audioTimes,null);
});
