import {restoredPortableHtml,portableFileBytes} from './portable-artifact.mjs';
import test from'node:test';import assert from'node:assert/strict';import{readFileSync}from'node:fs';import{gunzipSync}from'node:zlib';
import{PronunciationLibrary,PRONUNCIATION_STYLES}from'../pronunciation.js';import{PHONOLOGY_PROFILES as profiles,phonologyWordProposal as propose}from'../pronunciation-phonology.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url)),json=n=>JSON.parse(gunzipSync(read('data/pronunciation/'+n+'.json.gz'))),lib=new PronunciationLibrary(json('torah-display'),{underlay:json('torah-underlay'),segments:json('torah-segments')});
const word=id=>{const h=lib.byWord.get(id);return{id,sourceHebrew:h.group.readerHebrew[h.index]};},report=(id,profile=0,style='sephardic')=>{const w=word(id);return propose(lib.study(w,style),w,style,profiles[profile].id);},fragments=r=>r.routes.flatMap(r=>r.units.flatMap(u=>u.fragments)),vowels=r=>fragments(r).filter(f=>['vowel','diphthong-part'].includes(f.source.kind)).map(f=>f.proposal.candidatePhonemes);
test('two attributed formal research profiles remain separate from historical labels, text styles and audio',()=>{
 assert.equal(profiles.length,2);assert.deepEqual(PRONUNCIATION_STYLES.map(p=>p.id),['sephardic','ashkenazic']);assert(profiles.every(p=>p.kinnorAccentId===null&&p.singingVoice===null&&p.review===null&&!p.playable));assert(Object.isFrozen(profiles));
 const a=report('gen-1-1-2'),b=report('gen-1-1-2',1);assert.equal(a.hebrew,'בָּרָ֣א');assert.deepEqual(vowels(a),[['ɔ'],['ɔ']]);assert.deepEqual(vowels(b),[['u'],['u']]);
 for(const r of[a,b]){assert.equal(r.phonemes,null);assert.equal(r.audioTimes,null);assert.equal(r.playable,false);assert(r.routes[0].units.every(u=>!u.context.penultimateStressShift&&!u.context.posttonicReduction));}
});
test('research phonology changes independently of both aligned MAMtext projections',()=>{
 for(const p of[0,1]){const a=report('gen-1-1-2',p),b=report('gen-1-1-2',p,'ashkenazic');assert.deepEqual(vowels(a),vowels(b));assert.deepEqual(a.routes[0].units.map(u=>u.sourceText),['ba','ra']);assert.deepEqual(b.routes[0].units.map(u=>u.sourceText),['bo','ro']);assert.deepEqual(a.routes[0].units.map(u=>u.readerRanges),b.routes[0].units.map(u=>u.readerRanges));}
});
test('formal segol depends on historical stress and closure; closed qamats does not become open-syllable u',()=>{
 const open=report('gen-1-2-11',1),segols=fragments(open).filter(f=>f.source.categoryId==='SEGOL_V');assert.deepEqual(segols.map(f=>f.proposal.candidatePhonemes),[['ej'],['ɛ']]);
 const closed=report('gen-1-7-8',1);assert.deepEqual(fragments(closed).find(f=>f.source.categoryId==='SEGOL_V').proposal.candidatePhonemes,['ɛ']);
 const night=report('gen-1-5-7',1),q=fragments(night).filter(f=>f.source.categoryId==='QAMATS_G');assert.deepEqual(q.map(f=>f.proposal.candidatePhonemes),[['ɔ'],['u']]);
 assert(night.routes[0].units[0].context.beforeYodOrMappiq);assert.equal(night.routes[0].units[0].context.historicalClosure,'closed');
 const unmarked=report('gen-1-4-3',1);assert.equal(unmarked.routes[0].units[0].context.primaryStress,false);assert.equal(unmarked.routes[0].units[0].context.stressBasis,'source-maqaf-primary-in-final-word');
});
test('original source closure precedes degemination and reciprocal halves share one consonant event',()=>{
 const r=report('gen-8-20-7',1),route=r.routes[0],u=route.units,halves=fragments(r).filter(f=>f.source.categoryId==='BET_1DAG_XAZAQ');assert.equal(u[0].context.historicalClosure,'closed');assert.equal(halves.length,2);assert.equal(halves[0].eventId,halves[1].eventId);const event=route.events.find(e=>e.id===halves[0].eventId);assert.deepEqual(event.candidatePhonemes,['b']);assert.equal(event.sourceSegmentIds.length,2);assert.equal(event.rule,'degemination');assert.equal(u[0].readerRanges[1].text,'בְּ');assert.equal(u[0].readerRanges[1].start,2);assert.equal(u[0].readerRanges[1].end,5);
 const sheva=fragments(r).find(f=>f.source.categoryId==='SHEVA_NA');assert.equal(sheva.proposal.candidatePhonemes,null);assert.equal(sheva.proposal.phonemes,null);
});
test('source alternatives retain separate routes, source-only forms keep null written ranges and exact CGJ',()=>{
 const w=word('gen-13-3-13'),s=lib.study(w,'sephardic'),before=JSON.stringify(s),r=propose(s,w,'sephardic',profiles[1].id);assert.equal(r.hebrew,'אֽ͏ָהֳלוֹ֙');assert.equal(r.routes.length,2);assert.deepEqual(r.routes.map(r=>r.hebrewColumn),[1,2]);assert(r.routes.flatMap(r=>r.units).every(u=>u.readerRanges===null));assert.equal(JSON.stringify(s),before);
 assert.deepEqual(r.routes.map(r=>r.units[0].fragments.find(f=>f.source.kind==='vowel').proposal.candidatePhonemes),[['ɔ'],['u']]);
});
test('explicit source silence differs from unresolved sounds and combined ownership stays unsplit',()=>{
 const r=report('gen-1-1-2'),silent=fragments(r).find(f=>f.source.categoryId==='ALEF_0MAPIQ_ML');assert.deepEqual(silent.proposal.candidatePhonemes,[]);assert.equal(silent.proposal.status,'proposed');
 for(const id of['deu-32-6-1','deu-32-6-2']){const r=report(id);assert(r.routes.flatMap(r=>r.units).every(u=>u.ownerWordId===null&&u.occurrenceId===null));assert(r.routes.flatMap(r=>r.units).some(u=>u.vowelYodProposal?.candidatePhonemes.join(' ')==='ɔ j'));assert.equal(r.phonemes,null);assert(r.counts.contextGaps>0);}
 const w=word('gen-1-1-2'),s=lib.study(w,'sephardic');for(const id of['first','repeat']){const r=propose(s,{...w,id,sourceWordId:w.id},'sephardic',profiles[0].id);assert(r.routes[0].units.every(u=>u.occurrenceId===id));}
});
test('unknown profile, altered marks and categories refuse rather than guessing; unavailable books retain exact Hebrew',()=>{
 const w=word('gen-1-1-2'),s=lib.study(w,'sephardic');assert.throws(()=>propose(s,w,'sephardic','galician'),/Unknown/);assert.throws(()=>propose(s,{...w,sourceHebrew:'ברא'},'sephardic',profiles[0].id),/marked Hebrew/);const bad=structuredClone(s);bad.rows[0].styles.sephardic[0].units[0].sourceSegments.variants[0].segments[0].categoryId='unknown';assert.throws(()=>propose(bad,w,'sephardic',profiles[0].id),/category/);
 const r=propose(null,{id:'isa-42-5-1',sourceHebrew:'כֹּֽה־'},'sephardic',profiles[1].id);assert.equal(r.hebrew,'כֹּֽה־');assert.equal(r.sourceCategoryStatus,'source-categories-unavailable');assert.deepEqual(r.routes,[]);
});
test('a broken shared-consonant reference is withheld in its own route without inventing or doubling a phoneme',()=>{
 const w=word('gen-8-20-7'),s=lib.study(w,'sephardic');s.rows[0].styles.sephardic[0].units[0].sourceSegments.variants[0].segments.at(-1).sharedWithUnitId='missing';
 const r=propose(s,w,'sephardic',profiles[0].id),halves=fragments(r).filter(f=>f.source.categoryId==='BET_1DAG_XAZAQ');assert.equal(halves.length,2);assert(halves.every(f=>f.proposal.candidatePhonemes===null));assert(r.routes[0].gaps.some(g=>g.reason==='shared-consonant-counterpart-missing'));assert(r.routes[0].events.filter(e=>e.sourceSegmentIds.some(id=>halves.some(f=>f.source.id===id))).every(e=>e.candidatePhonemes===null));
});
test('normal and portable builds expose independently labeled research proposals with embedded coverage evidence',()=>{
 const doc=read('docs/PRONUNCIATION-PHONOLOGY.json'),normal=read('index.html').toString(),portable=restoredPortableHtml(read('TropeTrain.html')).toString();assert(normal.includes('id="phonology-profile"'));assert(normal.indexOf('id="phonology-study"')>normal.indexOf('id="historical-pronunciation-study"'));assert(portable.includes(doc.toString('base64')));assert(portable.includes('tropetrain-phonology-word-proposal-v1'));const audit=JSON.parse(doc);assert.equal(audit.results.length,4);assert(audit.results.every(m=>m.readerWords===79985&&m.unassignedReferences>0));assert.equal(audit.invariants.acousticRealizations,0);
});

