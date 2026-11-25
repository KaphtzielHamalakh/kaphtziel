import {IDELSOHN_SCORE_RECORD} from './idelsohn-score-data.js';
import {smallEighthStudyTiming} from './source-small-eighth.js';
export const IDELSOHN_SCORE=Object.freeze({
 id:IDELSOHN_SCORE_RECORD.id,revision:1,eventPrefix:'idelsohn268',wordOnly:true,requiresSmallEighthTiming:true,preserveBoundaryRests:true,notationGroupScope:'verse',
 name:'Printed Exodus 12:21–22 · Idelsohn 1929 No268 · word study',
 status:'unreviewed literal transcription and source-word correspondence; Hebrew syllable/phoneme fitting unassigned',
 license:'Original 1929 print public domain; new transcription/code CC0-1.0',
 creator:'Abraham Z. Idelsohn, Gesänge der marokkanischen Juden (1929), No268, printed p.102 / PDF105',
 source:IDELSOHN_SCORE_RECORD.source.url,scan:'./assets/scores/idelsohn-1929-no268.jpg',coverageLabel:'Exodus 12:21–22',coverage:Object.freeze(IDELSOHN_SCORE_RECORD.words.map(w=>w.id)),
 description:'39 unchanged marked Hebrew words and 125 written pitches; source-word correspondence is a candidate, not Hebrew syllable or pronunciation fitting. Nine printed rests, nine tuplets, eleven slurs and two unmeasured small C4 eighths are retained. No full Torah grammar, Kinnor equivalence or singing voice is inferred.',
 performanceNote:'Written values use your independent quarter-note tempo and transposition. Modern 12-TET tuning and instrument articulation are approximate. Optional original 80 ms timing for two small C4 eighths adds time between unchanged measured notes; source durations and roles remain null.',
 exportNote:'Idelsohn 1929 No268 Exodus 12:21–22: unreviewed lexical source-word correspondence only. Whole Hebrew words are display labels; syllable/phoneme fitting is unassigned. Printed Latin syllable indices are retained separately. Two small C4 source durations and roles are null; exports use original 80 ms performance timing only when explicitly selected, with printed glyphs retained in metadata.',
 summary:'Idelsohn 1929 No268 · source-word study, review pending · syllable/phoneme fitting unassigned'
});
const rows=new Map(IDELSOHN_SCORE_RECORD.words.map(w=>[w.id,{...w,notes:[]} ])),components=IDELSOHN_SCORE_RECORD.components;
let previous=null,pending=[];
for(const c of components){
 if(c.kind==='rest'){
  const leading=!previous||previous.sourceSystem!==c.sourceSystem;
  if(leading)pending.push(c);else(previous.restsAfter??=[]).push(c);continue;
 }
 const n={...c,...(pending.length?{restsBefore:pending}:{} )};pending=[];rows.get(c.candidateWordId).notes.push(n);previous=n;
}
export function idelsohnScoreWord(word){const r=rows.get(word.sourceWordId??word.id);return r?.sourceHebrew===word.sourceHebrew?r:null;}
const phase=p=>p==='end'?'stop':p,rhythm=r=>({...r,type:r.type==='sixteenth'?'16th':r.type});
export function idelsohnWordEvents(words){return words.flatMap(w=>{
 const row=idelsohnScoreWord(w);if(!row)return [];
 return row.notes.map((n,i)=>Object.freeze({id:`${w.id}-no268-${n.id}`,wordId:w.id,wordIndex:w.index,sourceWordId:w.sourceWordId??w.id,syllableId:null,syllable:null,roman:null,phonemes:null,midi:n.midi,beats:n.quarterBeats,part:i+1,sourceProfile:IDELSOHN_SCORE.id,sourceRevision:1,sourceNoteId:n.id,sourceSystem:n.sourceSystem,sourcePitch:n.sourcePitch,sourceTranspose:0,sourceRhythm:rhythm(n.rhythm),sourceWrittenRhythm:n.rhythm,sourceQuarterBeats:n.quarterBeats,sourceQuarterBeatFraction:n.quarterBeatFraction,sourcePrintedSyllableIndex:n.sourcePrintedSyllableIndex,sourceLocation:`No268, printedp.102/PDF105, system${n.sourceSystem}, printed word${row.sourcePosition}, component${i+1}`,sourceWordCorrespondence:Object.freeze({status:'lexical-source-word-candidate',sourceWordId:row.id,sourceHebrew:row.sourceHebrew,printedWordId:row.printedWordId,independentReview:null,acceptedSyllableMapping:null,acceptedPhonemes:null}),
 ...(n.printedSmallNote?{sourceSmallEighth:n.printedSmallNote}:{}),...(n.accidentalEvidence?{sourceAccidentalEvidence:n.accidentalEvidence}:{}),...(n.slur?{sourceSlurId:`${w.verseKey}-${n.slur.id}`,sourceSlurPhase:phase(n.slur.phase)}:{}),...(n.tuplet?{sourceTupletId:`${w.verseKey}-${n.tuplet.id}`,sourceTupletPhase:phase(n.tuplet.phase)}:{}),...(n.restsBefore?{sourceWrittenRestsBefore:n.restsBefore}:{}),...(n.restsAfter?{sourceWrittenRestsAfter:n.restsAfter}:{})}));
 });}
export function idelsohnWordPlan(events,{tempo=84,transpose=0,smallEighthDemo=false}={}){
 const plan=[];let beat=0;
 const rests=(raw,owner,placement)=>raw.map(c=>{const r={id:`${owner.wordId}-no268-${c.id}`,sourceRestId:c.id,kind:'rest',sourceLocation:`No268, system${c.sourceSystem}, ${placement}printed rest`,sourcePlacement:placement,wordId:null,sourceWordId:null,acousticSilence:null,beats:c.quarterBeats,startBeat:beat,startSeconds:beat*60/tempo,durationSeconds:c.quarterBeats*60/tempo,rhythm:rhythm(c.rhythm)};beat+=r.beats;return r;});
 for(const e of events){
  const before=rests(e.sourceWrittenRestsBefore??[],e,'system-leading');if(before.length&&plan.length)(plan.at(-1).sourceRestsAfter??=[]).push(...before);
  const small=smallEighthStudyTiming(e,{tempo,smallEighthDemo}),beats=small?.beats??e.beats,event={...e,beats,midi:e.midi+transpose,sourceTranspose:transpose,performanceTempo:tempo,startBeat:beat,startSeconds:beat*60/tempo,durationSeconds:small?.seconds??beats*60/tempo,...(small?{performanceTiming:small.performanceTiming}:{}),...(!plan.length&&before.length?{sourceRestsBefore:before}:{})};beat+=beats;
  const after=rests(e.sourceWrittenRestsAfter??[],e,'following');if(after.length)event.sourceRestsAfter=after;plan.push(event);
 }
 if(plan.length){const last=plan.at(-1),tail=beat-last.startBeat-last.beats;if(tail>1e-8){last.endingRestBeats=tail;last.endingRestSeconds=tail*60/tempo;}}
 return plan;
}
