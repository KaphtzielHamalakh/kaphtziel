import {restoredPortableHtml,portableFileBytes} from './portable-artifact.mjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {VOICE_STUDIES,voiceStudy,voiceRecording,voiceAudioRecord,voiceSpan,restoreVoicePreferences} from '../voice-studies.js';
import {VoiceStudyPlayer} from '../voice-study-player.js';
import {createReadingModel,melodyProfiles} from '../music.js';
import {passage} from '../passage.js';

const bytes=name=>readFileSync(new URL('../'+name,import.meta.url));
test('all six earlier source originals retain exact licensed bytes and independent source pronunciation/delivery identifiers',()=>{
  assert.deepEqual(VOICE_STUDIES,JSON.parse(bytes('docs/VOICE-STUDIES.json')));
  assert.equal(VOICE_STUDIES.recordings.length,72);assert.equal(VOICE_STUDIES.studies.length,5);
  let total=0;
  for(const r of VOICE_STUDIES.recordings.filter(r=>!['fellman-rh-2018','asael-bereshit'].includes(r.studyId))){
    const raw=bytes(r.audio.file);total+=raw.length;assert.equal(raw.length,r.audio.bytes);
    for(const algorithm of ['sha1','sha256'])assert.equal(createHash(algorithm).update(raw).digest('hex'),r.audio[algorithm]);
    assert.equal(voiceRecording(r.studyId,r.pronunciationId,r.deliveryId),r);
    assert.equal(r.audio.mimeType,r.id==='bard-torah-2021'?'audio/mp4':'audio/mpeg');
    assert.equal(r.license.id,r.performer==='Alex Foreman'?'CC-BY-4.0':'CC-BY-SA-4.0');
    for(const field of ['timedWords','syllableAlignment','phonemes','musicalNotes','independentReview'])assert.equal(r[field],null);
    assert.ok(r.sourceUrl.startsWith('https:'));assert.ok(r.audio.estimatedDurationSeconds>60);
  }
  assert.equal(total,36784196);
});
test('two Tiberian pronunciation readings each have a distinct spoken and source-labeled melodic performance',()=>{
  const study=voiceStudy('foreman-genesis'),ids=new Set();
  for(const p of study.pronunciations)for(const d of study.deliveries){const r=voiceRecording(study.id,p.id,d.id);ids.add(r.id);}
  assert.equal(ids.size,4);assert.deepEqual(study.deliveries.map(d=>d.kind),['chanted','spoken']);
  assert.deepEqual(study.coverage,{bookId:'gen',start:{chapter:1,verse:1},end:{chapter:1,verse:13}});
  assert.equal(voiceStudy('seed-esther').coverage,null);
  assert.equal(voiceStudy('bard-torah').coverage,null);
  assert.throws(()=>voiceRecording('bard-torah','forte-lene','spoken'),/does not provide/);
  assert.throws(()=>voiceRecording('seed-esther','forte-lene','spoken'),/does not provide/);
  assert.throws(()=>voiceStudy('invented'),/available/);
  assert.deepEqual(melodyProfiles.map(p=>p.id),['original-demo-01','cohen-1902-gen22-ending','baer-1894-gen1-1-5','cohen-1902-gen22-prophetical','baer-1894-gen22-19','cohen-1902-gen22-penitential','idelsohn-1929-vol5-no268','idelsohn-1929-vol5-no266','baer-1894-no111-gen2-3-upper','baer-1894-no111-gen2-3-lower','baer-1894-no111-exo13-21-written','baer-1894-no46-deu11-21-upper','baer-1894-no46-deu11-21-lower']);
});
test('source selection and runtime URL resolution leave all Hebrew, marks, syllables and instrument events unchanged',()=>{
  const model=createReadingModel(passage),before=JSON.stringify(model.words),events=JSON.stringify(model.events);
  for(const r of VOICE_STUDIES.recordings){
    const runtime=voiceAudioRecord(r,'https://kaphtziel.com/tropetrain/');
    assert.equal(runtime.audio.url,'https://kaphtziel.com/tropetrain/'+r.audio.file);
    assert.equal(!!runtime.audio.localFile,r.id==='seed-esther-2011');
    assert.equal(r.audio.url,undefined);assert.equal(r.audio.localFile,undefined);
  }
  assert.equal(JSON.stringify(model.words),before);assert.equal(JSON.stringify(model.events),events);
});
test('seconds spans reject ambiguous or out-of-source bounds, and saved preferences cannot invent a preset or erase whole-take selection',()=>{
  assert.deepEqual(voiceSpan(1,null,3),{start:1,end:3});assert.deepEqual(voiceSpan(1,3.0004,3),{start:1,end:3});
  for(const [a,b,d] of [[-1,2,3],[3,4,3],[1,1,3],[0,4,3],[NaN,2,3],[0,null,Infinity]])assert.throws(()=>voiceSpan(a,b,d));
  const saved={studyId:'foreman-genesis',pronunciationId:'extended-forte',deliveryId:'spoken',volume:0,repeat:true,spans:{'foreman-gen-extended-spoken':{start:2,end:null},bad:{start:1,end:2}}};
  const restored=restoreVoicePreferences(saved);assert.equal(restored.repeat,true);assert.deepEqual(restored.spans,{'foreman-gen-extended-spoken':{start:2,end:null}});
  assert.equal(restoreVoicePreferences({...saved,pronunciationId:'Galician'}).studyId,'seed-esther');
  assert.equal(restoreVoicePreferences({...saved,volume:1000}).volume,0);
  assert.equal('tempo' in restored,false);assert.equal('transpose' in restored,false);assert.equal('melodyId' in restored,false);
});

