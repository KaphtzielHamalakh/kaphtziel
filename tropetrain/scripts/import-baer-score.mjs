import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url),read=name=>readFile(new URL(name,root));
const record=JSON.parse(await read('docs/BAER-GENESIS-SCORE.json'));
const verses=JSON.parse(await read('data/torah/gen.json')).chapters[0].verses.slice(0,5);
const source=verses.flatMap(v=>v.tokens.filter(t=>t.kind!=='k'&&/[א-ת]/u.test(t.sourceHebrew)));
if(record.words.length!==52||record.notes.length!==145||source.length!==52)throw Error('Incomplete Baer No939 example.');
let beats=0;
for(const [i,w] of record.words.entries()){
 if(w.id!==source[i].id||w.sourceHebrew!==source[i].sourceHebrew)throw Error('Baer underlay changed the canonical marked Hebrew.');
 if(w.lengths.length!==w.printedLyrics.length||w.lengths.some(n=>!Number.isInteger(n)||n<1)||w.lengths.reduce((a,b)=>a+b,0)!==(w.sourceHebrew.match(/[א-ת]/gu)??[]).length)throw Error('Invalid Baer Hebrew partition.');
 for(const n of w.notes){
  const p=n.pitch,r=n.rhythm,value={whole:4,half:2,quarter:1,eighth:.5,'16th':.25}[r.type];
  if(n.wordId!==w.id||!Number.isInteger(n.syllableIndex)||n.syllableIndex<0||n.syllableIndex>=w.lengths.length||!value||Math.abs(value*(r.dots?1.5:1)*r.normal/r.actual-n.quarterBeats)>1e-9)throw Error('Invalid Baer source note/lyric/rhythm.');
  if(12*(p.octave+1)+{C:0,D:2,E:4,F:5,G:7,A:9,B:11}[p.step]+p.alter!==n.midi)throw Error('Baer pitch spelling disagrees with MIDI.');
  beats+=n.quarterBeats+(n.restAfterBeats??0);
 }
}
if(Math.abs(beats-147.25)>1e-8||JSON.stringify(record.words.flatMap(w=>w.notes))!==JSON.stringify(record.notes)||new Set(record.notes.map(n=>n.id)).size!==145)throw Error('Baer component identity/order/duration mismatch.');
const scan=await read(record.scan.file);
if(scan.length!==record.scan.bytes||createHash('sha256').update(scan).digest('hex')!==record.scan.sha256)throw Error('Baer source image changed.');
await writeFile(new URL('baer-score-data.js',root),'// Literal source transcription; see docs/BAER-GENESIS-SCORE.json. No accent-to-pitch generation.\nexport const baerWords='+JSON.stringify(record.words)+';\n');
console.log('Generated Baer No939: 52 unchanged Hebrew words,145 distinct notes,one rest,six unspecified fermatas.');
