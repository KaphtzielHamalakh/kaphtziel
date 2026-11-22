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
  const tail=plan.at(-1).endingRestSeconds??0;
  if(!Number.isFinite(tail)||tail<0||plan.slice(0,-1).some(e=>e.endingRestSeconds!==undefined))throw Error('The final rest has invalid timing or placement.');
  return previousEnd+tail;
}
// Printed tied components remain separate for notation/highlighting, but share
// one sounding envelope. Reject broken ties instead of adding a new attack.
export function soundingNotes(plan){
  const result=[];
  for(let i=0;i<plan.length;i++){
    const first=plan[i];if(first.tieStop&&!first.tieStart)throw Error('A tied continuation is missing its starting note.');
    let last=first,beats=first.beats,end=first.startSeconds+first.durationSeconds;
    const ids=[first.id];
    while(last.tieStart){
      const next=plan[i+1];
      if(!last.tieId||!next?.tieStop||next.tieId!==last.tieId||next.midi!==first.midi||next.syllableId!==first.syllableId||next.wordId!==first.wordId||Math.abs(next.startSeconds-end)>1e-7)
        throw Error('A printed tie has mismatched pitch, syllable or timing.');
      i++;last=next;beats+=next.beats;end=next.startSeconds+next.durationSeconds;ids.push(next.id);
    }
    result.push(ids.length===1?first:{...first,beats,durationSeconds:end-first.startSeconds,notationEventIds:ids});
  }
  return result;
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
