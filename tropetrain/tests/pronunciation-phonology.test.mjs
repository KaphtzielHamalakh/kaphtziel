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
 const unmarked=report('gen-1-4-3',1);assert.equal(unmarked.routes[0].units[0].context.primaryStress,null);assert.equal(unmarked.routes[0].units[0].context.stressBasis,'not-established');
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
 for(const id of['deu-32-6-1','deu-32-6-2']){const r=report(id);assert(r.routes.flatMap(r=>r.units).every(u=>u.ownerWordId===null&&u.occurrenceId===null));assert(fragments(r).some(f=>f.source.kind==='diphthong-part'&&f.proposal.candidatePhonemes===null));assert(r.counts.contextGaps>0);}
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
 const doc=read('docs/PRONUNCIATION-PHONOLOGY.json'),normal=read('index.html').toString(),portable=read('TropeTrain.html').toString();assert(normal.includes('id="phonology-profile"'));assert(normal.indexOf('id="phonology-study"')>normal.indexOf('id="historical-pronunciation-study"'));assert(portable.includes(doc.toString('base64')));assert(portable.includes('tropetrain-phonology-word-proposal-v1'));const audit=JSON.parse(doc);assert.equal(audit.results.length,4);assert(audit.results.every(m=>m.readerWords===79985&&m.unassignedReferences>0));assert.equal(audit.invariants.acousticRealizations,0);
});
