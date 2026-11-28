import {NO111_RECORD} from './baer-no111-data.js';
import {no111GraceTiming,validateNo111GraceEvent} from './source-no111-performance.js';
const specs=NO111_RECORD.studies.flatMap(study=>study.routes.map(route=>({id:`baer-1894-no111-${study.bookId}${study.chapter}-${study.verse}-${route.id}`,study,route})));
const specById=new Map(specs.map(s=>[s.id,s]));
export const BAER_NO111_PROFILES=Object.freeze(specs.map(({id,study:s,route:r})=>Object.freeze({id,revision:1,eventPrefix:'baer111',wordOnly:true,requiresNo111Grace:true,preserveBoundaryRests:true,notationGroupScope:'verse',
 name:`Printed ${s.bookId==='gen'?'Genesis':'Exodus'} ${s.chapter}:${s.verse} opening · Baer No111 ${s.printedSetting} ${r.id} · draft`,
 status:'unreviewed literal source-word study; Hebrew/MAM syllable and phoneme fitting unassigned',
 license:'Nineteenth-century print public domain; new transcription/code CC0-1.0',creator:'Abraham Baer, third expanded edition [1894], No111, printed37/PDF82',source:NO111_RECORD.source.url,scan:'./'+NO111_RECORD.source.scan.image,
 coverageLabel:s.coverageLabel,coverage:Object.freeze(s.words.map(w=>w.id)),
 meterByBar:Object.fromEntries([...new Set(s.components.map(c=>c.sourceBar))].map(b=>[b,s.sourceMeter==='3/4'?3:4])),
 description:`${s.coverageLabel}. ${r.label}; ${r.componentIds.filter(id=>s.components.find(c=>c.id===id).kind==='note').length} pitched components, including ${r.graceNotes} unmeasured slashed notes. Printed Latin underlay supplies word candidates, with no accepted Hebrew syllable or phoneme fit. This is not a complete tradition or a Kinnor preset.`,
 performanceNote:'Measured notation uses your quarter-note BPM and independent key. Modern12TET/articulation are approximate. Optional80msgrace timing is original; source durations/stealing ratios and fermata hold lengths remain unspecified.',
 exportNote:`Baer [1894] No111 ${s.printedSetting}, ${s.coverageLabel}, ${r.label}. Original marked UXLC words retained. Whole-word candidates and literal Latin source units are separate from Hebrew/MAM syllable fitting and pronunciation styles. Unmeasured slashed notes remain grace elements; optional80ms performance clocks are original project metadata. Fermata holds unspecified; no completed historical grammar or singing voice.`,
 summary:'BaerNo111 · bounded unreviewed instrumental word candidates · independent pronunciation text · source grace timing unassigned'
})));
export function no111ScoreWord(word,profileId){
 const spec=specById.get(profileId),r=spec?.study.words.find(w=>w.id===(word.sourceWordId??word.id));
 return r?.sourceHebrew===word.sourceHebrew?r:null;
}
export function no111WordEvents(profileId,words){
 const spec=specById.get(profileId);if(!spec)throw Error('Unknown No111 source path.');const {study,route}=spec,byId=new Map(study.components.map(c=>[c.id,c])),physical=route.componentIds.map(id=>byId.get(id)),following=new Map();let preceding=null;
 for(const c of physical){if(c.kind==='rest'){if(!preceding)throw Error('Unexpected No111 leading rest.');const list=following.get(preceding.id)??[];list.push(c);following.set(preceding.id,list);}else preceding=c;}
 return words.flatMap(w=>{
  const row=no111ScoreWord(w,profileId);if(!row)return [];
  return physical.filter(c=>c.kind==='note'&&c.candidateWordId===row.id).map((c,i)=>Object.freeze({id:`${w.id}-${profileId}-${c.id}`,wordId:w.id,wordIndex:w.index,sourceWordId:w.sourceWordId??w.id,syllableId:null,syllable:null,roman:null,phonemes:null,midi:c.midi,beats:c.quarterBeats,part:i+1,
   sourceProfile:profileId,sourceRevision:1,sourceNoteId:c.id,sourceStudy:study.id,sourceVariant:route.id,sourceSystem:study.printedSetting,sourcePage:37,sourcePdfPage:82,sourceLocation:c.sourceLocation,sourceBar:c.sourceBar,sourcePitch:c.sourcePitch,sourceTranspose:0,sourceRhythm:c.rhythm,sourceWrittenRhythm:c.rhythm,sourceQuarterBeats:c.quarterBeats,
   sourcePrintedSyllableIndex:c.sourcePrintedGroupIndex,sourcePrintedSyllableId:`${w.id}-baer111-${study.id}-printed${c.sourcePrintedGroupIndex}`,sourcePrintedUnitLabel:'literal Latin source unit',sourcePrintedLyric:c.sourcePrintedLyric,sourcePrintedUnitCount:row.printedUnits.length,
   sourceWordCorrespondence:Object.freeze({status:'lexical-source-word-candidate',sourceWordId:row.id,sourceHebrew:row.sourceHebrew,printedWordId:`baer111-${study.id}-${row.id}`,independentReview:null,acceptedSyllableMapping:null,acceptedPhonemes:null}),
   ...(c.grace?{sourceNo111Grace:structuredClone(c.grace)}:{}),...(c.fermata?{sourceFermata:structuredClone(c.fermata)}:{}),
   ...(c.slur?{sourceSlurId:`${w.verseKey}-${c.slur.id}`,sourceSlurPhase:c.slur.phase,sourceSlurPlacement:c.slur.placement}:{}),
   ...(c.tuplet?{sourceTupletId:`${w.verseKey}-${c.tuplet.id}`,sourceTupletPhase:c.tuplet.phase}:{}),
   ...(following.has(c.id)?{sourceWrittenRestsAfter:following.get(c.id)}:{})}));
 });
}
export function no111WordPlan(profileId,events,{tempo=84,transpose=0,no111GraceDemo=false}={}){
 if(!specById.has(profileId)||!Number.isFinite(tempo)||tempo<=0||!Number.isInteger(transpose)||Math.abs(transpose)>36)throw Error('Invalid No111 source, tempo or transposition.');
 const plan=[];let beat=0;
 for(const e of events){
  if(e.sourceProfile!==profileId)throw Error('No111 plan cannot substitute another source.');
  const special=no111GraceTiming(e,{tempo,no111GraceDemo}),beats=special?.beats??e.beats;if(!Number.isFinite(beats)||beats<=0)throw Error('No111 source duration remains unassigned.');
  const n={...e,beats,midi:e.midi+transpose,sourceTranspose:transpose,performanceTempo:tempo,startBeat:beat,startSeconds:beat*60/tempo,durationSeconds:special?.seconds??beats*60/tempo,...(special?{performanceTiming:special.performanceTiming}:{})};beat+=beats;
  if(e.sourceWrittenRestsAfter?.length)n.sourceRestsAfter=e.sourceWrittenRestsAfter.map(c=>{const rest={id:`${e.wordId}-baer111-${c.id}`,sourceRestId:c.id,kind:'rest',sourceLocation:c.sourceLocation,sourcePlacement:'following',wordId:null,sourceWordId:null,acousticSilence:null,beats:c.quarterBeats,startBeat:beat,startSeconds:beat*60/tempo,durationSeconds:c.quarterBeats*60/tempo,rhythm:c.rhythm};beat+=rest.beats;return rest;});
  if(n.sourceNo111Grace)validateNo111GraceEvent(n);plan.push(n);
 }
 if(plan.length){const last=plan.at(-1),tail=beat-last.startBeat-last.beats;if(tail>1e-8){last.endingRestBeats=tail;last.endingRestSeconds=tail*60/tempo;}}
 return plan;
}
