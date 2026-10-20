const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
function target() {
  const listeners = {};
  return {listeners, addEventListener(name, fn) { (listeners[name] ??= []).push(fn); },
    emit(name, event = {}) { for (const fn of listeners[name] ?? []) fn(event); },
    setAttribute() {},replaceChildren(){},appendChild(){},querySelector(){return null;},focus(){}, classList: {toggle() {}, contains() {return false;}},
    getBoundingClientRect() {return {left: 0, top: 0, right: 48, bottom: 48};},
    setPointerCapture() {}, hasPointerCapture() {return true;}, releasePointerCapture() {},
    getContext() {return new Proxy({}, {get: (_, key) => key === 'createLinearGradient' || key === 'createRadialGradient' ? () => ({addColorStop() {}}) : () => {}});}, dataset: {}};
}
const right = target(), jump = target();
right.dataset.code = 'ArrowRight'; jump.dataset.code = 'KeyZ';
const elements = new Map();
const document = Object.assign(target(), {body: target(), hidden: false,
  createElement: target, getElementById(id) {
    if (!elements.has(id)) elements.set(id, target()); return elements.get(id);
  }});
document.getElementById('touch-controller').querySelectorAll = () => [right, jump];
const window = Object.assign(target(), {matchMedia: () => ({matches: true, addEventListener() {}})});
const saved = new Map(); sandboxStorage = {getItem: key => saved.get(key), setItem: (key,value) => saved.set(key,value)};
let contexts = [];
window.AudioContext = class {
  constructor() {this.state = 'suspended'; this.sampleRate = 44100; this.destination = {}; this.sources = []; contexts.push(this);}
  resume() {this.state = 'running'; return Promise.resolve();}
  close() {this.state = 'closed'; return Promise.resolve();}
  createBuffer() {return {};}
  createBufferSource() {
    const source = {connect() {}, disconnect() {}, start() {}};
    this.sources.push(source); return source;
  }
};
const sandbox = {document, window, navigator: {audioSession: {}}, requestAnimationFrame() {}, assert, console, right, jump, contexts, localStorage: sandboxStorage};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(__dirname + '/index.html', 'utf8').match(/<script>([\s\S]*?)<\/script>/)[1], sandbox);

// Keep audio inactive: this suite exercises gameplay and drawing.
window.AudioContext = undefined;
vm.runInContext(`
const press = () => { justPressed.KeyZ = true; updateGame(); };
const ticks = n => { for(let i=0;i<n;i++) updateGame(); };
assert.equal(PASSWORDS.length,8); assert.equal(LANDS.length,8);
assert.equal(new Set(LANDS.map(l=>l.kind)).size,8);
assert.throws(()=>buildLevel(9),/1 through 8/);
assert.throws(()=>buildLevel(0),/1 through 8/);
for(const totalLetters of [0,32]) {
 startLevel(true); assert.equal(stats.NextBonusIndex,0);
 stats.totalLetters=totalLetters;
 for(let night=1;night<=8;night++) {
  assert.equal(stats.night,night); assert.equal(gameState,'INTRO'); draw();
  ticks(120); assert.equal(gameState,'PLAY'); draw();
  const before = stats.night; pressInput('KeyN','keyboard'); assert.equal(stats.night,before);
  clearInputs();
  // The boss must be beaten before the menorah can end the level.
  player.x=menorah.x; player.y=193; player.vx=0; player.vy=0;
  player.invulnTimer=1000; enemies=[];icicles=[];items=[];projectiles=[];
  boss.active=false;boss.x=150*16; updateGame(); assert.equal(gameState,'PLAY');
  boss.state='dead'; updateGame(); assert.equal(gameState,'TALLY');draw();
  ticks(220); assert.equal(tally.phase,1);
  press(); assert(dreidelSpin.spinning); ticks(65);assert(dreidelSpin.done);
  press(); assert.equal(gameState,'MENORAH'); assert.equal(stats.night,night);draw();
  press(); assert.equal(gameState,'MENORAH','ceremony cannot be skipped immediately');
  ticks(60); press();
  if(night<8) assert.equal(stats.night,night+1);
 }
 assert.equal(gameState,'VICTORY');assert.equal(stats.night,8);assert(goblinUnlocked);draw();
 const score=stats.score;press();assert.equal(gameState,'VICTORY');
 ticks(240);assert.equal(gameState,'CREDITS');draw();
 ticks(720);assert.equal(character,'goblin');assert.equal(stats.night,1);assert.equal(gameState,'INTRO');
 assert.equal(stats.score,0);assert.equal(stats.lives,3);assert.equal(stats.totalLetters,0);
 assert(stats.letters.every(x=>!x));assert.equal(stats.checkpointLit,false);
 ticks(120);draw();
}
// Death at a checkpoint respawns in the same night, without changing the hero.
stats.night=6;stats.checkpointLit=true;stats.checkpointX=85*16;stats.checkpointY=176;
startLevel(false);ticks(120);killPlayer();hitStop=0;ticks(81);
assert.equal(stats.night,6);assert.equal(character,'goblin');assert.equal(player.x,85*16);
// Every password resolves to exactly one of the eight nights.
for(let i=0;i<8;i++) {
 gameState='PASSWORD';pwEntry=[...PASSWORDS[i]];press();assert.equal(stats.night,i+1);assert.equal(gameState,'INTRO');
}
// A fresh game after losing all lives restores the full campaign state.
gameState='TITLE';titleCursor=0;stats.lives=0;stats.night=6;press();assert.equal(stats.night,1);assert.equal(stats.lives,3);
for(let night=1;night<=8;night++) {
 stats.night=night;buildLevel(night);player=new Hippo(32,160);
 for(const state of ['TITLE','PASSWORD','INTRO','PLAY','TALLY','MENORAH','VICTORY','CREDITS']) {gameState=state;draw();}
}
console.log('PASS: complete eight-night progression twice, boss/ceremony gates, no skip shortcut, no ninth night at any letter total, ending/credits/goblin restart, checkpoint death, all passwords, game-over reset, all land/state drawing paths');
`, sandbox, {timeout: 120000});
