import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {eventRhythm,eventPitchSpelling} from '../score-data.js';
const root=new URL('../',import.meta.url),read=p=>readFile(new URL(p,root));
const record=JSON.parse(await read('docs/BAER-HIGH-HOLIDAY-SCORE.json'));
const verse=JSON.parse(await read('data/torah/gen.json')).chapters[21].verses[18];
const bars=Array(9).fill(0),expected=[.5,4,4,4,4,4,4,4,3.5],ids=new Set();
if(record.id!=='baer-1894-gen22-19'||record.words.length!==14||record.notes.length!==46)throw Error('Incomplete Baer No113 second setting.');
for(const [i,w] of record.words.entries()){
 if(w.id!==verse.tokens[i].id||w.sourceHebrew!==verse.tokens[i].sourceHebrew||!w.lengths.length||w.lengths.some(n=>!Number.isInteger(n)||n<1)||w.lengths.reduce((a,b)=>a+b,0)!==(w.sourceHebrew.match(/[א-ת]/gu)??[]).length)throw Error('Baer No113 changed marked Hebrew or its underlay partition.');
 for(const n of w.notes){
  if(ids.has(n.id)||n.wordId!==w.id||!Number.isInteger(n.syllableIndex)||n.syllableIndex<0||n.syllableIndex>=w.lengths.length||!Number.isInteger(n.bar)||n.bar<0||n.bar>=bars.length)throw Error('Invalid Baer No113 note identity/underlay.');
  ids.add(n.id);eventRhythm({beats:n.quarterBeats,sourceRhythm:n.rhythm});eventPitchSpelling({...n,sourcePitch:n.pitch,sourceTranspose:0});
  bars[n.bar]+=n.quarterBeats;bars[n.restAfterBar??n.bar]+=n.restAfterBeats??0;
 }
 if(new Set(w.notes.map(n=>n.syllableIndex)).size!==w.lengths.length)throw Error('Unallocated Baer No113 underlay unit.');
}
if(JSON.stringify(record.words.flatMap(w=>w.notes))!==JSON.stringify(record.notes)||bars.some((v,i)=>Math.abs(v-expected[i])>1e-8))throw Error('Baer No113 note order/source bars disagree.');
for(const key of ['slurId','tupletId'])for(const group of Map.groupBy(record.notes.filter(n=>n[key]),n=>n[key]).values())
 if(group[0][key.replace('Id','Phase')]!=='start'||group.at(-1)[key.replace('Id','Phase')]!=='stop')throw Error('Unclosed Baer No113 notation group.');
for(const scan of record.scans){const raw=await read(scan.file);if(raw.length!==scan.bytes||createHash('sha256').update(raw).digest('hex')!==scan.sha256)throw Error('Baer No113 source crop changed.');}
await writeFile(new URL('baer-high-holiday-data.js',root),'// Literal Baer No113, second setting; see docs/BAER-HIGH-HOLIDAY-SCORE.json.\nexport const baerHighHolidayWords='+JSON.stringify(record.words)+';\n');
console.log('Generated Baer No113/II: 14 unchanged words,46 notes,32 beats,five rests; cross-word triplet/slur and final rest retained.');
