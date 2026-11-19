// Live playback and offline WAV rendering use this same instrument and envelope.
export const instrument=Object.freeze({id:'triangle-soft',revision:2,name:'Soft triangle instrument',mode:'instrumental',tuning:'12-TET, A4 = 440 Hz',provenance:'New synthesis for this reconstruction; no historical voice attribution.'});
export function validatePlan(plan){
  if(!Array.isArray(plan)||!plan.length)throw Error('There are no notes in this span.');
  let previousEnd=0;
  for(const e of plan){
    if(!Number.isFinite(e.midi)||e.midi<0||e.midi>127||!Number.isFinite(e.startSeconds)||!Number.isFinite(e.durationSeconds)||e.startSeconds<0||e.durationSeconds<=0||e.startSeconds<previousEnd-1e-7)
      throw Error('The note sequence has invalid timing or pitch.');
    previousEnd=e.startSeconds+e.durationSeconds;
  }
  return previousEnd;
}
export function scheduleInstrument(context,destination,event,at){
  const oscillator=context.createOscillator(),gain=context.createGain();
  const end=at+event.durationSeconds,attack=Math.min(.012,event.durationSeconds/4),release=Math.min(.025,event.durationSeconds/3);
  oscillator.type='triangle';oscillator.frequency.value=440*2**((event.midi-69)/12);
  gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(.16,at+attack);
  gain.gain.linearRampToValueAtTime(.12,end-release);gain.gain.linearRampToValueAtTime(0,end);
  oscillator.connect(gain);gain.connect(destination);oscillator.start(at);oscillator.stop(end);
  oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};
  return {oscillator,gain,end};
}
