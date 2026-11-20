import {PRINTED_PATTERNS} from './printed-pattern-data.js';
export {PRINTED_PATTERNS};
export const PATTERN_MODES=Object.freeze([
  {id:'pair',name:'Munaḥ → Revia · both printed columns'},
  {id:'munah',name:'Munaḥ · plain “Resting” column'},
  {id:'revia',name:'Revia · printed column'}
]);
export function printedPatternPlan(mode='pair',{tempo=84,transpose=0}={}){
  if(!PATTERN_MODES.some(m=>m.id===mode))throw Error('Choose a printed pattern.');
  if(!Number.isFinite(tempo)||tempo<=0||!Number.isInteger(transpose)||Math.abs(transpose)>36)throw Error('Invalid pattern tempo or key.');
  let beat=0;
  return PRINTED_PATTERNS.notes.filter(n=>mode==='pair'||n.cell===mode).map(n=>{
    const e={id:n.id,sourceProfile:PRINTED_PATTERNS.id,sourceRevision:PRINTED_PATTERNS.revision,sourceLocation:n.sourceLocation,
      sourceLabel:n.cell==='munah'?'Munaḥ · printed plain form':'Revia · printed form',midi:n.midi+transpose,beats:n.quarterBeats,
      startBeat:beat,startSeconds:beat*60/tempo,durationSeconds:n.quarterBeats*60/tempo,sourceRhythm:{...n.rhythm},
      wordId:null,sourceWordId:null,syllableId:null,syllable:null,phonemes:null,
      ...(n.slur?{sourceSlurId:n.slur.id,sourceSlurPhase:n.slur.phase}:{})};
    beat+=e.beats;return Object.freeze(e);
  });
}
