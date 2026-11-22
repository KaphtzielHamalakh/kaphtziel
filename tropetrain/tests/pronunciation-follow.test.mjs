import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {gunzipSync} from 'node:zlib';
import {PronunciationLibrary} from '../pronunciation.js';import {getCorpus} from '../library.js';import {createReadingModel} from '../music.js';
import {linkPronunciationToNotes} from '../pronunciation-note-links.js';import {pronunciationFollow} from '../pronunciation-follow.js';
const json=f=>JSON.parse(gunzipSync(readFileSync(new URL('../'+f,import.meta.url))));
const lib=new PronunciationLibrary(json('data/pronunciation/torah-display.json.gz'),{underlay:json('data/pronunciation/torah-underlay.json.gz')});
const corpus=await getCorpus();
const model=(chapter,verse,end=verse,melodyId='original-demo-01')=>createReadingModel(corpus.passage([{id:'first',bookId:'gen',start:{chapter,verse},end:{chapter,verse:end}}]),{melodyId});
const plan=m=>m.buildPlan(0,m.words.length-1,{tempo:60,transpose:0});
const follow=(m,events,style)=>linkPronunciationToNotes(events,m.words,lib,style).links.map((l,i)=>pronunciationFollow(events[i],m.words[events[i].wordIndex],l,style));
test('both pronunciation styles follow exact opening-word spans without changing marked Hebrew, notes or source data',()=>{
 const m=model(1,1,3),events=plan(m),before=JSON.stringify([m,events,lib.groups]);
 const a=follow(m,events,'sephardic'),b=follow(m,events,'ashkenazic');
 assert.equal(a.length,events.length);assert(a.some((r,i)=>JSON.stringify(r.units)!==JSON.stringify(b[i].units)));
 for(const reports of [a,b])for(const r of reports){assert.equal(r.phonemes,null);assert.equal(r.audioTimes,null);if(r.status==='exact-written-span')assert(r.units.length);else assert.equal(r.units.length,0);}
 assert.equal(JSON.stringify([m,events,lib.groups]),before);
});
test('a printed melisma keeps the same pronunciation unit across distinct note events',()=>{
 const m=model(1,1,5,'baer-1894-gen1-1-5'),events=plan(m),r=follow(m,events,'sephardic');
 const pair=r.findIndex((x,i)=>i&&x.status==='exact-written-span'&&x.wordId===r[i-1].wordId&&x.units[0].sourceUnitId===r[i-1].units[0]?.sourceUnitId);
 assert(pair>0);assert.notEqual(r[pair].eventId,r[pair-1].eventId);assert(Object.isFrozen(r[pair]));assert(Object.isFrozen(r[pair].units));
});
test('different source syllable divisions are withheld rather than stretched onto a note',()=>{
 const m=model(1,1,5,'baer-1894-gen1-1-5'),r=follow(m,plan(m),'ashkenazic'),unlinked=r.filter(x=>x.reason==='different-syllable-boundaries');
 assert(unlinked.length>0);for(const x of unlinked){assert.equal(x.status,'unlinked');assert.deepEqual(x.units,[]);}
});
test('source-only Hebrew forms remain word-linked without an invented syllable highlight',()=>{
 const m=model(4,18),r=follow(m,plan(m),'sephardic').filter(x=>x.sourceWordId==='gen-4-18-9');
 assert(r.length);assert(r.every(x=>x.reason==='source-only-written-form'&&x.units.length===0));
});
test('repeated assignment words never borrow the other occurrence highlight',()=>{
 const range={bookId:'gen',start:{chapter:1,verse:1},end:{chapter:1,verse:1}},m=createReadingModel(corpus.passage([{id:'first',...range},{id:'again',...range}])),events=plan(m),r=follow(m,events,'sephardic');
 const ids=r.filter(x=>x.sourceWordId==='gen-1-1-1').map(x=>x.wordId);assert.equal(new Set(ids).size,2);
 const i=events.findIndex(e=>e.wordId===ids[0]),j=events.findIndex(e=>e.wordId===ids.at(-1)),links=linkPronunciationToNotes(events,m.words,lib,'sephardic').links;
 assert.throws(()=>pronunciationFollow(events[i],m.words[events[i].wordIndex],links[j],'sephardic'),/occurrence/);
});
test('transposition and tempo leave pronunciation highlighting identities and syllables unchanged',()=>{
 const m=model(22,19,19,'baer-1894-gen22-19'),a=plan(m),b=m.buildPlan(0,m.words.length-1,{tempo:80,transpose:2});
 assert.deepEqual(follow(m,a,'sephardic'),follow(m,b,'sephardic'));assert.equal(b[0].midi,a[0].midi+2);assert.notEqual(b[0].durationSeconds,a[0].durationSeconds);
});
test('changed marked Hebrew, stale note IDs, ranges and unsupported styles refuse highlighting',()=>{
 const m=model(1,1),events=plan(m),e=events[0],w=m.words[e.wordIndex],link=linkPronunciationToNotes([e],m.words,lib,'sephardic').links[0];
 assert.throws(()=>pronunciationFollow(e,{...w,sourceHebrew:'changed'},link,'sephardic'),/marked Hebrew/);
 for(const change of [l=>l.eventId+='changed',l=>l.wordId+='changed',l=>l.syllableId+='changed',l=>l.hebrewRange.end++,l=>l.units=[]]){const bad=structuredClone(link);change(bad);assert.throws(()=>pronunciationFollow(e,w,bad,'sephardic'));}
 assert.throws(()=>pronunciationFollow(e,w,link,'galician'),/Unsupported/);
});