test('patah and qamats followed by source yod keep a two-constituent proposal within their original syllable',()=>{
 for(const [id,pair]of[['gen-3-22-21',['a','j']],['deu-32-6-1',['ɔ','j']]])for(const profile of[0,1])for(const style of['sephardic','ashkenazic']){
  const w=word(id),study=lib.study(w,style),before=JSON.stringify(study),r=propose(study,w,style,profiles[profile].id),route=r.routes[0],unit=route.units.find(u=>u.vowelYodProposal),p=unit.vowelYodProposal;
  assert.deepEqual(p.candidatePhonemes,pair);assert.equal(p.sourceSegmentIds.length,2);assert.equal(new Set(p.eventIds).size,2);assert.deepEqual(p.eventIds.flatMap(id=>route.events.find(e=>e.id===id).candidatePhonemes),pair);
  assert.deepEqual(p.sourceSegmentIds,[unit.fragments.at(-2).source.id,unit.fragments.at(-1).source.id]);assert(unit.context.beforeYodOrMappiq);assert.equal(unit.context.historicalClosure,'closed');
  for(const k of['phonemes','enginePhones','quantity','duration','noteIds','audioTimes','review'])assert.equal(p[k],null);assert.equal(JSON.stringify(study),before);assert(route.gaps.some(g=>g.reason==='vowel-yod-phonetics-needs-review'));assert.equal(r.playable,false);
 }
});
test('constituent yod does not select a regional vowel or change source text and repeated ownership',()=>{
 const id='gen-3-22-21',w=word(id),study=lib.study(w,'sephardic'),a=propose(study,w,'sephardic',profiles[0].id),b=propose(study,{...w,id:'repeated-word',sourceWordId:id},'sephardic',profiles[1].id);
 assert.deepEqual(a.routes[0].units[0].fragments[1].proposal.candidatePhonemes,['ɔ']);assert.deepEqual(b.routes[0].units[0].fragments[1].proposal.candidatePhonemes,['u']);assert.equal(a.hebrew,b.hebrew);assert.equal(b.wordId,'repeated-word');assert(b.routes[0].units.every(u=>u.occurrenceId==='repeated-word'));assert.deepEqual(a.routes[0].units.map(u=>u.readerRanges),b.routes[0].units.map(u=>u.readerRanges));assert.deepEqual(a.routes[0].units.map(u=>u.sourceText),b.routes[0].units.map(u=>u.sourceText));
});
test('holam/shuruq compounds and nonterminal or multiple-nucleus yod remain unresolved',()=>{
 for(const id of['gen-12-2-2','exo-38-17-8'])for(const profile of[0,1]){const r=report(id,profile),u=r.routes.flatMap(r=>r.units).find(u=>u.fragments.some(f=>f.source.categoryId==='YOD_0DAG_PART2_OF_DIPHTHONG'));assert.equal(u.vowelYodProposal,null);assert.equal(u.fragments.at(-1).proposal.candidatePhonemes,null);assert(r.routes.some(r=>r.gaps.some(g=>g.reason==='unreviewed-diphthong-sequence')));}
 for(const mutation of['nonterminal','multiple-nuclei']){const w=word('gen-3-22-21'),s=lib.study(w,'sephardic'),segments=s.rows[0].styles.sephardic[0].units.at(-1).sourceSegments.variants[0].segments,extra=structuredClone(segments[mutation==='nonterminal'?0:1]);extra.id+='-probe';if(mutation==='nonterminal')segments.push(extra);else segments.splice(1,0,extra);const r=propose(s,w,'sephardic',profiles[0].id),u=r.routes[0].units.at(-1);assert.equal(u.vowelYodProposal,null);assert.equal(u.fragments.find(f=>f.source.categoryId==='YOD_0DAG_PART2_OF_DIPHTHONG').proposal.candidatePhonemes,null);}
});
test('whole-Torah coverage distinguishes constituent proposals from reviewed phonetic sequences',()=>{
 const audit=JSON.parse(read('docs/PRONUNCIATION-PHONOLOGY.json'));assert.equal(audit.revision,3);for(const m of audit.results){assert.equal(m.vowelYodConstituentPairs,2272);assert.deepEqual(m.vowelYodCategories,{QAMATS_G:1964,PATAX:308});assert.equal(m.unassignedCategories.YOD_0DAG_PART2_OF_DIPHTHONG,44);assert.equal(m.unassignedReferences,m.profileId.includes('northeastern')?20313:20456);assert.equal(m.contextGaps['vowel-yod-phonetics-needs-review'],2272);assert.equal(m.contextGaps['unreviewed-diphthong-sequence'],44);assert.equal(m.events,500476);assert.equal(m.sharedEvents,18250);assert.equal(m.readerWords,79985);assert.equal(m.maqafPrimaryUnits,15228);assert.equal(m.maqafMetegUnits,2835);assert.equal(m.stress['not-established'],519);assert.equal(m.newMaqafSegolReferences,m.profileId.includes('mideastern')?45:0);const pin=audit.priorKnownBaseline.pins[m.sourceStyle+'|'+m.profileId];assert.equal(m.preservedPriorKnownReferences,pin.count);assert.equal(m.preservedPriorKnownSha256,pin.sha256);}
 assert(audit.source.scanLimits.includes('appended as PDF page48'));assert.equal(audit.newSingingVoice,null);const ui=read('pronunciation-phonology-ui.js').toString();assert(ui.includes('phonology-vowel-yod'));assert(ui.includes('phonetic transition and singing remain unassigned'));
});
