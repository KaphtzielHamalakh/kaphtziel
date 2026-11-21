import {PRINTED_PATTERNS} from './printed-pattern-data.js';
import {PRINTED_PATTERN_CATALOG,PATTERN_IMAGE_DATA,PATTERN_RECORD_DATA} from './pattern-catalog-data.js';
export {PRINTED_PATTERNS,PRINTED_PATTERN_CATALOG,PATTERN_IMAGE_DATA,PATTERN_RECORD_DATA};
export function patternSource(id=PRINTED_PATTERNS.id){
 const row=PRINTED_PATTERN_CATALOG.rows.find(r=>r.id===id);if(!row)throw Error('Choose a checked printed source row.');return row;
}
export function availablePatternModes(sourceId=PRINTED_PATTERNS.id){
 const cells=new Set(patternSource(sourceId).record.notes.map(n=>n.cell));
 return PATTERN_MODES.filter(m=>m.id==='pair'?cells.has('munah')&&cells.has('revia'):cells.has(m.id));
}
export function patternEvidence(sourceId,kind){
 const row=patternSource(sourceId),record=row.record;let file,url,mime;
 if(kind==='record'){file=row.recordPath??'docs/PRINTED-PATTERN-CATALOG.json';url=PATTERN_RECORD_DATA[file];mime='application/json';}
 else if(kind==='columns'||kind==='context'){file=kind==='columns'?record.source.image:record.source.contextImage.image;url=PATTERN_IMAGE_DATA[file];mime='image/png';}
 else throw Error('Choose a source image or record.');
 const prefix=`data:${mime};base64,`;if(!url?.startsWith(prefix))throw Error('Source evidence is unavailable.');
 const bytes=Uint8Array.from(atob(url.slice(prefix.length)),c=>c.charCodeAt(0));
 return {file,name:file.split('/').at(-1),url,mime,bytes,text:mime==='application/json'?new TextDecoder('utf-8',{fatal:true}).decode(bytes):null};
}
export const PATTERN_MODES=Object.freeze([
  {id:'pair',name:'Munaḥ → Revia · both printed columns'},
  {id:'munah',name:'Munaḥ · plain “Resting” column'},
  {id:'revia',name:'Revia · printed column'},
  {id:'yetiv',name:'Yetib · printed form (p.541)'},
  {id:'zakef-preceded',name:'Zaqef qaton · after Zaqef or Munaḥ (p.541)'}
]);
export function patternContextChoices(sourceId,mode){
 const record=patternSource(sourceId).record;
 if(!availablePatternModes(sourceId).some(m=>m.id===mode))return [];
 return record.matchingQueries?.[mode]??[{label:'Source combination',ids:record.matchingQuery}];
}
export function printedPatternPlan(mode='pair',{tempo=84,transpose=0,sourceId=PRINTED_PATTERNS.id}={}){
 if(!PATTERN_MODES.some(m=>m.id===mode))throw Error('Choose a printed pattern.');
 const row=patternSource(sourceId),record=row.record;
 if(!availablePatternModes(sourceId).some(m=>m.id===mode))throw Error('This printed source has no checked transcription for those columns.');
 if(!Number.isFinite(tempo)||tempo<=0||!Number.isInteger(transpose)||Math.abs(transpose)>36)throw Error('Invalid pattern tempo or key.');
 const components=record.notes.filter(n=>mode==='pair'?['munah','revia'].includes(n.cell):n.cell===mode),plan=[];
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
   ...(n.sourcePitch?{sourcePitch:{...n.sourcePitch},sourceTranspose:transpose}:{}),
   ...(record.conditions?.[n.cell]?{sourceCondition:record.conditions[n.cell]}:{}),
   ...(n.slur?{sourceSlurId:n.slur.id,sourceSlurPhase:n.slur.phase}:{}),
   ...(n.tie?{tieId:n.tie.id,tieStart:n.tie.phase==='start',tieStop:n.tie.phase==='stop'}:{}),
   ...(n.tuplet?{sourceTupletId:n.tuplet.id,sourceTupletPhase:n.tuplet.phase}:{})};
  plan.push(event);beat+=event.beats;
 }
 return plan.map(e=>Object.freeze({...e,...(e.sourceRestsAfter?{sourceRestsAfter:Object.freeze(e.sourceRestsAfter.map(Object.freeze))}:{})}));
}
