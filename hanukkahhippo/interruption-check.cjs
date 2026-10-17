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
    getContext() {return {};}, dataset: {}};
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
const sandbox = {document, window, navigator: {audioSession: {}}, requestAnimationFrame() {}, assert, console, right, jump, contexts};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(__dirname + '/index.html', 'utf8').match(/<script>([\s\S]*?)<\/script>/)[1], sandbox);
vm.runInContext(`
const down = (button, id) => button.emit('pointerdown', {button:0, pointerId:id, pointerType:'touch', preventDefault(){}});
gameState = 'PLAY';
down(right, 1); assert(keys.ArrowRight);
window.emit('pointerup', {pointerId:1}); assert.equal(keys.ArrowRight, false);
down(right, 2); window.emit('pointercancel', {pointerId:2}); assert.equal(keys.ArrowRight, false);
down(right, 3); window.emit('pointermove', {pointerId:3,buttons:1,clientX:60,clientY:20}); assert.equal(keys.ArrowRight,false);
down(right, 4); down(jump, 5); window.emit('pointerup', {pointerId:5}); assert(keys.ArrowRight); assert.equal(keys.KeyZ,false);
window.emit('touchend', {touches:[]}); assert.equal(keys.ArrowRight,false); assert.equal(pointerInputs.size,0);
down(right, 6); down(jump, 6); assert.equal(keys.ArrowRight,false); assert(keys.KeyZ); clearInputs();
down(right, 7); window.emit('touchcancel', {touches:[{}]}); assert.equal(keys.ArrowRight,false);
down(right, 8); window.emit('blur'); assert(paused); assert.equal(pointerInputs.size,0); assert(!keys.ArrowRight);
const old = sfx.ctx; old.state='running'; old.sources[0].onended();
document.getElementById('resume-button').emit('click');
assert(!paused); assert.notEqual(sfx.ctx,old); assert.equal(old.state,'closed'); assert.equal(sfx.ctx.state,'running');
assert.equal(sfx.ctx.sources.length,1); assert.equal(autoRun,false);
const recovered=sfx.ctx; sfx.unlocked=false; old.sources[0].onended(); assert.equal(sfx.unlocked,false);
recovered.state='interrupted'; recovered.onstatechange(); document.emit('touchend');
assert.notEqual(sfx.ctx,recovered); assert.equal(sfx.ctx.state,'running');
sfx.muted=true; setPaused(true); setPaused(false); assert.equal(sfx.muted,true);
right.hasPointerCapture=()=>{throw Error('capture lost');}; down(right,9); clearInputs(); assert.equal(pointerInputs.size,0); assert(!keys.ArrowRight);
window.emit('pagehide'); assert(paused);
console.log('PASS: global release/cancel, slide-off, independent fingers, last-finger cleanup, reused IDs, touch cancellation, focus loss, fresh audio on Resume, stale callbacks, interrupted recovery, mute preserved, capture exceptions, pagehide');
`, sandbox);
