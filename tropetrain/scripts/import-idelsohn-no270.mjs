// Original literal source compiler, CC0-1.0. Independent review remains null.
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const root=new URL('../',import.meta.url),read=p=>readFileSync(new URL(p,root)),sha=b=>createHash('sha256').update(b).digest('hex'),manual='data/notation/idelsohn-no270-transcription.json',m=JSON.parse(read(manual));
assert.equal(m.format,'tropetrain-idelsohn-no270-transcription-v1');assert.equal(m.revision,1);
for(const k of ['review','acceptedSyllableMapping','phonemes','singingVoice','completeTraditionGrammar','kinnorPreset'])assert.equal(m[k],null);
const book=JSON.parse(read('data/torah/gen.json')),canonical=book.chapters[24].verses.slice(18,20).flatMap(v=>v.tokens.filter(t=>t.kind!=='k'&&/[א-ת]/u.test(t.sourceHebrew)));
assert.equal(canonical.length,27);assert.deepEqual(m.words.map(w=>[w.id,w.sourceHebrew]),canonical.map(w=>[w.id,w.sourceHebrew]));
for(const w of m.words){assert(w.printedUnits.length>0);for(const k of ['acceptedSyllableMapping','phonemes','independentReview'])assert.equal(w[k],null);}
const codes={q:['quarter',1,0],qd:['quarter',1,1],e:['eighth',.5,0],ed:['eighth',.5,1],s:['16th',.25,0],e3:['eighth',.5,0],h:['half',2,0]},offset={C:0,D:2,E:4,F:5,G:7,A:9,B:11};let previousSystem=null,alterations;
const components=m.components.map((c,i)=>{
 assert.equal(c.number,i+1);assert.equal(c.kind,'note');assert([1,2,3,4].includes(c.system));
 if(c.system!==previousSystem){assert(c.system===(previousSystem??0)+1);previousSystem=c.system;alterations={B:{alter:-1,origin:'printed-key'}};}
 const p=c.head.match(/^([A-G])([45])$/);assert(p);const [type,value,dots]=codes[c.writtenCode]??[];assert(type);
 if(c.writtenAccidental){assert(['natural','source-cross-quarter-sharp'].includes(c.writtenAccidental));alterations[p[1]]={alter:c.writtenAccidental==='natural'?0:.5,origin:c.number};}
 const a=alterations[p[1]]??{alter:0,origin:'diatonic'},word=m.words[c.wordOrdinal-1];assert(word&&Number.isInteger(c.printedUnitIndex)&&word.printedUnits[c.printedUnitIndex-1]);
 const actual=c.writtenCode==='e3'?3:1,normal=actual===3?2:1;
 return {...c,id:'idelsohn270-c'+String(c.number).padStart(2,'0'),sourceBar:c.wordOrdinal<=9?1:2,sourceLocation:`Idelsohn1929 No270,printed102/PDF105,system${c.system},component${c.number}`,sourcePitch:{step:p[1],alter:a.alter,octave:Number(p[2])},midi:12*(Number(p[2])+1)+offset[p[1]]+a.alter,accidentalOrigin:c.writtenAccidental?'explicit-source-mark':Number.isInteger(a.origin)?'candidate-carry-from-component-'+a.origin:a.origin,rhythm:{type,dots,actual,normal},quarterBeats:value*(dots?1.5:1)*normal/actual,candidateWordId:word.id,sourcePrintedGroupIndex:c.printedUnitIndex,sourcePrintedLyric:word.printedUnits[c.printedUnitIndex-1],slurs:[]};
});
assert.equal(components.length,75);assert.deepEqual([1,2,3,4].map(s=>components.filter(c=>c.system===s).length),[18,18,20,19]);
assert.deepEqual(components.filter(c=>!Number.isInteger(c.midi)).map(c=>c.number),[30,34,50]);assert(components.filter(c=>!Number.isInteger(c.midi)).every(c=>c.midi===67.5));
for(const t of m.tuplets){assert.equal(t.members.length,3);for(const [i,n]of t.members.entries()){const c=components[n-1];assert.equal(c.rhythm.actual,3);assert(!c.tuplet);c.tuplet={id:'idelsohn270-'+t.id,phase:i===0?'start':i===2?'stop':'continue'};}}
for(const s of m.slurs){assert.equal(s.members.length,2);for(const [i,n]of s.members.entries())components[n-1].slurs.push({id:'idelsohn270-'+s.id,phase:i===0?'start':'stop',placement:s.placement});}
for(const w of m.words)for(let i=1;i<=w.printedUnits.length;i++)assert(components.some(c=>c.candidateWordId===w.id&&c.sourcePrintedGroupIndex===i));
const beats=components.reduce((n,c)=>n+c.quarterBeats,0),first=components.filter(c=>c.wordOrdinal<=9);assert(Math.abs(beats-41.75)<1e-10);assert.equal(first.length,24);assert(Math.abs(first.reduce((n,c)=>n+c.quarterBeats,0)-12.5)<1e-10);
const image=read(m.source.image);assert.equal(image.length,m.source.imageBytes);assert.equal(sha(image),m.source.imageSha256);
const counts={notes:75,rests:0,words:27,printedGroupIndices:60,systems:4,tuplets:4,slurs:4,explicitQuarterSharps:2,carriedQuarterSharps:1,quarterBeats:41.75,firstVerseNotes:24,firstVerseQuarterBeats:12.5};
const paths=[manual,'scripts/import-idelsohn-no270.mjs','idelsohn-no270-score.js','pitch.js','index.html','printed-score-registry.js','assets/scores/idelsohn-no270-NOTICE.txt','score-data.js','music-exports.js','staff.js','data/torah/gen.json',m.source.image];
const record={...m,format:'tropetrain-idelsohn-no270-word-candidates-v1',components,counts,inputs:paths.map(path=>({path,sha256:sha(read(path))}))};
writeFileSync(new URL('docs/IDELSOHN-NO270-WORD-CANDIDATES.json',root),JSON.stringify(record,null,2)+'\n');writeFileSync(new URL('idelsohn-no270-data.js',root),'// Draft source, exact marks and limits: docs/IDELSOHN-NO270-WORD-CANDIDATES.json.\nexport const NO270_RECORD='+JSON.stringify(record)+';\n');console.log(JSON.stringify({no270:counts,review:null,voice:null}));
