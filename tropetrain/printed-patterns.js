import {BAER_PATTERN_ROW,BAER_PATTERN_IMAGES,BAER_PATTERN_RECORDS} from './baer-pattern-data.js';
import {IDELSOHN_PATTERN_ROW,IDELSOHN_PATTERN_IMAGES,IDELSOHN_PATTERN_RECORDS} from './idelsohn-pattern-data.js';
import {hasPatternSmallEighthStudy} from './source-pattern-small-eighth.js';
import {IDELSOHN_PATTERN_ID,idelsohnPatternModes,idelsohnPatternSource,idelsohnPatternPlan} from './idelsohn-patterns.js';
import {BAER_PATTERN_ID,baerPatternModes,baerPatternSource,baerPatternPlan} from './baer-patterns.js';
import {PRINTED_PATTERNS} from './printed-pattern-data.js';
import {PRINTED_PATTERN_CATALOG,PATTERN_IMAGE_DATA,PATTERN_RECORD_DATA} from './pattern-catalog-data.js';
export {PRINTED_PATTERNS,PRINTED_PATTERN_CATALOG,PATTERN_IMAGE_DATA,PATTERN_RECORD_DATA};
export const PRINTED_PATTERN_SOURCES=Object.freeze([...PRINTED_PATTERN_CATALOG.rows,BAER_PATTERN_ROW,IDELSOHN_PATTERN_ROW]);
export const patternImage=path=>IDELSOHN_PATTERN_IMAGES[path]??BAER_PATTERN_IMAGES[path]??PATTERN_IMAGE_DATA[path];
export const patternRecord=path=>IDELSOHN_PATTERN_RECORDS[path]??BAER_PATTERN_RECORDS[path]??PATTERN_RECORD_DATA[path];
export function allPatternModes(sourceId){return sourceId===IDELSOHN_PATTERN_ID?idelsohnPatternModes():sourceId===BAER_PATTERN_ID?baerPatternModes():availablePatternModes(sourceId);}
export function patternSource(id=PRINTED_PATTERNS.id,mode){
 if(id===BAER_PATTERN_ID)return baerPatternSource(mode);
 if(id===IDELSOHN_PATTERN_ID)return idelsohnPatternSource(mode);
 const row=PRINTED_PATTERN_CATALOG.rows.find(r=>r.id===id);if(!row)throw Error('Choose a checked printed source row.');return row;
}
export function availablePatternModes(sourceId=PRINTED_PATTERNS.id,{graceDemo=false,repeatDemo=false,smallPatternDemo=false}={}){
 if(sourceId===IDELSOHN_PATTERN_ID)return idelsohnPatternModes().filter(m=>m.status==='written-values'||smallPatternDemo===true&&hasPatternSmallEighthStudy(m));
 if(sourceId===BAER_PATTERN_ID)return baerPatternModes().filter(m=>(m.status==='transcribed'||graceDemo===true&&m.status==='unmeasured-grace')&&(!m.repeat||repeatDemo===true));
 const cells=new Set(patternSource(sourceId).record.notes.map(n=>n.cell));
 return PATTERN_MODES.filter(m=>(m.cells??[m.id]).every(c=>cells.has(c)));
}
export function patternEvidence(sourceId,kind,mode){
 const row=patternSource(sourceId,mode),record=row.record;let file,url,mime;
 if(kind==='record'){file=row.recordPath??'docs/PRINTED-PATTERN-CATALOG.json';url=patternRecord(file);mime='application/json';}
 else if(['columns','context','continuation','preface'].includes(kind)){file=kind==='columns'?record.source.image:kind==='context'?record.source.contextImage.image:kind==='preface'?record.notationPrinciple?.source.file:record.source.continuationImage?.image;url=patternImage(file);mime=file?.endsWith('.jpg')?'image/jpeg':'image/png';}
 else throw Error('Choose a source image or record.');
 const prefix=`data:${mime};base64,`;if(!url?.startsWith(prefix))throw Error('Source evidence is unavailable.');
 const bytes=Uint8Array.from(atob(url.slice(prefix.length)),c=>c.charCodeAt(0));
 return {file,name:file.split('/').at(-1),url,mime,bytes,text:mime==='application/json'?new TextDecoder('utf-8',{fatal:true}).decode(bytes):null};
}
export const PATTERN_MODES=Object.freeze([
  {id:'pair',name:'Munaḥ → Revia · both printed columns',cells:['munah','revia']},
  {id:'munah',name:'Munaḥ · plain “Resting” column'},
  {id:'revia',name:'Revia · printed column'},
  {id:'yetiv',name:'Yetib · printed form (p.541)'},
  {id:'zakef-preceded',name:'Zaqef qaton · after Zaqef or Munaḥ (p.541)'},
  {id:'munah-etnahta',name:'Munaḥ → Etnaḥta · continued source group',cells:['munah-before-etnahta','etnahta']},
  {id:'munah-before-etnahta',name:'Munaḥ · before Etnaḥta (pp.542–543)'},
  {id:'etnahta',name:'Etnaḥta · in printed Munaḥ–Etnaḥta (p.543)'}
]);
export function patternContextChoices(sourceId,mode){
 if(sourceId===IDELSOHN_PATTERN_ID)return []; // Source index labels do not establish modern sign equivalence.
 if(sourceId===BAER_PATTERN_ID)return mode==='munah-revia-pair'?[{label:'Encoded Munaḥ → Revia lookup only; no automatic melodic application',ids:['munah','revia']}]:BAER_PATTERN_ROW.record.matchingQueries[baerPatternModes().find(m=>m.id===mode)?.sourceFigureId??mode]??[];
 const record=patternSource(sourceId).record;
 if(!availablePatternModes(sourceId).some(m=>m.id===mode))return [];
 return record.matchingQueries?.[mode]??[{label:'Source combination',ids:record.matchingQuery}];
}
export function printedPatternPlan(mode='pair',{tempo=84,transpose=0,sourceId=PRINTED_PATTERNS.id,graceDemo=false,repeatDemo=false,smallPatternDemo=false}={}){
 if(sourceId===IDELSOHN_PATTERN_ID)return idelsohnPatternPlan(mode,{tempo,transpose,smallPatternDemo});
 if(sourceId===BAER_PATTERN_ID)return baerPatternPlan(mode,{tempo,transpose,graceDemo,repeatDemo});
 if(!PATTERN_MODES.some(m=>m.id===mode))throw Error('Choose a printed pattern.');
 const row=patternSource(sourceId),record=row.record;
 if(!availablePatternModes(sourceId).some(m=>m.id===mode))throw Error('This printed source has no checked transcription for those columns.');
 if(!Number.isFinite(tempo)||tempo<=0||!Number.isInteger(transpose)||Math.abs(transpose)>36)throw Error('Invalid pattern tempo or key.');
 const selectedCells=PATTERN_MODES.find(m=>m.id===mode).cells??[mode],components=record.notes.filter(n=>selectedCells.includes(n.cell)),plan=[];
 if(components[0]?.kind==='rest'||components.at(-1)?.kind==='rest')throw Error('Leading/trailing printed rest needs an explicit notation model.');
 let beat=0;
 for(const [index,n] of components.entries()){
  if(n.kind==='rest'){
   const previous=plan.at(-1);previous.sourceRestsAfter??=[];
   previous.sourceRestsAfter.push({...n,beats:n.quarterBeats,durationSeconds:n.quarterBeats*60/tempo,sourceComponentNumber:index+1});beat+=n.quarterBeats;continue;
  }
  const event={id:n.id,sourceProfile:record.id,sourceRevision:record.revision,sourceLocation:n.sourceLocation,
   sourceLabel:PATTERN_MODES.find(m=>m.id===n.cell).name,midi:n.midi+transpose,beats:n.quarterBeats,
   startBeat:beat,startSeconds:beat*60/tempo,durationSeconds:n.quarterBeats*60/tempo,sourceRhythm:{...n.rhythm},sourceComponentNumber:index+1,sourceComponentCount:components.length,
   wordId:null,sourceWordId:null,syllableId:null,syllable:null,phonemes:null,
   ...(n.sourcePage?{sourcePage:n.sourcePage}:{}),
   ...(n.fermata?{sourceFermata:Object.freeze({...n.fermata})}:{}),
   ...(n.accidentalEvidence?{sourceAccidentalEvidence:n.accidentalEvidence}:{}),
   ...(n.sourcePitch?{sourcePitch:{...n.sourcePitch},sourceTranspose:transpose}:{}),
   ...(record.conditions?.[n.cell]?{sourceCondition:record.conditions[n.cell]}:{}),
   ...(n.slur?{sourceSlurId:n.slur.id,sourceSlurPhase:n.slur.phase}:{}),
   ...(n.tie?{tieId:n.tie.id,tieStart:n.tie.phase==='start',tieStop:n.tie.phase==='stop'}:{}),
   ...(n.tuplet?{sourceTupletId:n.tuplet.id,sourceTupletPhase:n.tuplet.phase}:{})};
  plan.push(event);beat+=event.beats;
 }
 return plan.map(e=>Object.freeze({...e,...(e.sourceRestsAfter?{sourceRestsAfter:Object.freeze(e.sourceRestsAfter.map(Object.freeze))}:{})}));
}