class Media extends EventTarget {
  constructor(){super();this.readyState=1;this.duration=10;this.currentTime=0;this.paused=true;this.plays=0;this.loads=0;this.attributes={src:'fixture'};}
  getAttribute(name){return this.attributes[name];}
  set src(value){this.attributes.src=value;}
  load(){this.loads++;}
  async play(){this.plays++;this.paused=false;if(this.failure)throw this.failure;}
  pause(){this.paused=true;}
}
function fixture(media=new Media()){
  let wall=0,n=0,ended=0;const frames=new Map(),positions=[],errors=[];
  const player=new VoiceStudyPlayer(media,{clock:()=>wall,frame:fn=>{frames.set(++n,fn);return n;},cancelFrame:id=>frames.delete(id),onPosition:(...a)=>positions.push(a),onEnd:()=>ended++,onError:e=>errors.push(e)});
  return {media,player,positions,errors,get ended(){return ended;},get frames(){return frames.size;},setTime:n=>{wall=n;},step(){const batch=[...frames.values()];frames.clear();for(const fn of batch)fn();}};
}
test('muted reference practice uses a monotonic clock and naturally stops at the selected second without media.play',async()=>{
  const f=fixture();await f.player.play('fixture',{start:2,end:4,expectedDuration:10});
  assert.equal(f.media.plays,0);assert.equal(f.media.paused,true);assert.equal(f.player.mode,'muted');
  f.setTime(1.5);f.step();assert.equal(f.positions.at(-1)[0],3.5);
  f.setTime(2);f.step();assert.equal(f.player.running,false);assert.equal(f.positions.at(-1)[0],4);assert.equal(f.ended,1);assert.equal(f.frames,0);
});
test('seconds repeats preserve overshoot, accept a live repeat change and never create word alignment',async()=>{
  const f=fixture();await f.player.play('fixture',{start:1,end:3,repeat:true});f.setTime(5.25);f.step();
  assert.equal(f.player.running,true);assert.equal(f.positions.at(-1)[0],2.25);assert.equal(f.positions.at(-1)[1],2);assert.equal(f.media.plays,0);
  f.player.repeat=false;f.setTime(6);f.step();assert.equal(f.ended,1);assert.equal(f.frames,0);
});
test('audio and muted modes switch at the current recording position while preserving original playback speed',async()=>{
  const f=fixture();await f.player.play('fixture',{start:2,end:8});f.setTime(2.25);f.step();await f.player.setVolume(.4);
  assert.equal(f.media.currentTime,4.25);assert.equal(f.media.plays,1);assert.equal(f.media.playbackRate,1);assert.equal(f.player.mode,'audio');
  f.media.currentTime=5.5;await f.player.setVolume(0);assert.equal(f.media.paused,true);f.setTime(3);f.step();assert.equal(f.positions.at(-1)[0],6.25);assert.equal(f.media.plays,1);
  f.player.stop();assert.equal(f.frames,0);assert.equal(f.player.running,false);
});
test('Stop cancels metadata and stale source requests cannot later start a recording',async()=>{
  const media=new Media();media.readyState=0;const f=fixture(media),pending=f.player.play('fixture');
  assert.equal(f.player.starting,true);assert.equal(media.loads,1);f.player.stop();media.readyState=1;media.dispatchEvent(new Event('loadedmetadata'));await pending;
  assert.equal(media.plays,0);assert.equal(f.player.running,false);assert.equal(f.frames,0);assert.equal(f.errors.length,0);
});
test('source-duration disagreement and playback failure stop the player and report the actual problem',async()=>{
  const f=fixture();await f.player.play('fixture',{expectedDuration:20});assert.match(f.errors.at(-1).message,/duration differs/);assert.equal(f.player.running,false);
  await f.player.setVolume(.5);f.media.failure=Error('Playback denied');await f.player.play('fixture',{start:0,end:1});assert.equal(f.errors.at(-1).message,'Playback denied');assert.equal(f.media.paused,true);assert.equal(f.frames,0);
});
test('a stale unmute promise does not block or clear a later generation’s sound transition',async()=>{
  const f=fixture(),resolves=[];f.media.play=()=>{f.media.plays++;f.media.paused=false;return new Promise(resolve=>resolves.push(resolve));};
  await f.player.play('fixture');const old=f.player.setVolume(.5);f.player.stop();await f.player.setVolume(0);await f.player.play('fixture');
  const current=f.player.setVolume(.5);assert.equal(f.media.plays,2);resolves[0]();await old;assert.ok(f.player.enabling);resolves[1]();await current;assert.equal(f.player.enabling,null);
  f.player.stop();assert.equal(f.media.paused,true);
});
test('both distributions preserve the source catalog, explicit delivery labels, original Seed audio and complete rights notices',()=>{
  const normal=bytes('index.html').toString(),standalone=restoredPortableHtml(bytes('TropeTrain.html')).toString(),worker=bytes('sw.js').toString();
  for(const id of ['voice-study-choice','voice-study-pronunciation','voice-study-delivery','voice-study-start','voice-study-end','voice-study-volume','voice-study-stop'])assert.ok(normal.includes(`id="${id}"`));
  const embedded=standalone.match(/id="voice-study-audio" src="data:audio\/mpeg;base64,([A-Za-z0-9+/=]+)"/);
  assert.ok(embedded);assert.deepEqual(Buffer.from(embedded[1],'base64'),bytes('assets/voice-studies/esther-seed.mp3'));
  assert.ok(standalone.includes('data-audio-base="https://kaphtziel.com/tropetrain/"'));
  assert.ok(standalone.includes(bytes('assets/voice-studies/NOTICE.txt').toString().replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')));
  assert.ok(standalone.includes(bytes('docs/VOICE-STUDIES.json').toString('base64')));assert.ok(worker.includes('./assets/voice-studies/esther-seed.mp3'));
  for(const r of VOICE_STUDIES.recordings.filter(r=>r.studyId==='foreman-genesis'))assert.ok(!worker.includes(r.audio.file),'Large optional originals are loaded explicitly.');
});
