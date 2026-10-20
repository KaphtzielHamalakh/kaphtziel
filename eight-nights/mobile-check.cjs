const fs=require('fs');
const fixture=fs.readFileSync(__dirname+'/logic-check.cjs','utf8');
new Function('require','__dirname',fixture+`
sandbox.navigator={audioSession:{}};
vm.runInContext(\`
let resumes=0,starts=0,tones=0;
window.AudioContext=class{
 constructor(){this.state='suspended';this.sampleRate=44100;this.destination={};}
 resume(){resumes++;this.state='running';return Promise.resolve();}
 createBuffer(){return {};}
 createBufferSource(){return {connect(){},disconnect(){},start(){starts++;}};}
 createOscillator(){return {type:'',frequency:{setValueAtTime(){}},connect(){},start(){tones++;},stop(){}};}
 createGain(){return {gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){}};}
};
const button=document.getElementById('sound');
button.onclick();assert.equal(sound,true);assert.equal(audio.state,'running');assert.equal(navigator.audioSession.type,'playback');assert.equal(resumes,1);assert.equal(starts,1);assert.equal(button.textContent,'Sound: on');
audio.state='interrupted';recoverAudio({target:{closest:()=>null}});assert.equal(resumes,2);assert.equal(starts,2);
audio.state='suspended';recoverAudio({target:{closest:()=>true}});assert.equal(resumes,2);button.onclick();assert.equal(sound,true);assert.equal(resumes,3);
button.onclick();assert.equal(sound,false);assert.equal(button.textContent,'Sound: off');recoverAudio();assert.equal(resumes,3);
sound=true;audio.state='suspended';updateSoundButton();assert.equal(button.textContent,'Sound: tap to retry');
audio.state='running';mode='inventory';time=21;update();assert.ok(tones>0,'music continues in inventory');
console.log('PASS: playback audio session, gesture buffer unlock, interrupted/suspended recovery, retry UI, mute, inventory music');
\`,sandbox);
`)(require,__dirname);
