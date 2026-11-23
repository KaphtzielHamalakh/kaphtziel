// Original source-study code. New literal transcription CC0-1.0; print public domain.
import {BAER_PATTERN_ROW} from './baer-pattern-data.js';
import {baerComponentRoutes} from './baer-notation.js';
import {graceDemoTiming} from './source-grace.js';
import {repeatOccurrences} from './source-repeat.js';
export const BAER_PATTERN_ID=BAER_PATTERN_ROW.id;
const pair={id:'munah-revia-pair',name:'Munaḥ → Revia · adjacent source columns',page:31,cells:['munah-before-revia','revia'],status:'transcribed'};
export function baerPatternModes(){return [...BAER_PATTERN_ROW.record.figures,pair].flatMap(f=>{
 const common={...f,sourceFigureId:f.id,cells:f.cells??[f.id]};
 if(f.variants)return f.variants.map((v,index)=>({...common,id:index?`${f.id}:${v.id}`:f.id,name:`${f.name} · ${v.label}`,sourceVariant:v}));
 return [{...common,name:f.name+(f.status==='transcribed'?'':f.status==='unmeasured-grace'?' · unmeasured grace · optional demo':' · pending')}];
});}
export function baerPatternSource(mode){
 const figure=baerPatternModes().find(f=>f.id===mode),page=figure?.page??30,record=BAER_PATTERN_ROW.record,scan=record.source.detailImages?.[figure?.detailImage]??record.source.pages[String(page)];
 return {...BAER_PATTERN_ROW,record:{...record,source:{...record.source,page,image:scan.image,...(figure?.detailImage?{contextImage:record.source.pages[String(page)]}:{}),caption:`Printed p.${page}, first setting. ${figure?.name??record.name}. `+(figure?.pending??figure?.contextPending??'Literal notes/rests only; no Bible-word fitting or complete grammar is asserted.')+(figure?.sourceCondition?` Printed condition: ${figure.sourceCondition.literal} (${figure.sourceCondition.english}); modern application remains unassigned.`:'')},selectedFigure:figure??null}};
}
export function baerPatternWrittenPlan(mode,options={}){return baerPatternPlan(mode,{...options,written:true});}
export function baerPatternPlan(mode,{tempo=84,transpose=0,graceDemo=false,repeatDemo=false,written=false}={}){
 const row=baerPatternSource(mode),record=row.record,figure=record.selectedFigure;
 if(!figure)throw Error('Choose a printed pattern.');
 if(figure.status!=='transcribed'&&!(figure.status==='unmeasured-grace'&&graceDemo===true))throw Error('This source figure awaits literal notation or timing review. An unmeasured-grace figure requires the optional original instrumental timing demonstration.');
 if(!Number.isFinite(tempo)||tempo<=0||!Number.isInteger(transpose)||Math.abs(transpose)>36)throw Error('Invalid pattern tempo or key.');
 const components=figure.cells.flatMap(id=>{
  const source=record.figures.find(f=>f.id===id),routes=baerComponentRoutes(record,source,{allowUnmeasuredGrace:graceDemo===true});
  const selected=routes.find(r=>r.variant?.id===(figure.sourceVariant?.id??undefined))??(!figure.sourceVariant?routes[0]:null);
  if(!selected)throw Error('Choose an explicit source alternative.');return selected.components;
 });
 if(!components.length||components.some(c=>!c))throw Error('This source figure has no complete transcribed component route.');
 let beat=0;const plan=[],before=[];
 for(const occurrence of repeatOccurrences(components,figure.repeat,{repeatDemo,written})){
  const {component:c,index:i,...repetition}=occurrence;
  const grace=graceDemoTiming(c,{tempo,graceDemo}),beats=grace?.beats??c.quarterBeats;
  const common={id:occurrence.repeatPass?`${c.id}-pass-${occurrence.repeatPass}`:c.id,...(figure.repeat?{sourceComponentId:c.id,...repetition}:{}),sourceProfile:record.id,sourceRevision:record.revision,sourcePage:c.sourcePage,sourceLocation:c.sourceLocation,sourceLabel:record.figures.find(f=>f.id===c.cell).name,sourceComponentNumber:i+1,sourceComponentCount:components.length,sourceCell:c.cell,beats,startBeat:beat,startSeconds:beat*60/tempo,durationSeconds:grace?.seconds??beats*60/tempo,
   ...(grace?{sourceQuarterBeats:null,sourceGrace:grace.sourceGrace,performanceTiming:grace.performanceTiming}:{}),
   ...(figure.sourceVariant?{sourceVariant:Object.freeze({id:figure.sourceVariant.id,label:figure.sourceVariant.label,figureId:figure.sourceFigureId})}:{}),...(c.sourceBar?{sourceBar:c.sourceBar}:{})};
  if(c.kind==='rest'){
   const rest={...common,kind:'rest',rhythm:{...c.rhythm}};
   if(plan.length)(plan.at(-1).sourceRestsAfter??=[]).push(rest);else before.push(rest);
  }else{
   const event={...common,midi:c.midi+transpose,sourcePitch:{...c.sourcePitch},sourceTranspose:transpose,sourceRhythm:{...c.rhythm},wordId:null,sourceWordId:null,syllableId:null,syllable:null,phonemes:null,
    ...(c.slur?{sourceSlurId:c.slur.id,sourceSlurPhase:c.slur.phase}:{}),...(c.tuplet?{sourceTupletId:c.tuplet.id,sourceTupletPhase:c.tuplet.phase}:{}),
    ...(c.slurs?{sourceSlurs:Object.freeze(c.slurs.map(s=>Object.freeze({...s})))}:{}),
    ...(c.tie?{tieId:c.tie.id,tieStart:c.tie.phase==='start',tieStop:c.tie.phase==='stop'}:{}),
    ...(c.fermata?{sourceFermata:{...c.fermata}}:{}),...(c.accidentalEvidence?{sourceAccidentalEvidence:c.accidentalEvidence}:{}),
    ...(record.figures.find(f=>f.id===c.cell).sourceCondition?{sourceCondition:{...record.figures.find(f=>f.id===c.cell).sourceCondition}}:{})};
   if(!plan.length&&before.length)event.sourceRestsBefore=before;
   plan.push(event);
  }
  beat+=beats;
 }
 if(!plan.length)throw Error('A source figure requires a transcribed pitched component.');
 const last=plan.at(-1),tail=beat-last.startBeat-last.beats;
 if(tail>1e-8){last.endingRestBeats=tail;last.endingRestSeconds=tail*60/tempo;}
 return plan.map(e=>Object.freeze({...e,sourcePitch:Object.freeze(e.sourcePitch),sourceRhythm:Object.freeze(e.sourceRhythm),...(e.sourceGrace?{sourceGrace:Object.freeze(e.sourceGrace),performanceTiming:Object.freeze(e.performanceTiming)}:{}),...(e.sourceFermata?{sourceFermata:Object.freeze(e.sourceFermata)}:{}),...(e.sourceCondition?{sourceCondition:Object.freeze(e.sourceCondition)}:{}),...Object.fromEntries(['sourceRestsBefore','sourceRestsAfter'].filter(k=>e[k]).map(k=>[k,Object.freeze(e[k].map(r=>Object.freeze({...r,rhythm:Object.freeze(r.rhythm)})))]))}));
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
