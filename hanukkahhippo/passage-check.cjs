const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
function target() {
  const listeners = {};
  return {listeners, addEventListener(name, fn) { (listeners[name] ??= []).push(fn); },
    emit(name, event = {}) { for (const fn of listeners[name] ?? []) fn(event); },
    setAttribute() {}, classList: {toggle() {}, contains() {return false;}},
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
function tick(n){for(let i=0;i<n;i++)updateGame();}
function down(){justPressed.ArrowDown=true;updateGame();}
function stand(x){player.x=x+9;player.y=13*TILE-player.h;player.vx=0;player.vy=0;player.grounded=true;clearInputs();}
for(let night=1;night<=8;night++)for(const power of [0,1,2]) {
 stats.night=night;stats.checkpointLit=false;startLevel(false);tick(120);player.setPower(power);
 const entrance=passagePipes[0],exit=entrance.exitX;
 assert.equal(map[13][entrance.x/TILE],1);assert.equal(map[12][entrance.x/TILE],0);
 assert.equal(map[13][exit/TILE],1);assert.equal(map[12][exit/TILE],0);
 assert(exit<shamash.x,'shortcut must not skip the checkpoint');
 gelts[0].collected=true;const surfaceMap=map,surfaceBoss=boss,surfaceGelt=gelts;
 const lettersBefore=[...stats.letters];
 stand(entrance.x);player.grounded=false;down();assert.equal(gameState,'PLAY');
 stand(entrance.x);down();assert.equal(gameState,'PIPE');draw();tick(36);
 assert(activeTunnel);assert.equal(gameState,'PLAY');assert.equal(stats.night,night);
 assert.equal(player.power,power);setPaused(true);assert(paused);setPaused(false);assert(!paused);assert(activeTunnel);assert.equal(boss,null);assert.equal(surfaceWorld.map,surfaceMap);draw();
 // Staying over the arrival pipe cannot instantly bounce back without a new press.
 tick(5);assert(activeTunnel);
 stats.gelt+=3;stand(42*TILE);down();tick(36);
 assert.equal(activeTunnel,null);assert.equal(surfaceWorld,null);assert.equal(map,surfaceMap);assert.equal(boss,surfaceBoss);
 assert.equal(gelts,surfaceGelt);assert(gelts[0].collected);assert.equal(player.power,power);
 assert.equal(player.x,exit+9);assert.equal(stats.night,night);assert.deepEqual([...stats.letters],lettersBefore);
 assert(passagePipes[0].used);assert.equal(gameState,'PLAY');draw();
 // Exit is not a loop back into the secret passage.
 down();assert.equal(gameState,'PLAY');
 // Return through the near pipe restores the entrance and prevents reward farming.
 startLevel(false);tick(120);stand(passagePipes[0].x);const source=passagePipes[0].x;
 down();tick(36);stand(2*TILE);down();tick(36);assert.equal(player.x,source+9);assert(!activeTunnel);assert(passagePipes[0].used);
 // Death underground returns to the surface checkpoint, never to a stale cave map.
 startLevel(false);tick(120);stand(passagePipes[0].x);down();tick(36);
 stats.checkpointLit=true;stats.checkpointX=surfaceWorld.shamash.x;stats.checkpointY=176;
 stats.lives=3;killPlayer();hitStop=0;tick(81);assert(!activeTunnel);assert.equal(surfaceWorld,null);assert.equal(stats.night,night);
 assert.equal(player.x,stats.checkpointX);assert.equal(gameState,'INTRO');
}
console.log('PASS: all eight passages at every power size; grounded entry, animated travel, safe exits before checkpoints, preserved surface state, no auto bounce/re-entry, return pipe, underground death/checkpoint reset, rendering');
`,sandbox,{timeout:120000});
