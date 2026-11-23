// Original instrumental timing choice, kept separate from unmeasured notation.
export const GRACE_DEMO=Object.freeze({
 id:'original-grace-demo-80ms-v1',secondsPerNote:.08,
 label:'Original instrumental grace timing · 80 ms per note',
 status:'original-instrumental-demonstration',
 basis:'Adds 80 ms for each unmeasured grace note between unchanged measured source notes. No source stealing ratio, historical duration or cantorial realization is inferred.',
 sourceDuration:null,review:null
});

export function validateSourceGrace(component){
 const g=component?.grace,r=component?.rhythm;
 if(component?.kind!=='note'||component.quarterBeats!==null||!g||g.kind!=='unmeasured'||
  !g.groupId||!g.previousComponentId||!g.nextComponentId||g.previousComponentId===g.nextComponentId||
  !Number.isInteger(g.order)||g.order<1||!Number.isInteger(g.count)||g.count<g.order||
  g.duration!==null||g.stealTimePrevious!==null||g.stealTimeFollowing!==null||g.printedSize!=='small'||typeof g.slash!=='boolean'||
  !r||!['eighth','16th','32nd'].includes(r.type)||r.dots!==0||r.actual!==1||r.normal!==1)
  throw Error('An unmeasured source grace must retain its printed shape, anchors and null timing.');
 if(g.printedBeams!==({eighth:1,'16th':2,'32nd':3}[r.type]))throw Error('Grace beam shape changed.');
 return g;
}

export function graceDemoTiming(component,{tempo,graceDemo=false}={}){
 if(!component?.grace)return null;
 validateSourceGrace(component);
 if(graceDemo!==true)throw Error('Choose the original instrumental grace timing demonstration; source durations remain unspecified.');
 if(!Number.isFinite(tempo)||tempo<=0)throw Error('Invalid grace demonstration tempo.');
 return {beats:GRACE_DEMO.secondsPerNote*tempo/60,seconds:GRACE_DEMO.secondsPerNote,
  sourceQuarterBeats:null,sourceGrace:structuredClone(component.grace),performanceTiming:{...GRACE_DEMO}};
}

export function validateGraceEvent(event){
 const g=validateSourceGrace({kind:'note',quarterBeats:event.sourceQuarterBeats,grace:event.sourceGrace,rhythm:event.sourceRhythm});
 if(event.wordId!==null||event.sourceWordId!==null||event.syllableId!==null||event.syllable!==null||event.phonemes!==null||
  event.performanceTiming?.id!==GRACE_DEMO.id||event.performanceTiming.sourceDuration!==null||
  event.durationSeconds!==GRACE_DEMO.secondsPerNote||event.performanceTiming.review!==null)
  throw Error('Unmeasured grace playback requires explicit original-demo provenance and no inferred word or phoneme timing.');
 return g;
}
