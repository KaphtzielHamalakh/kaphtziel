import test from 'node:test';
import assert from 'node:assert/strict';
import {requestOfflineReadiness,startOfflineSources} from '../offline-sources.js';
class Channel{
 constructor(){const a={close(){}},b={close(){},postMessage(data){a.onmessage?.({data});}};this.port1=a;this.port2=b;}
}
const worker=(version,ready,seen=[])=>({postMessage(message,ports){seen.push(message.type);ports[0].postMessage({type:'tropetrain-offline-status-result',version,ready});}});
function fixture({portable=false,file=false,controller=worker('0.112.0',true)}={}){
 const label={textContent:''},handlers={},registration={addEventListener(){}},serviceWorker={controller,addEventListener(type,fn){handlers[type]=fn;},async register(){return registration;}},doc={getElementById:id=>id==='offline-status'?label:id==='build-version'?{textContent:'v0.112.0'}:id==='portable-program-proof'&&portable?{}:null};
 return {label,handlers,serviceWorker,options:{document:doc,navigator:{serviceWorker},location:{protocol:file?'file:':'https:'},MessageChannel:Channel}};
}
test('offline ready requires the controlling worker to report the exact displayed version and a complete cache',async()=>{
 for(const [version,ready,expected]of[['0.112.0',true,true],['0.109.0',true,false],['0.112.0',false,false]])assert.equal(await requestOfflineReadiness(worker(version,ready),'0.112.0',{MessageChannel:Channel}),expected);
 assert.equal(await requestOfflineReadiness(null,'0.112.0'),false);
 assert.equal(await requestOfflineReadiness({postMessage(){throw Error('gone');}},'0.112.0',{MessageChannel:Channel}),false);
 assert.equal(await requestOfflineReadiness({postMessage(){}},'0.112.0',{MessageChannel:Channel,timeoutMs:5}),false);
});
test('an old active worker or missing controlling worker never produces a premature offline-ready label during an upgrade',async()=>{
 const f=fixture({controller:worker('0.109.0',true)});await startOfflineSources(f.options);assert.match(f.label.textContent,/Saving/);
 f.serviceWorker.controller=worker('0.112.0',false);await f.handlers.controllerchange();assert.match(f.label.textContent,/Saving/);
 f.serviceWorker.controller=null;await f.handlers.controllerchange();assert.match(f.label.textContent,/Saving/);
 f.serviceWorker.controller=worker('0.112.0',true);await f.handlers.controllerchange();assert.match(f.label.textContent,/saved for offline practice/);
});
test('a downloaded portable copy needs no registration, while its HTTP URL explicitly saves the complete page for reopening',async()=>{
 const local=fixture({portable:true,file:true});local.serviceWorker.register=()=>{throw Error('must not register');};await startOfflineSources(local.options);assert.match(local.label.textContent,/available offline in this portable copy/);
 const messages=[],http=fixture({portable:true,controller:worker('0.112.0',true,messages)});await startOfflineSources(http.options);assert.deepEqual(messages,['tropetrain-save-portable']);assert.match(http.label.textContent,/saved for offline reopening/);
});
test('registration failure and unsupported browsers do not claim that included files were cached',async()=>{
 const f=fixture();f.serviceWorker.register=async()=>{throw Error('offline');};await startOfflineSources(f.options);assert.match(f.label.textContent,/not saved yet/);
 const g=fixture();await startOfflineSources({...g.options,navigator:{}});assert.match(g.label.textContent,/unavailable/);assert(!g.label.textContent.includes('saved for offline'));
});
