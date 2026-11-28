// Original literal source compiler, CC0-1.0. Musical/phonetic review is null.
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const root=new URL('../',import.meta.url),read=p=>readFileSync(new URL(p,root)),sha=b=>createHash('sha256').update(b).digest('hex'),manual='data/notation/idelsohn-gen24-transcription.json',m=JSON.parse(read(manual));
assert.equal(m.format,'tropetrain-idelsohn-gen24-transcription-v1');assert.equal(m.revision,1);
for(const k of ['review','acceptedSyllableMapping','phonemes','singingVoice','completeTraditionGrammar','kinnorPreset'])assert.equal(m[k],null);
assert.equal(m.source.item,null);assert.equal(m.source.sourceLocalityLabel,null);assert.equal(m.source.printedPage,103);assert.equal(m.source.pdfPage,106);
const book=JSON.parse(read('data/torah/gen.json')),canonical=book.chapters[23].verses[48].tokens.filter(t=>t.kind!=='k'&&/[א-ת]/u.test(t.sourceHebrew));
assert.equal(canonical.length,20);assert.deepEqual(m.words.map(w=>[w.id,w.sourceHebrew]),canonical.map(w=>[w.id,w.sourceHebrew]));
const codes={q:['quarter',1,0],e:['eighth',.5,0],ed:['eighth',.5,1],s:['16th',.25,0],e3:['eighth',.5,0],h:['half',2,0],'small-e':['eighth',null,0]},offset={C:0,D:2,E:4,F:5,G:7,A:9,B:11};
const components=m.components.map((c,i)=>{
 assert.equal(c.number,i+1);assert.equal(c.kind,'note');assert.equal(c.system,i<30?1:2);assert.equal(c.writtenAccidental,null);
 const p=c.head.match(/^([A-G])([45])$/);assert(p);const [type,value,dots]=codes[c.writtenCode]??[];assert(type);const word=m.words[c.wordOrdinal-1];assert(word&&Number.isInteger(c.printedUnitIndex)&&word.printedUnits[c.printedUnitIndex-1]);
 const actual=c.writtenCode==='e3'?3:1,normal=actual===3?2:1,alter=p[1]==='B'?-1:0;
 return {...c,id:'idelsohnGen24-c'+String(c.number).padStart(2,'0'),sourceBar:1,sourceLocation:`Idelsohn1929 printed103/PDF106,Gen24:49,system${c.system},component${c.number}`,sourcePitch:{step:p[1],alter,octave:Number(p[2])},midi:12*(Number(p[2])+1)+offset[p[1]]+alter,rhythm:{type,dots,actual,normal},quarterBeats:value===null?null:value*(dots?1.5:1)*normal/actual,candidateWordId:word.id,sourcePrintedGroupIndex:c.printedUnitIndex,sourcePrintedLyric:word.printedUnits[c.printedUnitIndex-1],slurs:[],...(c.writtenCode==='small-e'?{smallNote:{type:'eighth',slash:false,role:null,sourceDuration:null,stealTimePrevious:null,stealTimeFollowing:null,review:null}}:{})};
});
assert.equal(components.length,56);assert.deepEqual([1,2].map(s=>components.filter(c=>c.system===s).length),[30,26]);assert.deepEqual(components.filter(c=>c.smallNote).map(c=>[c.number,c.midi]),[[8,69]]);
for(const t of m.tuplets)for(const [i,n]of t.members.entries()){const c=components[n-1];assert.equal(c.rhythm.actual,3);c.tuplet={id:'idelsohnGen24-'+t.id,phase:i===0?'start':i===t.members.length-1?'stop':'continue'};}
for(const s of m.slurs)for(const [i,n]of s.members.entries())components[n-1].slurs.push({id:'idelsohnGen24-'+s.id,phase:i===0?'start':i===s.members.length-1?'stop':'continue',placement:s.placement});
for(const w of m.words){for(const k of ['acceptedSyllableMapping','phonemes','independentReview'])assert.equal(w[k],null);for(let i=1;i<=w.printedUnits.length;i++)assert(components.some(c=>c.candidateWordId===w.id&&c.sourcePrintedGroupIndex===i));}
const sum=cs=>cs.reduce((n,c)=>n+(c.quarterBeats??0),0);assert(Math.abs(sum(components)-30.5)<1e-10);assert(Math.abs(sum(components.slice(0,30))-14)<1e-10);assert(Math.abs(sum(components.slice(30))-16.5)<1e-10);assert(Math.abs(sum(components.filter(c=>c.wordOrdinal!==1))-26)<1e-10);
assert.equal(components[29].candidateWordId,components[30].candidateWordId);assert.equal(components[29].candidateWordId,'gen-24-49-8');assert.equal(m.words.reduce((n,w)=>n+w.printedUnits.length,0),38);
const image=read(m.source.image);assert.equal(image.length,m.source.imageBytes);assert.equal(sha(image),m.source.imageSha256);
const counts={notes:56,measuredNotes:55,unmeasuredSmallEighths:1,rests:0,words:20,printedGroupIndices:38,systems:2,tuplets:1,slurs:5,measuredQuarterBeats:30.5,firstSystemMeasuredQuarterBeats:14,secondSystemMeasuredQuarterBeats:16.5,measuredRemainderNotes:46,measuredRemainderQuarterBeats:26};
const paths=[manual,'scripts/import-idelsohn-gen24.mjs','idelsohn-gen24-score.js','source-gen24-performance.js','score-data.js','staff.js','music-exports.js','index.html','printed-score-registry.js','assets/scores/idelsohn-gen24-NOTICE.txt','data/torah/gen.json',m.source.image];
const record={...m,format:'tropetrain-idelsohn-gen24-word-candidates-v1',components,counts,inputs:paths.map(path=>({path,sha256:sha(read(path))}))};
writeFileSync(new URL('docs/IDELSOHN-GEN24-WORD-CANDIDATES.json',root),JSON.stringify(record,null,2)+'\n');writeFileSync(new URL('idelsohn-gen24-data.js',root),'// Exact marks, literal candidates and limits: docs/IDELSOHN-GEN24-WORD-CANDIDATES.json.\nexport const GEN24_RECORD='+JSON.stringify(record)+';\n');console.log(JSON.stringify({gen24:counts,review:null,voice:null}));
