// Original instrument timing, separate from Baer's unmeasured notation.
import {NO111_RECORD} from './baer-no111-data.js';
import {validateSourceGrace} from './source-grace.js';
export const NO111_GRACE_STUDY=Object.freeze({id:'original-baer111-word-grace-80ms-v1',secondsPerNote:.08,
 label:'Original instrumental study · 80 ms for each No111 slashed small note',
 status:'original-instrumental-demonstration',sourceDuration:null,stealTimePrevious:null,stealTimeFollowing:null,
 basis:'Adds80ms between unchanged measured source notes. Word candidates follow the printed Latin underlay; Hebrew/MAM syllable and phoneme fitting, historical duration and cantorial review remain unassigned.',review:null});
const specs=new Map(NO111_RECORD.studies.flatMap(s=>s.routes.map(r=>[`baer-1894-no111-${s.bookId}${s.chapter}-${s.verse}-${r.id}`,{study:s,route:r}])));
function source(event){
 const spec=specs.get(event.sourceProfile),c=spec?.study.components.find(c=>c.id===event.sourceNoteId);
 const word=spec?.study.words.find(w=>w.id===c?.candidateWordId);
 if(!c?.grace||!spec.route.componentIds.includes(c.id)||event.sourceWordId!==c.candidateWordId||typeof event.wordId!=='string'||!event.wordId||event.syllableId!==null||event.syllable!==null||event.phonemes!==null||event.sourcePrintedLyric!==c.sourcePrintedLyric||event.sourcePrintedSyllableIndex!==c.sourcePrintedGroupIndex||event.sourceQuarterBeats!==null||JSON.stringify(event.sourceNo111Grace)!==JSON.stringify(c.grace)||JSON.stringify(event.sourceRhythm)!==JSON.stringify(c.rhythm)||JSON.stringify(event.sourcePitch)!==JSON.stringify(c.sourcePitch)||!Number.isInteger(event.sourceTranspose)||Math.abs(event.sourceTranspose)>36||event.midi!==c.midi+event.sourceTranspose||event.sourceWordCorrespondence?.sourceHebrew!==word.sourceHebrew)throw Error('No111 grace needs its exact printed route, word candidate, lyric and null Hebrew/phoneme fitting.');
 validateSourceGrace(c);return c;
}
export function no111GraceTiming(event,{tempo,no111GraceDemo=false}={}){
 if(!event.sourceNo111Grace)return null;source(event);
 if(no111GraceDemo!==true)throw Error('This No111 span includes unmeasured slashed notes. Choose the separate original80ms instrumental study; historical durations and Hebrew/phoneme fitting remain unassigned.');
 if(!Number.isFinite(tempo)||tempo<=0)throw Error('Invalid No111 tempo.');
 return {beats:NO111_GRACE_STUDY.secondsPerNote*tempo/60,seconds:NO111_GRACE_STUDY.secondsPerNote,performanceTiming:{...NO111_GRACE_STUDY}};
}
export function validateNo111GraceEvent(event){
 const c=source(event),link=event.sourceWordCorrespondence;
 if(link?.status!=='lexical-source-word-candidate'||link.sourceWordId!==c.candidateWordId||link.independentReview!==null||link.acceptedSyllableMapping!==null||link.acceptedPhonemes!==null||event.durationSeconds!==.08||!Number.isFinite(event.performanceTempo)||event.performanceTempo<=0||Math.abs(event.beats-.08*event.performanceTempo/60)>1e-10||JSON.stringify(event.performanceTiming)!==JSON.stringify(NO111_GRACE_STUDY))throw Error('No111 grace playback needs exact original-demo timing and an explicitly unreviewed source-word candidate.');
 return c.grace;
}
