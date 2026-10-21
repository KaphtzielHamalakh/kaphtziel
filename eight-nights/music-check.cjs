const fs=require('fs'),vm=require('vm');
const fixture=fs.readFileSync(__dirname+'/logic-check.cjs','utf8');
new Function('require','__dirname',fixture+`\nvm.runInContext(\`
let made=0,stopped=0;const waves=new Set(),pitches=new Set(),starts=[];
audio={state:'running',currentTime:0,destination:{},createOscillator(){made++;return {frequency:{setValueAtTime(n,t){pitches.add(Math.round(n));}},connect(){},disconnect(){},start(t){starts.push(t);waves.add(this.type);},stop(){stopped++;}};},createGain(){return {gain:{setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){}};}};
sound=true;state=fresh();mode='play';enter('town');assert.ok(MusicEngine.melody.length>=64,'long multi-phrase melody');assert.ok(Math.abs(MusicEngine.midi(69)-440)<.001);
for(let t=0;t<24;t+=.05){audio.currentTime=t;MusicEngine.tick();}assert.ok(made>100,'layered arrangement');assert.ok(waves.has('square')&&waves.has('triangle'));assert.ok(pitches.size>15,'varied pitches and accompaniment');
const before=made;audio.state='interrupted';MusicEngine.tick();assert.equal(made,before,'no voices while interrupted');audio.state='running';audio.currentTime=60;MusicEngine.tick();assert.ok(made>before,'resume after long gap');assert.ok(made-before<20,'no catch-up burst');
MusicEngine.stop();assert.ok(stopped>=made,'mute stops all active voices');sound=false;const muted=made;MusicEngine.tick();assert.equal(made,muted);
sound=true;mode='play';enter('l15');audio.currentTime=61;MusicEngine.tick();audio.currentTime=61.4;MusicEngine.tick();assert.ok(waves.has('sawtooth'),'boss percussion voice');
console.log('PASS: long Maoz Tzur score, layered lead/bass/arpeggios, varied pitches, interruption recovery, bounded scheduling, mute and boss arrangement');
\`,sandbox);`)(require,__dirname);
