// Original optional timing policy, CC0. Source duration/ornament role stay null.
export const SMALL_EIGHTH_STUDY=Object.freeze({id:'original-no268-small-eighth-80ms-v1',milliseconds:80,sourceDuration:null,sourceRole:null,stealingRatio:null,policy:'Add 80 ms between unchanged measured components; original instrumental demonstration, not historical timing.'});
const owners=Object.freeze({'idelsohn1929-268-system1-word7-note4':'exo-12-21-7','idelsohn1929-268-system4-component26':'exo-12-22-17'});
export function smallEighthStudyTiming(event,{tempo,smallEighthDemo=false}={}){
 if(!event.sourceSmallEighth)return null;
 if(event.sourceProfile!=='idelsohn-1929-vol5-no268'||owners[event.sourceNoteId]!==event.sourceWordId||event.sourceQuarterBeats!==null||event.sourceSmallEighth.type!=='eighth'||['slash','role','sourceDuration','stealingRatio'].some(k=>event.sourceSmallEighth[k]!==null)||event.sourcePitch?.step!=='C'||event.sourcePitch.alter!==0||event.sourcePitch.octave!==4||event.sourcePrintedSyllableIndex!==null||event.syllableId!==null||event.syllable!==null||event.phonemes!==null)throw Error('The small eighth must retain its exact source word/pitch, null role/duration and unassigned syllable/phonemes.');
 if(smallEighthDemo!==true)throw Error('This span includes unmeasured small eighth notes. Choose the optional original 80 ms instrumental timing to hear it; source timing and ornament roles remain unspecified.');
 if(!Number.isFinite(tempo)||tempo<=0)throw Error('Invalid source-study tempo.');return {seconds:.08,beats:.08*tempo/60,performanceTiming:SMALL_EIGHTH_STUDY};
}
export function validateSmallEighthEvent(event){
 smallEighthStudyTiming(event,{tempo:event.performanceTempo,smallEighthDemo:true});
 const r=event.sourceRhythm;if(event.durationSeconds!==.08||Math.abs(event.beats-.08*event.performanceTempo/60)>1e-10||JSON.stringify(event.performanceTiming)!==JSON.stringify(SMALL_EIGHTH_STUDY)||r.type!=='eighth'||r.dots!==0||r.actual!==1||r.normal!==1)throw Error('Small-eighth playback requires its explicit original timing policy and unchanged printed glyph.');
}
