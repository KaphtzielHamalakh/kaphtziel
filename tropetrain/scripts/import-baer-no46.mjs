// Original literal source transcription, CC0-1.0. Independent musical review pending.
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {getCorpus} from '../library.js';
const root=new URL('../',import.meta.url),read=p=>readFileSync(new URL(p,root)),sha=b=>createHash('sha256').update(b).digest('hex'),manualPath='data/notation/baer-no46-transcription.json',m=JSON.parse(read(manualPath));
assert.equal(m.format,'tropetrain-baer-no46-word-transcription-v1');assert.equal(m.revision,1);
for(const k of ['review','acceptedSyllableMapping','phonemes','singingVoice','completeTraditionGrammar'])assert.equal(m[k],null);
assert.equal(m.source.sourceKey.fifths,4);
const corpus=await getCorpus(),p=corpus.passage([{id:'no46-source-check',bookId:m.bookId,start:{chapter:m.chapter,verse:m.verse},end:{chapter:m.chapter,verse:m.verse}}]),canonical=p.verses.flatMap(v=>v.words);
assert.equal(canonical.length,17);assert.deepEqual(m.words.map(w=>[w.id,w.sourceHebrew]),canonical.map(w=>[w.sourceWordId,w.sourceHebrew]));
for(const w of m.words)for(const k of ['acceptedWrittenRanges','acceptedSyllableMapping','phonemes','review'])assert.equal(w[k],null);
const types={q:['quarter',1],e:['eighth',.5],s:['16th',.25],t:['32nd',.125],e3:['eighth',.5],s3:['16th',.25]},steps={C:0,D:2,E:4,F:5,G:7,A:9,B:11},id=n=>'baer46-c'+String(n).padStart(2,'0');
const components=m.components.map((c,i)=>{
 assert.equal(c.number,i+1);const [type,base]=types[c.writtenCode]??[];assert(type);const actual=c.writtenCode.endsWith('3')?3:1,normal=actual===3?2:1;
 const out={...c,id:id(c.number),sourceBar:c.bar,sourceLocation:`Baer [1894], No46, printed11/PDF56, component${c.number}`,rhythm:{type,dots:c.dots,actual,normal},quarterBeats:base*(c.dots?1.5:1)*normal/actual,candidateWordId:null,sourcePrintedGroupIndex:null,sourcePrintedLyric:null};
 if(c.kind==='rest'){assert.equal(c.pitch,null);assert.equal(c.wordOrdinal,null);assert.equal(c.printedUnitIndex,null);return out;}
 assert.equal(c.kind,'note');const pitch=c.pitch.match(/^([A-G])([#]?)([3-5])$/);assert(pitch);const alter=pitch[2]?1:0,octave=Number(pitch[3]),word=m.words[c.wordOrdinal-1];assert(word&&Number.isInteger(c.printedUnitIndex)&&c.printedUnitIndex>=1&&c.printedUnitIndex<=word.printedUnits.length);
 Object.assign(out,{sourcePitch:{step:pitch[1],alter,octave},midi:12*(octave+1)+steps[pitch[1]]+alter,candidateWordId:word.id,sourcePrintedGroupIndex:c.printedUnitIndex,sourcePrintedLyric:word.printedUnits[c.printedUnitIndex-1]});return out;
});
for(const t of m.tuplets)for(const [i,n]of t.members.entries()){const c=components[n-1];assert.equal(c.rhythm.actual,3);assert(!c.tuplet);c.tuplet={id:'baer46-'+t.id,phase:i===0?'start':i===t.members.length-1?'stop':'continue'};}
for(const f of m.fermatas){assert.equal(f.duration,null);assert.equal(components[f.component-1].kind,'rest');components[f.component-1].fermata=f;}
for(const [i,mark]of m.unresolvedMarks.entries()){assert.equal(mark.interpretation,null);components[mark.component-1].unresolvedMarks=[{...mark,id:'baer46-unresolved-'+(i+1)}];}
const routes=m.routes.map(r=>{
 const selected=r.components.map(n=>components[n-1]);assert.equal(new Set(r.components).size,r.components.length);assert.equal(selected.filter(c=>c.kind==='note').length,r.expectedNotes);assert.equal(selected.filter(c=>c.kind==='rest').length,6);
 for(const b of Object.keys(r.expectedBars))assert(Math.abs(selected.filter(c=>c.sourceBar===Number(b)).reduce((n,c)=>n+c.quarterBeats,0)-(b==='0'?.5:4))<1e-10);
 assert(Math.abs(selected.reduce((n,c)=>n+c.quarterBeats,0)-28.5)<1e-10);for(const w of m.words)assert(selected.some(c=>c.candidateWordId===w.id));
 // The apparent high mark over this C#4 is a secondary beam, not another head.
 assert.deepEqual(selected.filter(c=>c.sourceBar===6&&c.wordOrdinal===11).map(c=>c.pitch),['G#4','C#4','C#4']);
 return {...r,componentIds:selected.map(c=>c.id)};
});
const counts={logicalWrittenComponents:components.length,pitchedComponents:components.filter(c=>c.kind==='note').length,physicalNoteHeads:new Set(components.filter(c=>c.kind==='note').map(c=>c.headId)).size,rests:components.filter(c=>c.kind==='rest').length,routes:routes.length,routeComponentMemberships:routes.reduce((n,r)=>n+r.componentIds.length,0),candidateWords:m.words.length,printedUnits:m.words.reduce((n,w)=>n+w.printedUnits.length,0)};
assert.deepEqual(counts,{logicalWrittenComponents:74,pitchedComponents:68,physicalNoteHeads:66,rests:6,routes:2,routeComponentMemberships:124,candidateWords:17,printedUnits:40});
const image=read(m.source.scan.image);assert.equal(image.length,m.source.scan.imageBytes);assert.equal(sha(image),m.source.scan.imageSha256);
const paths=[manualPath,'scripts/import-baer-no46.mjs','baer-no46-score.js','printed-score-registry.js','music-exports.js','staff.js','data/torah/deu.json',m.source.scan.image,'assets/scores/baer-preface-IX-alternatives.png'];
const record={...m,format:'tropetrain-baer-no46-word-candidates-v1',components,routes,counts,inputs:paths.map(path=>({path,sha256:sha(read(path))}))};
writeFileSync(new URL('docs/BAER-NO46-WORD-CANDIDATES.json',root),JSON.stringify(record,null,2)+'\n');writeFileSync(new URL('baer-no46-data.js',root),'// Literal draft; source and limits: docs/BAER-NO46-WORD-CANDIDATES.json.\nexport const NO46_RECORD='+JSON.stringify(record)+';\n');console.log(JSON.stringify({no46:counts,review:null,singingVoice:null}));
