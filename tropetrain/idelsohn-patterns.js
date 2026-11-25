// Original bounded notation-study code, CC0-1.0. No historical performance is inferred.
import {IDELSOHN_PATTERN_ROW} from './idelsohn-pattern-data.js';
import {hasPatternSmallEighthStudy,patternSmallEighthTiming} from './source-pattern-small-eighth.js';
export const IDELSOHN_PATTERN_ID=IDELSOHN_PATTERN_ROW.id;
export function idelsohnPatternModes(){return IDELSOHN_PATTERN_ROW.record.figures.map(f=>({...f,cells:[f.id],name:`${f.name} · row${f.chartRow}/${f.chartPosition}${f.status==='pending'?(hasPatternSmallEighthStudy(f)?' · source timing withheld · optional original study':' · withheld'):' · unreviewed study'}`}));}
export function idelsohnPatternSource(mode){
 const record=IDELSOHN_PATTERN_ROW.record,figure=record.figures.find(f=>f.id===mode);
 const context=figure?[figure.sourceGrouping,figure.sourceSeparatorBefore?`Separator before: ${figure.sourceSeparatorBefore}.`:null,figure.fineMark?'Fine is printed above the first note; its performance boundary remains unset.':null,figure.afterFineAlternative?'II is printed after Fine; its relation to other figures remains unset. No automatic continuation.':null].filter(Boolean).join(' '):'';
 return {...IDELSOHN_PATTERN_ROW,record:{...record,selectedFigure:figure??null,selectedFigureContext:context}};
}
const phase=p=>p==='end'?'stop':p;
const rhythm=r=>({...r,type:r.type==='sixteenth'?'16th':r.type});
export function idelsohnPatternPlan(mode,{tempo=84,transpose=0,smallPatternDemo=false}={}){
 const {record}=idelsohnPatternSource(mode),figure=record.selectedFigure;
 const smallStudy=figure&&hasPatternSmallEighthStudy(figure);
 if(!figure||figure.status!=='written-values'&&!(smallStudy&&smallPatternDemo===true))throw Error('This figure is withheld: unresolved source notation or timing. The two small-note figures require their separate optional original timing study.');
 if(!Number.isFinite(tempo)||tempo<=0||!Number.isInteger(transpose)||Math.abs(transpose)>36)throw Error('Invalid pattern tempo or key.');
 const components=figure.components,plan=[],before=[];let beat=0;
 for(const [i,c] of components.entries()){
  const timing=patternSmallEighthTiming(figure,c,{tempo,smallPatternDemo}),beats=timing?.beats??c.quarterBeats;
  if(!Number.isFinite(beats)||beats<=0)throw Error('A source duration remains unset.');
  const common={id:c.id,sourceProfile:record.id,sourceRevision:record.revision,sourcePage:101,sourcePdfPage:104,sourceLocation:`${figure.sourceLocation}, component${i+1}`,sourceLabel:figure.name,sourceCell:figure.id,sourceComponentNumber:i+1,sourceComponentCount:components.length,beats,sourceQuarterBeatFraction:c.quarterBeatFraction===null?null:{...c.quarterBeatFraction},startBeat:beat,startSeconds:beat*60/tempo,durationSeconds:timing?.seconds??c.quarterBeats*60/tempo,independentReview:null,sourceActualTuning:null,studyStatus:smallStudy?'unreviewed-original-small-note-timing-study':record.studyStatus};
  if(c.kind==='rest'){
   const rest={...common,kind:'rest',rhythm:rhythm(c.rhythm)};
   if(plan.length)(plan.at(-1).sourceRestsAfter??=[]).push(rest);else before.push(rest);
  }else{
   const event={...common,midi:c.midi+transpose,sourcePitch:{...c.sourcePitch},sourceTranspose:transpose,sourceRhythm:rhythm(c.rhythm),sourceWrittenRhythm:{...c.rhythm},wordId:null,sourceWordId:null,syllableId:null,syllable:null,phonemes:null,
    ...(timing?{sourceNoteId:c.id,sourceQuarterBeats:null,sourcePatternSmallEighth:structuredClone(c.printedSmallNote),performanceTiming:timing.performanceTiming,performanceTempo:tempo}:{}),
    ...(c.accidentalEvidence?{sourceAccidentalEvidence:c.accidentalEvidence}:{}),
    ...(c.slur?{sourceSlurId:c.slur.id,sourceSlurPhase:phase(c.slur.phase)}:{}),
    ...(c.slurs?{sourceSlurs:c.slurs.map(s=>({...s,phase:phase(s.phase)}))}:{}),
    ...(c.tuplet?{sourceTupletId:c.tuplet.id,sourceTupletPhase:phase(c.tuplet.phase)}:{})};
   if(!plan.length&&before.length)event.sourceRestsBefore=before;
   plan.push(event);
  }
  beat+=beats;
 }
 if(!plan.length||Math.abs(beat-(smallStudy?1+.08*tempo/60:figure.printedQuarterBeats))>1e-8)throw Error('The complete written duration no longer matches the source figure.');
 const last=plan.at(-1),tail=beat-last.startBeat-last.beats;
 if(tail>1e-8){last.endingRestBeats=tail;last.endingRestSeconds=tail*60/tempo;}
 return plan.map(e=>Object.freeze({...e,sourcePitch:Object.freeze(e.sourcePitch),sourceRhythm:Object.freeze(e.sourceRhythm),sourceWrittenRhythm:Object.freeze(e.sourceWrittenRhythm),sourceQuarterBeatFraction:e.sourceQuarterBeatFraction===null?null:Object.freeze(e.sourceQuarterBeatFraction),...(e.sourcePatternSmallEighth?{sourcePatternSmallEighth:Object.freeze(e.sourcePatternSmallEighth)}:{}),...(e.sourceSlurs?{sourceSlurs:Object.freeze(e.sourceSlurs.map(Object.freeze))}:{}),...Object.fromEntries(['sourceRestsBefore','sourceRestsAfter'].filter(k=>e[k]).map(k=>[k,Object.freeze(e[k].map(r=>Object.freeze({...r,rhythm:Object.freeze(r.rhythm),sourceQuarterBeatFraction:Object.freeze(r.sourceQuarterBeatFraction)})))]))}));
}
