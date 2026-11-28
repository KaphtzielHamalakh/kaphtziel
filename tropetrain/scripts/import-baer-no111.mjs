// Original literal source transcription, CC0-1.0. No general melody rule.
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {getCorpus} from '../library.js';
import {validateSourceGrace} from '../source-grace.js';
const root=new URL('../',import.meta.url),read=p=>readFileSync(new URL(p,root)),sha=b=>createHash('sha256').update(b).digest('hex');
const manualPath='data/notation/baer-no111-transcription.json',manual=JSON.parse(read(manualPath));
assert.equal(manual.format,'tropetrain-baer-no111-word-transcription-v1');assert.equal(manual.revision,1);
for(const k of ['review','acceptedSyllableMapping','phonemes','singingVoice','completeTraditionGrammar'])assert.equal(manual[k],null);
const corpus=await getCorpus(),types={q:['quarter',1],h:['half',2],e:['eighth',.5],s3:['16th',.25],e3:['eighth',.5],g:['eighth',null]},steps={C:0,D:2,E:4,F:5,G:7,A:9,B:11};
const studies=[];
for(const s of manual.studies){
 const passage=corpus.passage([{id:'no111-source-check',bookId:s.bookId,start:{chapter:s.chapter,verse:s.verse},end:{chapter:s.chapter,verse:s.verse}}]),canonical=passage.verses.flatMap(v=>v.words).slice(0,5);
 assert.equal(s.words.length,5);assert.deepEqual(s.words.map(w=>[w.id,w.sourceHebrew]),canonical.map(w=>[w.sourceWordId,w.sourceHebrew]));
 for(const w of s.words)for(const k of ['acceptedWrittenRanges','acceptedSyllableMapping','phonemes','review'])assert.equal(w[k],null);
 const prefix=`baer111-${s.id}-c`,id=n=>prefix+String(n).padStart(2,'0');
 const components=s.components.map((c,i)=>{
  assert.equal(c.number,i+1);const [type,base]=types[c.writtenCode]??[];assert(type);const actual=c.writtenCode.endsWith('3')?3:1,normal=actual===3?2:1;
  const n={id:id(c.number),kind:c.kind,sourceStudy:s.id,sourceComponentNumber:c.number,sourceBar:c.bar,sourceLocation:`Baer [1894], No111, printed37/PDF82, ${s.printedSetting}, component ${c.number}`,rhythm:{type,dots:c.dots,actual,normal},quarterBeats:c.writtenCode==='g'?null:base*(2-2**-c.dots)*normal/actual,candidateWordId:null,sourcePrintedGroupIndex:null,sourcePrintedLyric:null};
  if(c.kind==='rest'){assert.equal(c.pitch,null);assert.equal(c.wordOrdinal,null);assert.equal(c.printedUnitIndex,null);return n;}
  assert.equal(c.kind,'note');const p=c.pitch.match(/^([A-G])([b#]?)([3-6])$/);assert(p);const alter=p[2]==='b'?-1:p[2]==='#'?1:0;
  Object.assign(n,{sourcePitch:{step:p[1],alter,octave:Number(p[3])},midi:12*(Number(p[3])+1)+steps[p[1]]+alter});
  const w=s.words[c.wordOrdinal-1];assert(w&&Number.isInteger(c.printedUnitIndex)&&c.printedUnitIndex>=1&&c.printedUnitIndex<=w.printedUnits.length);
  Object.assign(n,{candidateWordId:w.id,sourcePrintedGroupIndex:c.printedUnitIndex,sourcePrintedLyric:w.printedUnits[c.printedUnitIndex-1]});return n;
 });
 const at=n=>{const c=components[n-1];assert(c&&c.sourceComponentNumber===n);return c;};
 const attach=(spec,key)=>{
  for(const members of spec.routeMembers?Object.values(spec.routeMembers):[spec.members])for(const [i,n]of members.entries()){
   const c=at(n),v={id:`baer111-${s.id}-${spec.id}`,phase:i===0?'start':i===members.length-1?'stop':'continue',...(spec.placement?{placement:spec.placement}:{})};
   if(c[key])assert.deepEqual(c[key],v);else c[key]=v;
   if(key==='tuplet')assert.equal(c.rhythm.actual,3);
  }
 };
 for(const t of s.tuplets)attach(t,'tuplet');for(const slur of s.slurs)attach(slur,'slur');
 for(const [i,g]of s.graces.entries())for(const [j,n]of g.members.entries()){
  const c=at(n);c.grace={kind:'unmeasured',groupId:`baer111-${s.id}-grace-${i+1}`,previousComponentId:id(g.previous),nextComponentId:id(g.next),order:j+1,count:g.members.length,duration:null,stealTimeFollowing:null,stealTimePrevious:null,printedSize:'small',slash:g.slash,printedBeams:1};validateSourceGrace(c);
 }
 for(const f of s.fermatas??[])at(f.component).fermata={shape:f.shape,placement:f.placement,duration:f.duration};
 const routes=s.routes.map(r=>{
  const selected=r.components.map(at);assert.equal(new Set(r.components).size,r.components.length);assert.equal(selected.filter(c=>c.kind==='note').length,s.expectedNotesPerRoute);assert.equal(selected.filter(c=>c.kind==='rest').length,s.expectedRestsPerRoute??0);assert.equal(selected.filter(c=>c.grace).length,s.expectedGracesPerRoute);
  const measured=selected.filter(c=>!c.grace).reduce((n,c)=>n+c.quarterBeats,0);assert(Math.abs(measured-s.expectedMeasuredQuarterBeats)<1e-10);
  if(s.expectedMeasuredBeatsPerBar)for(const [bar,beats]of Object.entries(s.expectedMeasuredBeatsPerBar))assert(Math.abs(selected.filter(c=>c.sourceBar===Number(bar)&&!c.grace).reduce((n,c)=>n+c.quarterBeats,0)-beats)<1e-10);
  const selectedIds=new Set(selected.map(c=>c.id));for(const c of selected.filter(c=>c.grace))assert(selectedIds.has(c.grace.previousComponentId)&&selectedIds.has(c.grace.nextComponentId));
  for(const w of s.words)assert(selected.some(c=>c.candidateWordId===w.id));return {...r,componentIds:selected.map(c=>c.id),measuredQuarterBeats:measured,graceNotes:selected.filter(c=>c.grace).length};
 });
 studies.push({...s,components,routes});
}
assert.equal(studies.reduce((n,s)=>n+s.components.length,0),41);assert.equal(studies.flatMap(s=>s.routes).length,3);
const scan=manual.source.scan,bytes=read(scan.image);assert.equal(bytes.length,scan.imageBytes);assert.equal(sha(bytes),scan.imageSha256);assert.equal(scan.page,37);
const inputPaths=[manualPath,'scripts/import-baer-no111.mjs','baer-no111-score.js','source-no111-performance.js','music.js','printed-score-registry.js','score-data.js','staff.js','music-exports.js','source-grace.js','docs/BAER-NUMBERING-CORRECTION.json','data/torah/gen.json','data/torah/exo.json',scan.image];
const components=studies.flatMap(s=>s.components),routes=studies.flatMap(s=>s.routes),words=studies.flatMap(s=>s.words);
const counts={physicalComponents:components.length,notes:components.filter(c=>c.kind==='note').length,rests:components.filter(c=>c.kind==='rest').length,physicalGraceHeads:components.filter(c=>c.grace).length,routes:routes.length,routeComponentMemberships:routes.reduce((n,r)=>n+r.componentIds.length,0),candidateWords:words.length,printedLyricGroups:words.reduce((n,w)=>n+w.printedUnits.length,0)};
assert.deepEqual(counts,{physicalComponents:41,notes:40,rests:1,physicalGraceHeads:4,routes:3,routeComponentMemberships:52,candidateWords:10,printedLyricGroups:25});
const record={format:'tropetrain-baer-no111-word-candidates-v1',revision:1,id:manual.id,source:manual.source,studies,method:manual.method,performance:manual.performance,review:null,acceptedSyllableMapping:null,phonemes:null,singingVoice:null,completeTraditionGrammar:null,counts,inputs:inputPaths.map(path=>({path,sha256:sha(read(path))}))};
writeFileSync(new URL('docs/BAER-NO111-WORD-CANDIDATES.json',root),JSON.stringify(record,null,2)+'\n');
writeFileSync(new URL('baer-no111-data.js',root),'// Original literal draft; source and limits: docs/BAER-NO111-WORD-CANDIDATES.json.\nexport const NO111_RECORD='+JSON.stringify(record)+';\n');
console.log(JSON.stringify({no111:record.counts,review:null,acceptedSyllableMapping:null,singingVoice:null}));
