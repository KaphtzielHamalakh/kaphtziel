import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {gunzipSync} from 'node:zlib';import {createHash} from 'node:crypto';
import {PronunciationLibrary} from '../pronunciation.js';import {PHONOLOGY_PROFILES,ALL_PHONOLOGY_PROFILES,phonologyWordProposal as propose,phonologySourceForProfile} from '../pronunciation-phonology.js';
import {readerPhonologyWord} from '../pronunciation-phonology-reader.js';import {MODERN_PHONOLOGY_SOURCE as source,MODERN_PHONOLOGY_PROFILE as profile} from '../modern-phonology.js';
import {READER_PRONUNCIATION_SOURCES} from '../khan-pronunciation.js';import {getCorpus} from '../library.js';import {SourceSyllableUnderlay} from '../source-syllable-underlay.js';import {createReadingModel} from '../music.js';import {linkPronunciationProposalsToNotes as link} from '../pronunciation-note-proposals.js';
const json=n=>JSON.parse(gunzipSync(readFileSync(new URL('../data/pronunciation/'+n+'.json.gz',import.meta.url)))),lib=new PronunciationLibrary(json('torah-display'),{underlay:json('torah-underlay'),segments:json('torah-segments')});
const word=id=>{const h=lib.byWord.get(id);return{id,sourceHebrew:h.group.readerHebrew[h.index]};};const report=(id,style='sephardic',p=profile.id)=>{const w=word(id);return propose(lib.study(w,style),w,style,p);};const fragments=r=>r.routes.flatMap(r=>r.units.flatMap(u=>u.fragments));
test('the third runtime profile is an attributed modern inventory adaptation, separate from the two regional profiles and six historical labels',()=>{
 assert.equal(PHONOLOGY_PROFILES.length,2);assert.equal(ALL_PHONOLOGY_PROFILES.length,4);assert.equal(READER_PRONUNCIATION_SOURCES.filter(p=>p.kind==='phonemic-research').length,4);
 assert.equal(phonologySourceForProfile(profile.id),source);assert.equal(source.commit,'a29a75b473b0f132a0bbee41dad38763035211dc');assert.equal(source.license,'CC-BY-4.0');assert(Object.isFrozen(profile)&&Object.isFrozen(source));
 for(const p of ALL_PHONOLOGY_PROFILES){assert.equal(p.kinnorAccentId,null);assert.equal(p.playable,false);assert.equal(p.singingVoice,null);assert.equal(p.review,null);}
});
test('forty complete published regional reports stay byte-identical across representative branches, shared halves, compounds and joint words',()=>{
 const fixtures=JSON.parse(readFileSync(new URL('./fixtures/phonology-regional-baseline.json',import.meta.url)));assert.equal(fixtures.rows.length,40);
 for(const row of fixtures.rows)assert.equal(createHash('sha256').update(JSON.stringify(report(row.id,row.style,row.profileId))).digest('hex'),row.sha256,row.id+' '+row.style+' '+row.profileId);
});
test('modern vowels and consonants change independently of both source text styles while exact Hebrew and syllable bindings remain intact',()=>{
 const w=word('gen-1-1-2'),a=report(w.id),b=report(w.id,'ashkenazic');
 for(const r of[a,b]){assert.equal(r.hebrew,'בָּרָ֣א');assert.equal(r.source.id,source.id);assert.deepEqual(r.routes[0].units.map(u=>u.fragments.flatMap(f=>f.proposal.candidatePhonemes??['?'])),[['b','a'],['ʁ','a']]);assert.equal(r.playable,false);assert.equal(r.phonemes,null);}
 assert.deepEqual(a.routes[0].units.map(u=>u.readerRanges),b.routes[0].units.map(u=>u.readerRanges));assert.notDeepEqual(a.routes[0].units.map(u=>u.sourceText),b.routes[0].units.map(u=>u.sourceText));
 const modern=fragments(report('gen-1-1-1')),regional=fragments(report('gen-1-1-1','sephardic',PHONOLOGY_PROFILES[0].id));assert.deepEqual(modern.find(f=>f.source.categoryId==='TAV_0DAG').proposal.candidatePhonemes,['t']);assert.deepEqual(regional.find(f=>f.source.categoryId==='TAV_0DAG').proposal.candidatePhonemes,['s']);
});
test('written vocal sheva never becomes the library’s invented modern spoken-sheva annotation',()=>{
 const r=report('gen-1-1-1'),f=fragments(r).find(f=>f.source.categoryId==='SHEVA_NA');assert.equal(f.proposal.candidatePhonemes,null);assert.equal(f.proposal.rule,'modern-spoken-sheva-unassigned');assert.equal(f.proposal.enginePhones,null);assert.equal(r.source.blobs.lexicon,'d77243234b5df6bd67e2ed4c23f7a3c4a4d7c4f3');
});
test('modern monophthong/yod constituents share their original syllable without filling either regional compound gap',()=>{
 for(const [id,phones]of[['gen-12-2-2',['o','j']],['exo-38-17-8',['u','j']]])for(const style of['sephardic','ashkenazic']){
  const r=report(id,style),u=r.routes.flatMap(r=>r.units).find(u=>u.vowelYodProposal);assert.deepEqual(u.vowelYodProposal.candidatePhonemes,phones);assert.equal(u.vowelYodProposal.sourceSegmentIds.length,2);assert.equal(new Set(u.vowelYodProposal.eventIds).size,2);assert.equal(u.vowelYodProposal.evidence.sourceId,source.id);
  for(const key of['phonemes','enginePhones','quantity','duration','noteIds','audioTimes','review'])assert.equal(u.vowelYodProposal[key],null);
  for(const p of PHONOLOGY_PROFILES){const old=report(id,style,p.id),target=old.routes.flatMap(r=>r.units).find(u=>u.fragments.some(f=>f.source.categoryId==='YOD_0DAG_PART2_OF_DIPHTHONG'));assert.equal(target.vowelYodProposal,null);assert.equal(target.fragments.at(-1).proposal.candidatePhonemes,null);}
 }
});
test('nonterminal and multiple-nucleus source compounds receive no invented glide or fallback',()=>{
 for(const mutation of['nonterminal','multiple-nuclei']){const w=word('gen-12-2-2'),s=lib.study(w,'sephardic'),segments=s.rows[0].styles.sephardic[0].units.at(-1).sourceSegments.variants[0].segments,extra=structuredClone(segments[mutation==='nonterminal'?0:1]);extra.id+='-probe';if(mutation==='nonterminal')segments.push(extra);else segments.splice(1,0,extra);const r=propose(s,w,'sephardic',profile.id),u=r.routes[0].units.at(-1);assert.equal(u.vowelYodProposal,null);assert.equal(u.fragments.find(f=>f.source.categoryId==='YOD_0DAG_PART2_OF_DIPHTHONG').proposal.candidatePhonemes,null);}
});
test('shared source halves retain one inventory event, while broken references withhold both candidates with the correct provenance',()=>{
 const w=word('gen-8-20-7'),s=lib.study(w,'sephardic'),before=JSON.stringify(s),r=propose(s,w,'sephardic',profile.id),parts=fragments(r).filter(f=>f.source.categoryId==='BET_1DAG_XAZAQ');assert.equal(parts.length,2);assert.equal(parts[0].eventId,parts[1].eventId);const event=r.routes[0].events.find(e=>e.id===parts[0].eventId);assert.deepEqual(event.candidatePhonemes,['b']);assert.equal(event.rule,'modern-inventory-shared-consonant');assert.equal(event.evidence.sourceId,source.id);assert.equal(JSON.stringify(s),before);
 s.rows[0].styles.sephardic[0].units[0].sourceSegments.variants[0].segments.at(-1).sharedWithUnitId='missing';const broken=propose(s,w,'sephardic',profile.id),halves=fragments(broken).filter(f=>f.source.categoryId==='BET_1DAG_XAZAQ');assert(halves.every(f=>f.proposal.candidatePhonemes===null&&f.proposal.evidence.sourceId===source.id));
});
test('final glottal cleanup, special mappiq and shared source-word boundaries stay unresolved',()=>{
 const final=fragments(report('deu-6-4-1')).find(f=>f.source.categoryId==='AYIN_0DAG');assert.equal(final.proposal.candidatePhonemes,null);assert.equal(final.proposal.rule,'modern-final-consonant-processing-unassigned');assert.equal(final.proposal.evidence.file,'phonikud/utils.py');
 const mappiq=fragments(report('gen-2-15-9')).find(f=>f.source.categoryId==='HE_1MAPIQ');assert(mappiq);assert.equal(mappiq.proposal.candidatePhonemes,null);assert.equal(mappiq.proposal.rule,'modern-special-category-unassigned');
 const joint=report('deu-32-6-1');assert(joint.routes.flatMap(r=>r.units).every(u=>u.ownerWordId===null&&u.context.modernSourceBoundary.finalUnitInSourceWord===null));assert.equal(joint.phonemes,null);assert.equal(joint.audioTimes,null);
});
test('source-only reading alternatives, CGJ, repeated occurrences and all original marks remain independent of the inventory choice',()=>{
 const w=word('gen-13-3-13'),s=lib.study(w,'sephardic'),before=JSON.stringify(s),r=propose(s,{...w,id:w.id+'@repeat',sourceWordId:w.id},'sephardic',profile.id);assert.equal(r.hebrew,'אֽ͏ָהֳלוֹ֙');assert.equal(r.routes.length,2);assert(r.routes.flatMap(r=>r.units).every(u=>u.readerRanges===null&&u.occurrenceId===w.id+'@repeat'));assert.equal(JSON.stringify(s),before);assert.throws(()=>propose(s,{...w,sourceHebrew:'אהלו'},'sephardic',profile.id),/marked Hebrew/);
});
test('reader text distinguishes source silence from unknowns and never assigns accepted phones or sound times',()=>{
 const w=word('gen-1-1-1'),r=readerPhonologyWord(w,lib.study(w,'sephardic'),'sephardic',profile.id);assert.equal(r.status,'word-linked');assert(r.entries.some(e=>e.parts.some(p=>p.references.some(x=>x.soundStatus==='unresolved'))));assert.equal(r.source.id,source.id);
 for(const event of r.evidence.routes.flatMap(r=>r.events))for(const key of['phonemes','enginePhones','quantity','duration','noteIds','audioTimes','review'])assert.equal(event[key],null);
});
test('modern note references retain pitches, durations and all source syllables through key/tempo changes, with modern provenance',async()=>{
 const m=createReadingModel((await getCorpus()).passage([{id:'modern',bookId:'gen',start:{chapter:1,verse:1},end:{chapter:1,verse:1}}]),{sourceUnderlay:new SourceSyllableUnderlay(lib)}),plan=m.buildPlan(0,m.words.length-1,{tempo:84,transpose:0}),before=JSON.stringify({words:m.words,plan}),r=link(plan,m.words,lib,'sephardic',profile.id);
 assert.equal(r.phonologySource.id,source.id);assert.equal(r.counts.linkedNotes,plan.length);assert.deepEqual(r.links.map(l=>l.eventId),plan.map(e=>e.id));assert.equal(JSON.stringify({words:m.words,plan}),before);
 assert.deepEqual(link(m.buildPlan(0,m.words.length-1,{tempo:42,transpose:1}),m.words,lib,'sephardic',profile.id),r);assert.equal(r.voice,null);assert.equal(r.phonemes,null);assert.equal(r.audioTimes,null);
});
