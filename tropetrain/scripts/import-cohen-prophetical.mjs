import {readFile,writeFile} from 'node:fs/promises';import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url),read=p=>readFile(new URL(p,root)),record=JSON.parse(await read('docs/COHEN-PROPHETICAL-SCORE.json'));
const verse=JSON.parse(await read('data/torah/gen.json')).chapters[21].verses[0],expected=[1,4,4,3,3,3,3,3,3,3,4,4,3],bars=expected.map(()=>0),ids=new Set();
if(record.id!=='cohen-1902-gen22-prophetical'||record.words.length!==13||record.notes.length!==51)throw Error('Incomplete Cohen hypothetical example.');
for(const [i,w] of record.words.entries()){
 if(w.id!==verse.tokens[i].id||w.sourceHebrew!==verse.tokens[i].sourceHebrew||w.lengths.some(n=>!Number.isInteger(n)||n<1)||w.lengths.reduce((a,b)=>a+b,0)!==(w.sourceHebrew.match(/[א-ת]/gu)??[]).length)throw Error('Cohen hypothetical example changed marked Hebrew or its partition.');
 for(const n of w.notes){const p=n.pitch,r=n.rhythm,value={half:2,quarter:1,eighth:.5,'16th':.25}[r.type];
  if(ids.has(n.id)||n.wordId!==w.id||!Number.isInteger(n.syllableIndex)||n.syllableIndex<0||n.syllableIndex>=w.lengths.length||!value||Math.abs(value*(r.dots?1.5:1)*r.normal/r.actual-n.quarterBeats)>1e-9||12*(p.octave+1)+{C:0,D:2,E:4,F:5,G:7,A:9,B:11}[p.step]+p.alter!==n.midi||!Number.isInteger(n.bar)||n.bar<0||n.bar>=bars.length)throw Error('Invalid Cohen source note, spelling or rhythm.');
  ids.add(n.id);bars[n.bar]+=n.quarterBeats+(n.restAfterBeats??0);
 }
}
if(JSON.stringify(record.words.flatMap(w=>w.notes))!==JSON.stringify(record.notes)||bars.some((n,i)=>Math.abs(n-expected[i])>1e-8))throw Error('Cohen hypothetical bar totals/source order disagree.');
for(const [key,phases] of [['tieId',['start','stop']],['slurId',['start','stop']],['tupletId',['start','stop']]]){
 const groups=Map.groupBy(record.notes.filter(n=>n[key]),n=>n[key]);
 for(const group of groups.values())if(group[0][key.replace('Id','Phase')]!==phases[0]||group.at(-1)[key.replace('Id','Phase')]!==phases[1])throw Error('Unclosed Cohen notation group.');
}
const ties=record.notes.filter(n=>n.tieId);if(ties.length!==2||ties[0].midi!==ties[1].midi||ties[0].wordId!==ties[1].wordId||ties[0].syllableIndex!==ties[1].syllableIndex||record.notes.filter(n=>n.restAfterBeats===.5).length!==5)throw Error('Cohen tied pitch or rests changed.');
for(const image of [record.scan,record.secondScan]){const b=await read(image.file);if(b.length!==image.bytes||createHash('sha256').update(b).digest('hex')!==image.sha256)throw Error('Cohen historical scan changed.');}
await writeFile(new URL('cohen-prophetical-data.js',root),'// Literal source transcription; see docs/COHEN-PROPHETICAL-SCORE.json. No arbitrary-word melody rule.\nexport const cohenPropheticalWords='+JSON.stringify(record.words)+';\n');
console.log('Generated Cohen hypothetical Gen22:1:13unchanged words/51components/50attacks/41beats/five rests; separate coda excluded.');
