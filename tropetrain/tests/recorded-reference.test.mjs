import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {referenceIndex,referenceSelection,referenceSegments,referenceWordAt,RecordingPlayer} from '../recorded-reference.js';
import {Corpus} from '../library.js';
import {createReadingModel} from '../music.js';

const bytes=name=>readFileSync(new URL('../'+name,import.meta.url));
const recording=JSON.parse(bytes('data/references/pockettorah-bereshit-1.json'));
const index=referenceIndex(recording);
const corpus=new Corpus({manifest:JSON.parse(bytes('data/torah/manifest.json')),books:[JSON.parse(bytes('data/torah/gen.json'))]});
const opening=()=>createReadingModel(corpus.passage([{id:'reference',...recording.coverage}])).words;
const select=(a=0,b=a)=>referenceSelection(opening(),a,b,index);
const duration=449.515;

test('recorded audio and timing files retain original source checksums and license evidence',()=>{
  for(const name of ['Bereshit-1.mp3','Bereshit-1.txt']){
    const data=bytes('assets/references/'+name),source=recording.sourceFiles[name];
    assert.equal(data.length,source.bytes);
    assert.equal(createHash('sha256').update(data).digest('hex'),source.sha256);
    assert.equal(createHash('sha1').update(`blob ${data.length}\0`).update(data).digest('hex'),source.gitBlob);
  }
  assert.equal(createHash('sha1').update(bytes('assets/references/Bereshit-1.mp3')).digest('hex'),'755c6e9918ba2021bba8b33c46db309c115620d6');
  const times=bytes('assets/references/Bereshit-1.txt').toString().trim().split(',').map(Number);
  assert.equal(times.length,469);assert.deepEqual(recording.words.map(w=>w.startSeconds),times);
  assert.equal(recording.audioLicense.id,'CC-BY-SA-3.0');assert.equal(recording.originalTimingLicense.id,'CC-BY-SA-2.5');
  assert.equal(recording.individualReader,null);assert.equal(recording.review.reviewer,null);
});
test('original WLC source tokens, editorial notes and both exact Hebrew editions are retained',()=>{
  const xml=bytes('data/references/pockettorah-opening-source.xml').toString();
  const original=[...xml.matchAll(/<w>([\s\S]*?)<\/w>/g)].map(m=>({token:m[1].replace(/<x>.*?<\/x>/g,''),notes:[...m[1].matchAll(/<x>(.*?)<\/x>/g)].map(n=>n[1])}));
  assert.equal(original.length,469);
  recording.words.forEach((w,i)=>{
    assert.equal(w.sourceToken,original[i].token);assert.equal(w.sourceHebrew,w.sourceToken.replaceAll('/',''));
    assert.deepEqual(w.editorialNotes.map(n=>n.code),original[i].notes);
    assert.doesNotMatch(w.sourceHebrew,/[A-Za-z]/);
  });
  const words=opening(),snapshot=JSON.stringify(words);referenceSelection(words,0,words.length-1,index);assert.equal(JSON.stringify(words),snapshot);
  assert.deepEqual(recording.comparisonCounts,{exact:458,'joiner-only':10,'source-difference':1});
  const changed=recording.words.filter(w=>w.comparison==='source-difference');assert.deepEqual(changed.map(w=>w.id),['gen-1-11-5']);
  assert.equal(changed[0].sourceHebrew,'דֶּ֔שֶׁא');assert.equal(changed[0].uxlcHebrew,'דֶּ֗שֶׁא');
  assert.deepEqual(recording.words.find(w=>w.id==='gen-1-12-10').editorialNotes.map(n=>n.code),['c','p']);
});
test('reference spans preserve assigned occurrences, discontinuities and unsupported-text rejection',()=>{
  const passage=corpus.passage([{id:'one',bookId:'gen',start:{chapter:1,verse:1},end:{chapter:1,verse:1}},{id:'two',bookId:'gen',start:{chapter:1,verse:1},end:{chapter:1,verse:1}}]);
  const words=createReadingModel(passage).words,selection=referenceSelection(words,0,words.length-1,index),segments=referenceSegments(selection,duration);
  assert.equal(segments.length,2);assert.notEqual(segments[0].words[0].occurrenceId,segments[1].words[0].occurrenceId);
  assert.equal(segments[0].start,segments[1].start);assert.equal(segments[0].end,segments[1].end);
  assert.throws(()=>referenceSelection([{id:'outside',sourceHebrew:'א'}],0,0,index),/beyond/);
  assert.throws(()=>referenceSelection([{...opening()[0],sourceHebrew:'ב'}],0,0,index),/changed/);
  assert.throws(()=>referenceSegments(select(468),440),/duration/);
  assert.throws(()=>referenceSegments(select(0,1),3.8),/outside/);
  const broken=structuredClone(recording);broken.words[1].startSeconds=broken.words[0].startSeconds;assert.throws(()=>referenceIndex(broken),/ordered/);
});
test('source timing boundaries use next word onsets and real media duration for the final word',()=>{
  const [segment]=referenceSegments(select(0,2),duration);
  assert.equal(segment.start,2.028362);assert.equal(segment.end,5.198801);
  assert.equal(referenceWordAt(segment,segment.start).id,'gen-1-1-1');
  assert.equal(referenceWordAt(segment,3.351900).id,'gen-1-1-2');
  assert.equal(referenceWordAt(segment,segment.start-.001),null);assert.equal(referenceWordAt(segment,segment.end),null);
  assert.equal(referenceSegments(select(468),duration)[0].end,duration);
});

