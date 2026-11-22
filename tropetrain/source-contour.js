// Original software CC0-1.0; generated source-measurement adaptations CC BY-SA3.0.
// Original sonification of source F0 measurements; adaptation CC BY-SA 3.0.
// A held measurement is not a reviewed note, phoneme or musical rest.
export const CONTOUR_RENDERING=Object.freeze({revision:1,sampleRate:16000,hop:160,amplitude:.2,edgeFadeSamples:32,maxFrames:16000*3600});
export function contourSemitones(value){
 if(!Number.isInteger(value)||value< -12||value>12)throw Error('Choose measured-tone pitch from −12 to +12 semitones.');return value;
}
export function contourGeometry(data,semitones=0){
 contourSemitones(semitones);const p=data?.parameters,pcm=data?.decodedPcm,c=data?.counts,r=CONTOUR_RENDERING;
 if(p?.sampleRate!==r.sampleRate||p.hop!==r.hop||p.frequencyUnitHz!==.1||p.periodicityUnit!==.0001||pcm?.sampleRate!==r.sampleRate||pcm.channels!==1||pcm.bitsPerSample!==16||!Number.isInteger(pcm.frames)||pcm.frames<1||pcm.frames>r.maxFrames||pcm.durationSeconds!==pcm.frames/r.sampleRate||c?.frames!==Math.ceil(pcm.frames/r.hop)||c.periodicFrames!==data.series?.length||c.unassignedFrames!==c.frames-c.periodicFrames)throw Error('Measured-tone source geometry needs review.');
 let previous=-1;const runs=[];
 for(const row of data.series){
  if(!Array.isArray(row)||row.length!==3||!row.every(Number.isInteger)||row[0]<=previous||row[0]>=c.frames||row[1]<650||row[1]>6000||row[2]<9000||row[2]>10000)throw Error('Invalid measured-tone source frame.');
  if(row[0]!==previous+1||!runs.length)runs.push({startFrame:row[0],endFrame:row[0]+1,rows:[]});
  const run=runs.at(-1);run.endFrame=row[0]+1;run.rows.push(row);previous=row[0];
 }
 const assignedSamples=runs.reduce((n,run)=>n+Math.min(pcm.frames,run.endFrame*r.hop)-run.startFrame*r.hop,0);
 return {runs,frames:pcm.frames,sampleRate:r.sampleRate,assignedSamples,unassignedSamples:pcm.frames-assignedSamples,semitones};
}
export function renderSourceContour(data,semitones=0,{onProgress=()=>{}}={}){
 const geometry=contourGeometry(data,semitones),r=CONTOUR_RENDERING,bytes=geometry.frames*2;
 const buffer=new ArrayBuffer(44+bytes),view=new DataView(buffer),text=(offset,value)=>{for(let i=0;i<value.length;i++)view.setUint8(offset+i,value.charCodeAt(i));};
 text(0,'RIFF');view.setUint32(4,36+bytes,true);text(8,'WAVE');text(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,r.sampleRate,true);view.setUint32(28,r.sampleRate*2,true);view.setUint16(32,2,true);view.setUint16(34,16,true);text(36,'data');view.setUint32(40,bytes,true);
 const ratio=2**(semitones/12);let rendered=0;
 onProgress(0);
 for(const run of geometry.runs){
  const first=run.startFrame*r.hop,last=Math.min(geometry.frames,run.endFrame*r.hop),fade=Math.min(r.edgeFadeSamples,(last-first-1)/2);let phase=0;
  for(const row of run.rows){
   const start=row[0]*r.hop,end=Math.min(geometry.frames,start+r.hop),increment=2*Math.PI*row[1]*.1*ratio/r.sampleRate;
   for(let frame=start;frame<end;frame++){
    const envelope=fade>0?Math.min(1,(frame-first)/fade,(last-1-frame)/fade):1;
    view.setInt16(44+frame*2,Math.round(Math.sin(phase)*r.amplitude*envelope*32767),true);
    phase=(phase+increment)%(2*Math.PI);
   }
  }
  rendered+=last-first;onProgress(geometry.assignedSamples?rendered/geometry.assignedSamples:1);
 }
 onProgress(1);
 return {buffer,metadata:{schema:'tropetrain-measured-tone-render-v1',revision:r.revision,recordingId:data.id,sampleRate:r.sampleRate,frames:geometry.frames,durationSeconds:geometry.frames/r.sampleRate,semitones,amplitude:r.amplitude,edgeFadeSamples:r.edgeFadeSamples,assignedMeasurementFrames:data.counts.periodicFrames,unassignedMeasurementFrames:data.counts.unassignedFrames,assignedSamples:geometry.assignedSamples,mutedSamples:geometry.unassignedSamples,runs:geometry.runs.length,frequencyMapping:'Each measured frequency is held for its original 10ms cell; final cell clipped to source PCM duration. No smoothing, quantization, octave correction or gap filling.',gapMeaning:'Unassigned measurement cells are muted in this tone approximation; they do not establish silence, unvoiced speech or musical rests in the recording.',wordTiming:'Unchanged original source boundaries; no new syllable or phoneme times.',phonemes:null,musicalNotes:null,traditionalGrammar:null,acousticReview:null,musicalReview:null,dataLicense:'CC-BY-SA-3.0'}};
}
