// Original timing for one literal small-note shape. Its adjacent source mark
// remains undecoded and is not turned into an invented musical instruction.
export const SMALL_NOTE_STUDY=Object.freeze({id:'original-small-quarter-study-80ms-v1',secondsPerNote:.08,
 label:'Original written-pitch study · 80 ms small note',status:'original-instrumental-demonstration',
 basis:'Adds 80 ms for the printed small C5 quarter note between unchanged measured source notes. The adjacent unresolved mark is not realized.',sourceDuration:null,stealTimePrevious:null,stealTimeFollowing:null,notationalInterpretation:null,unresolvedMarkRealization:null,historicalRealization:null,review:null});
export function validateSourceSmallNote({quarterBeats,rhythm,smallNote}){
 const s=smallNote,r=rhythm;
 if(quarterBeats!==null||!s||s.kind!=='unmeasured-small-quarter'||s.printedSize!=='small'||s.slash!==false||s.duration!==null||s.stealTimePrevious!==null||s.stealTimeFollowing!==null||s.notationalInterpretation!==null||s.previousComponentId!=='cohen-p547-penitential-n010'||s.nextComponentId!=='cohen-p547-penitential-n012'||JSON.stringify(s.unresolvedMarkIds)!==JSON.stringify(['p547-small-note-mark'])||r?.type!=='quarter'||r.dots!==0||r.actual!==1||r.normal!==1)throw Error('The source small quarter note must retain its printed shape, anchors, unresolved mark and null timing/interpretation.');
 return s;
}
export function smallNoteStudyTiming(event,{tempo,smallNoteDemo=false}={}){
 if(!event.sourceSmallNote)return null;
 validateSourceSmallNote({quarterBeats:event.sourceQuarterBeats,rhythm:event.sourceRhythm,smallNote:event.sourceSmallNote});
 if(smallNoteDemo!==true)throw Error('This span contains an unmeasured small note and an unresolved source mark. Choose the explicit original 80 ms written-pitch study; the mark remains unrealized.');
 if(!Number.isFinite(tempo)||tempo<=0)throw Error('Invalid small-note study tempo.');
 return {beats:SMALL_NOTE_STUDY.secondsPerNote*tempo/60,seconds:SMALL_NOTE_STUDY.secondsPerNote,performanceTiming:{...SMALL_NOTE_STUDY}};
}
export function validateSmallNoteEvent(event){
 validateSourceSmallNote({quarterBeats:event.sourceQuarterBeats,rhythm:event.sourceRhythm,smallNote:event.sourceSmallNote});
 const mark=event.sourceUnresolvedMarks?.[0];
 if(event.sourceUnresolvedMarks?.length!==1||mark.id!=='p547-small-note-mark'||mark.sourceComponentId!==event.sourceNoteId||mark.semanticKind!==null||mark.realization!==null||mark.review!==null)throw Error('The unresolved source mark must retain null musical meaning, realization and review.');
 if(event.sourceProfile!=='cohen-1902-gen22-penitential'||event.sourceNoteId!=='cohen-p547-penitential-n011'||event.sourceWordId!=='gen-22-1-1'||typeof event.wordId!=='string'||!event.wordId||typeof event.syllableId!=='string'||typeof event.syllable!=='string'||event.phonemes!==null||event.performanceTiming?.id!==SMALL_NOTE_STUDY.id||event.durationSeconds!==.08||JSON.stringify(event.performanceTiming)!==JSON.stringify(SMALL_NOTE_STUDY))throw Error('Small-note playback needs its unchanged source occurrence and explicit original timing; no historical interpretation or phoneme is assigned.');
}
