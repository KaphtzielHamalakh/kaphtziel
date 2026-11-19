import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const read=name=>readFile(path.join(root,name));
const record=JSON.parse(await read('docs/PRINTED-SCORE.json'));
const verse=JSON.parse(await read('data/torah/gen.json')).chapters[21].verses[0];
const expected=[1,4,4,3,3,3,3,3,3,3,3,4,4,3],bars=Array(14).fill(0);
if(record.words.length!==13||record.notes.length!==52)throw Error('Incomplete printed verse.');
for(const [i,word] of record.words.entries()){
  if(word.id!==verse.tokens[i].id||word.sourceHebrew!==verse.tokens[i].sourceHebrew)throw Error('Source Hebrew was changed.');
  if(word.lengths.reduce((a,b)=>a+b,0)!==(word.sourceHebrew.match(/[א-ת]/gu)||[]).length)throw Error('Underlay does not preserve source letters.');
  for(const n of word.notes){
    if(n.wordId!==word.id||!Number.isInteger(n.midi)||n.midi<0||n.midi>127||n.syllableIndex<0||n.syllableIndex>=word.lengths.length)throw Error('Invalid note/source identity.');
    const value={half:2,quarter:1,eighth:.5,'16th':.25}[n.rhythm.type];
    if(Math.abs(value*(n.rhythm.dots?1.5:1)*n.rhythm.normal/n.rhythm.actual-n.quarterBeats)>1e-9)throw Error('Rhythm mismatch.');
    bars[n.bar]+=n.quarterBeats+(n.restAfterBeats??0);
  }
}
if(record.words.flatMap(w=>w.notes).map(JSON.stringify).join()!==record.notes.map(JSON.stringify).join())throw Error('Flat/source-word event order disagrees.');
if(bars.some((value,i)=>Math.abs(value-expected[i])>1e-9))throw Error('Printed bar totals do not balance.');
for(const [name,sha] of [['cohen-1902-genesis22.png',record.scan.sha256],['cohen-1902-alternate-score.png',record.alternateScan.cropSha256]]){
  if(createHash('sha256').update(await read('assets/scores/'+name)).digest('hex')!==sha)throw Error('Source scan changed.');
}
await writeFile(path.join(root,'printed-score-data.js'),'// Generated from the manually checked transcription in docs/PRINTED-SCORE.json.\nexport const printedWords='+JSON.stringify(record.words)+';\n');
console.log('Generated complete source-preserving printed verse: 52 components, 44 beats, 13 words.');
