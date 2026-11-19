import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {spawnSync} from 'node:child_process';
import {ReferenceLibrary} from '../reference-library.js';
import {splitReferenceSegments,RecordingPlayer} from '../recorded-reference.js';
import {Corpus} from '../library.js';
import {createReadingModel} from '../music.js';
const read=name=>readFileSync(new URL('../'+name,import.meta.url));
const library=new ReferenceLibrary(JSON.parse(gunzipSync(read('data/references/torah-library.json.gz'))));
const corpus=new Corpus({manifest:JSON.parse(read('data/torah/manifest.json')),books:['gen','exo','lev','num','deu'].map(id=>JSON.parse(read(`data/torah/${id}.json`)))});
const model=(bookId,chapter,verse)=>createReadingModel(corpus.passage([{id:'fixture',bookId,start:{chapter,verse},end:{chapter,verse}}]));

test('all original source characters, word order and timing files agree with the independent source-pack audit',()=>{
  const result=spawnSync('python3',['scripts/verify-reference-sources.py'],{cwd:new URL('..',import.meta.url),encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);const proof=JSON.parse(result.stdout);assert.equal(proof.originalFiles,384);assert.equal(proof.readerWords,79985);assert.equal(proof.sourceWords,79986);
});
test('the reference catalog covers every Torah word exactly once and keeps all original timing problems',()=>{
  assert.equal(library.parts.length,54);assert.equal(library.recordings.length,378);assert.equal(library.byWord.size,79985);
  for(const book of corpus.books)for(const chapter of book.chapters)for(const verse of chapter.verses)for(const token of verse.tokens){
    if(token.kind==='k'||!/[א-ת]/u.test(token.sourceHebrew))continue;
    const entry=library.byWord.get(token.id);assert.ok(entry);assert.equal(entry.word.uxlcHebrew,token.sourceHebrew);
  }
  assert.equal(library.recordings.filter(r=>r.status==='aligned').length,370);
  assert.deepEqual(library.recordings.filter(r=>r.status==='timing-review').map(r=>r.title),['Shemot · aliyah 1','Shemot · aliyah 5','Shemot · aliyah 7','Tetzaveh · aliyah 1','Tetzaveh · aliyah 3','Shmini · aliyah 6','Nasso · aliyah 4','Eikev · aliyah 3']);
});
test('Decalogue verse numbers and the two-to-one Numbers word boundary remain distinct in both editions',()=>{
  const renamed=library.byWord.get('exo-20-14-1').word;assert.equal(renamed.verse,13);assert.equal(renamed.ordinal,3);assert.equal(renamed.readerVerse,14);assert.equal(renamed.readerOrdinal,1);
  const merged=library.byWord.get('num-12-9-1').word;assert.equal(merged.sourceHebrew,'וַיִּֽחַר אַ֧ף');assert.equal(merged.uxlcHebrew,'וַיִּֽחַרְאַ֧ף');assert.equal(merged.sourceWords.length,2);assert.equal(merged.comparison,'source-boundaries');
  const words=model('num',12,9).words,selection=library.selection(words,0,0);assert.equal(selection[0].startSeconds,185.171011);assert.equal(selection[0].endSeconds,187.289832);
});
test('all Genesis words and cross-file boundaries remain playable without changing source text',()=>{
  const reading=createReadingModel(corpus.passage([{id:'all-gen',bookId:'gen',start:{chapter:1,verse:1},end:{chapter:50,verse:26}}]));
  const before=reading.words.map(w=>w.sourceHebrew).join('|'),plan=library.selection(reading.words,0,reading.words.length-1);
  assert.equal(plan.length,20614);assert.equal(library.recordsFor(plan).length,84);assert.equal(splitReferenceSegments(plan).length,84);assert.equal(reading.words.map(w=>w.sourceHebrew).join('|'),before);
  const words=model('deu',6,4).words;assert.equal(library.recordsFor(library.selection(words,0,words.length-1))[0].audio.filename,'Vaethanan-6.mp3');
});
test('unreliable word timing and changed reader text are rejected while full recordings remain in the catalog',()=>{
  const words=model('exo',1,1).words;assert.throws(()=>library.selection(words,0,0),/unreliable source timings/);
  assert.ok(library.byWord.get(words[0].sourceWordId).recording.audio.sha1);assert.equal(library.byWord.get(words[0].sourceWordId).word.startSeconds,null);
  const changed={...model('deu',6,4).words[0],sourceHebrew:'א'};assert.throws(()=>library.selection([changed],0,0),/source changed/);
});
class Media extends EventTarget {
  constructor(){super();this.readyState=1;this.duration=100;this.currentTime=0;this.paused=true;this.plays=0;this.source='old';}
  getAttribute(){return this.source;}
  set src(value){this.source=value;this.readyState=0;}
  get src(){return this.source;}
  load(){this.readyState=1;this.duration=this.source==='b'?200:100;this.dispatchEvent(new Event('loadedmetadata'));}
  async play(){this.plays++;this.paused=false;}
  pause(){this.paused=true;}
}
const settle=()=>new Promise(resolve=>setImmediate(resolve));
test('reference playback switches files at real media ends and retains the second occurrence identity',async()=>{
  const media=new Media(),seen=[],loaded=[],frames=new Map();let n=0;
  const player=new RecordingPlayer(media,{resolveSource:async id=>{loaded.push(id);return id;},onWord:w=>{if(w)seen.push(w.occurrenceId);},frame:fn=>{frames.set(++n,fn);return n;},cancelFrame:id=>frames.delete(id)});
  const rows=[{recordingId:'a',referenceIndex:9,startSeconds:99,endSeconds:null,occurrenceId:'one'},{recordingId:'b',referenceIndex:0,startSeconds:2,endSeconds:3,occurrenceId:'two@second'}];
  await player.play(rows);assert.equal(media.currentTime,99);media.currentTime=100;const next=[...frames.values()];frames.clear();next.forEach(fn=>fn());await settle();
  assert.deepEqual(loaded,['a','b']);assert.equal(media.duration,200);assert.equal(media.currentTime,2);assert.equal(seen.at(-1),'two@second');player.stop();assert.equal(media.paused,true);assert.equal(frames.size,0);
});
test('Stop while a source is resolving prevents a later result from changing media or playing',async()=>{
  const media=new Media();let release;
  const player=new RecordingPlayer(media,{resolveSource:()=>new Promise(resolve=>release=resolve),frame:()=>0,cancelFrame:()=>{}});
  const pending=player.playWhole('a');assert.equal(player.starting,true);player.stop();release('new-source');await pending;assert.equal(media.source,'old');assert.equal(media.plays,0);
});
