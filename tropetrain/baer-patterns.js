// Original source-study code. New literal transcription CC0-1.0; print public domain.
import {BAER_PATTERN_ROW} from './baer-pattern-data.js';
export const BAER_PATTERN_ID=BAER_PATTERN_ROW.id;
const pair={id:'munah-revia-pair',name:'Munaḥ → Revia · adjacent source columns',page:31,cells:['munah-before-revia','revia'],status:'transcribed'};
export function baerPatternModes(){return [...BAER_PATTERN_ROW.record.figures,pair].map(f=>({...f,cells:f.cells??[f.id],name:f.name+(f.status==='transcribed'?'':' · pending')}));}
export function baerPatternSource(mode){
 const figure=baerPatternModes().find(f=>f.id===mode),page=figure?.page??30,record=BAER_PATTERN_ROW.record,scan=record.source.pages[String(page)];
 return {...BAER_PATTERN_ROW,record:{...record,source:{...record.source,page,image:scan.image,caption:`Printed p.${page}, first setting. ${figure?.name??record.name}. `+(figure?.pending??figure?.contextPending??'Literal notes/rests only; no Bible-word fitting or complete grammar is asserted.')},selectedFigure:figure??null}};
}
export function baerPatternPlan(mode,{tempo=84,transpose=0}={}){
 const row=baerPatternSource(mode),record=row.record,figure=record.selectedFigure;
 if(!figure)throw Error('Choose a printed pattern.');
 if(figure.status!=='transcribed')throw Error('This source figure awaits literal notation or application review. No replacement music is supplied.');
 if(!Number.isFinite(tempo)||tempo<=0||!Number.isInteger(transpose)||Math.abs(transpose)>36)throw Error('Invalid pattern tempo or key.');
 const components=record.notes.filter(c=>figure.cells.includes(c.cell));if(!components.length)throw Error('This source figure has no transcribed components.');
 let beat=0;const plan=[],before=[];
 for(const [i,c] of components.entries()){
  const common={id:c.id,sourceProfile:record.id,sourceRevision:record.revision,sourcePage:c.sourcePage,sourceLocation:c.sourceLocation,sourceLabel:record.figures.find(f=>f.id===c.cell).name,sourceComponentNumber:i+1,sourceComponentCount:components.length,sourceCell:c.cell,beats:c.quarterBeats,startBeat:beat,startSeconds:beat*60/tempo,durationSeconds:c.quarterBeats*60/tempo};
  if(c.kind==='rest'){
   const rest={...common,kind:'rest',rhythm:{...c.rhythm}};
   if(plan.length)(plan.at(-1).sourceRestsAfter??=[]).push(rest);else before.push(rest);
  }else{
   const event={...common,midi:c.midi+transpose,sourcePitch:{...c.sourcePitch},sourceTranspose:transpose,sourceRhythm:{...c.rhythm},wordId:null,sourceWordId:null,syllableId:null,syllable:null,phonemes:null,
    ...(c.slur?{sourceSlurId:c.slur.id,sourceSlurPhase:c.slur.phase}:{}),...(c.tuplet?{sourceTupletId:c.tuplet.id,sourceTupletPhase:c.tuplet.phase}:{})};
   if(!plan.length&&before.length)event.sourceRestsBefore=before;
   plan.push(event);
  }
  beat+=c.quarterBeats;
 }
 if(!plan.length)throw Error('A source figure requires a transcribed pitched component.');
 const last=plan.at(-1),tail=beat-last.startBeat-last.beats;
 if(tail>1e-8){last.endingRestBeats=tail;last.endingRestSeconds=tail*60/tempo;}
 return plan.map(e=>Object.freeze({...e,sourcePitch:Object.freeze(e.sourcePitch),sourceRhythm:Object.freeze(e.sourceRhythm),...Object.fromEntries(['sourceRestsBefore','sourceRestsAfter'].filter(k=>e[k]).map(k=>[k,Object.freeze(e[k].map(r=>Object.freeze({...r,rhythm:Object.freeze(r.rhythm)})))]))}));
}
// Rest positions are explicit source components, including before the first
// pitched event and after the last. This does not identify acoustic silence.
export function printedRestAt(plan,seconds){
 if(!Number.isFinite(seconds)||seconds<0)return null;
 let start=0;
 for(const rest of plan[0]?.sourceRestsBefore??[]){if(seconds>=start&&seconds<start+rest.durationSeconds)return rest;start+=rest.durationSeconds;}
 for(const event of plan){start=event.startSeconds+event.durationSeconds;for(const rest of event.sourceRestsAfter??[]){if(seconds>=start&&seconds<start+rest.durationSeconds)return rest;start+=rest.durationSeconds;}}
 return null;
}
export function printedPatternDuration(plan){const last=plan.at(-1);return last?last.startSeconds+last.durationSeconds+(last.endingRestSeconds??0):0;}
export function printedPatternBeats(plan){const last=plan.at(-1);return last?last.startBeat+last.beats+(last.endingRestBeats??0):0;}
export function printedPatternRests(plan){return plan.flatMap(e=>[...(e.sourceRestsBefore??[]),...(e.sourceRestsAfter??[])]);}
