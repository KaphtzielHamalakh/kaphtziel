import {test} from 'node:test';
import assert from 'node:assert/strict';
import {practiceRecovery,latestPracticeRecovery,savePracticeRecovery} from '../practice-recovery.js';
const store=()=>{const map=new Map();return {getItem:key=>map.get(key)??null,setItem:(key,value)=>map.set(key,value)};};
test('unrestored practice recovery keeps the original marked Hebrew and serialized source ranges byte for byte',()=>{
  const raw='{ "ranges":[{"bookId":"deu","start":{"chapter":5,"verse":19},"end":{"chapter":6,"verse":3}}], "text":"לֹ֥֖א תִּֿרְצָ֖ח׃", "tempo":55, "transpose":2 }';
  const saved=practiceRecovery(raw,'Ambiguous source/UXLC numbering','2026-11-20T00:00:00Z'),storage=store();
  assert.equal(savePracticeRecovery(storage,saved),true);const loaded=latestPracticeRecovery(storage);assert.equal(loaded.rawPractice,raw);
  assert.deepEqual(JSON.parse(JSON.parse(JSON.stringify(loaded)).rawPractice),JSON.parse(raw));assert.equal(loaded.reason,saved.reason);
});
test('recovery history deduplicates the same original record and remains bounded to eight distinct originals',()=>{
  const storage=store();for(let i=0;i<12;i++)assert.equal(savePracticeRecovery(storage,practiceRecovery(JSON.stringify({ranges:[i]}),'review')),true);
  const before=latestPracticeRecovery(storage);savePracticeRecovery(storage,before);
  const values=JSON.parse(storage.getItem('tropetrain-practice-recoveries-v1'));assert.equal(values.length,8);assert.equal(new Set(values.map(value=>value.rawPractice)).size,8);
});
test('failed recovery storage never touches the original practice key and leaves a downloadable in-memory record',()=>{
  const record=practiceRecovery('{"ranges":["original"]}','review');let reads=0,writes=0;
  const storage={getItem:key=>{assert.equal(key,'tropetrain-practice-recoveries-v1');reads++;return null;},setItem:key=>{assert.equal(key,'tropetrain-practice-recoveries-v1');writes++;throw Error('quota');}};
  assert.equal(savePracticeRecovery(storage,record),false);assert.equal(reads,1);assert.equal(writes,1);assert.equal(record.rawPractice,'{"ranges":["original"]}');
  assert.equal(latestPracticeRecovery({getItem:()=>'{broken'}),null);
});
