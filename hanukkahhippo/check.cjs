const fs=require('fs'),vm=require('vm'),assert=require('assert');
const noop=()=>{}; const element=()=>({addEventListener:noop,setAttribute:noop,querySelectorAll:()=>[],classList:{toggle:noop,contains:()=>false},getContext:()=>({}),dataset:{}});
const events={};const document={getElementById:element,createElement:element,body:element(),addEventListener:(n,f)=>events[n]=f};
const sandbox={document,window:{addEventListener:noop,matchMedia:()=>({matches:true,addEventListener:noop})},navigator:{audioSession:{}},requestAnimationFrame:noop,console,assert};
vm.createContext(sandbox);
const src=fs.readFileSync(__dirname+'/index.html','utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
vm.runInContext(src,sandbox);
vm.runInContext(`
let resumes=0,starts=0;
window.AudioContext=class {
 constructor(){this.state='suspended';this.sampleRate=44100;this.destination={};}
 resume(){resumes++;this.state='running';return Promise.resolve();}
 createBuffer(){return {};}
 createBufferSource(){return {connect(){},disconnect(){},start(){starts++;}};}
};
sfx.init();assert.equal(navigator.audioSession.type,'playback');assert.equal(resumes,1);assert.equal(starts,1);
sfx.ctx.state='interrupted';sfx.init();assert.equal(resumes,2);
sfx.ctx.state='suspended';sfx.playTone(440,'square',.1);assert.equal(resumes,2);
sfx.ctx=null; window.AudioContext=undefined;
const layouts=new Set();
for(const height of [15,22]) for(let night=1;night<=8;night++) {
 stats.night=night;buildLevel(night);boss=null;gameState='PLAY';
 const original=map.map(r=>r.slice());
 layouts.add(JSON.stringify(original));
 const letters=items.filter(i=>i.type==='letter');assert.equal(letters.length,4);
 for(let x=136;x<175;x++)assert.equal(original[13][x],1);

}
assert.equal(layouts.size,8);console.log('PASS: audio session, suspended/interrupted resume, suspended tone guard, eight distinct maps with four letters and safe boss floors (route-check.cjs verifies traversal)');
`,sandbox,{timeout:120000});