class Media extends EventTarget {
  constructor(){super();this.readyState=1;this.duration=duration;this.currentTime=0;this.paused=true;this.loads=0;this.plays=0;}
  load(){this.loads++;}
  async play(){this.plays++;this.paused=false;if(this.failure)throw this.failure;}
  pause(){this.paused=true;}
}
function playerFixture(media=new Media()){
  let n=0;const frames=new Map(),seen=[],errors=[];let ended=0;
  const player=new RecordingPlayer(media,{frame:f=>{frames.set(++n,f);return n;},cancelFrame:id=>frames.delete(id),onWord:w=>seen.push(w?.occurrenceId??null),onEnd:()=>ended++,onError:e=>errors.push(e)});
  return {player,media,seen,errors,get ended(){return ended;},step(){const batch=[...frames.values()];frames.clear();batch.forEach(f=>f());},get frameCount(){return frames.size;}};
}
test('reference player follows source words, stops at the selected boundary and clears its timer',async()=>{
  const f=playerFixture();await f.player.play(select(0,1));assert.equal(f.media.currentTime,2.028362);assert.equal(f.player.running,true);assert.equal(f.seen.at(-1),'gen-1-1-1');
  f.media.currentTime=3.36;f.step();assert.equal(f.seen.at(-1),'gen-1-1-2');
  f.media.currentTime=4.014584;f.step();assert.equal(f.player.running,false);assert.equal(f.media.paused,true);assert.equal(f.frameCount,0);assert.equal(f.ended,1);
});
test('Stop cancels metadata loading and a later metadata event cannot restart audio',async()=>{
  const media=new Media();media.readyState=0;const f=playerFixture(media),pending=f.player.play(select());
  assert.equal(f.player.starting,true);assert.equal(media.loads,1);f.player.stop();media.readyState=1;media.dispatchEvent(new Event('loadedmetadata'));await pending;
  assert.equal(media.plays,0);assert.equal(media.paused,true);assert.equal(f.player.running,false);assert.equal(f.frameCount,0);assert.equal(f.errors.length,0);
});
test('recording playback handles repeated/reordered sections and a live repeat switch',async()=>{
  const f=playerFixture(),a=select(1)[0],b={...select(0)[0],occurrenceId:'gen-1-1-1@again'};
  await f.player.play([a,b],true);f.media.currentTime=a.endSeconds;f.step();await Promise.resolve();
  assert.equal(f.media.currentTime,b.startSeconds);assert.equal(f.seen.at(-1),b.occurrenceId);
  f.media.currentTime=b.endSeconds;f.step();await Promise.resolve();assert.equal(f.media.currentTime,a.startSeconds);
  f.player.repeat=false;f.media.currentTime=a.endSeconds;f.step();await Promise.resolve();f.media.currentTime=b.endSeconds;f.step();assert.equal(f.ended,1);assert.equal(f.frameCount,0);
});
test('reference errors recover without sound or a stale play promise restarting a stopped player',async()=>{
  const f=playerFixture();f.media.failure=Error('Decode failed');await f.player.play(select());assert.equal(f.media.paused,true);assert.equal(f.player.running,false);assert.equal(f.errors[0].message,'Decode failed');
  let resolve;delete f.media.failure;f.media.play=()=>{f.media.plays++;f.media.paused=false;return new Promise(r=>resolve=r);};
  const pending=f.player.play(select());f.player.stop();resolve();await pending;assert.equal(f.player.running,false);assert.equal(f.media.paused,true);assert.equal(f.frameCount,0);
});
