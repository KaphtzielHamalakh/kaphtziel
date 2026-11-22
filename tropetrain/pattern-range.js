// Original advisory comparison; never changes source notes, key or timing.
import {noteName} from './music.js';
export function printedPatternRange(plan,low,high){
 if(!Number.isInteger(low)||!Number.isInteger(high)||low>high)return {status:'invalid-guide',text:'Choose a lower guide note at or below the upper guide note.'};
 const pitches=plan.filter(e=>Number.isFinite(e.midi)).map(e=>e.midi);
 if(!pitches.length)return {status:'no-pattern',text:'Choose a transcribed printed figure to compare its pitches with your range guide.'};
 const min=Math.min(...pitches),max=Math.max(...pitches),below=pitches.filter(p=>p<low).length,above=pitches.filter(p=>p>high).length;
 return {status:below||above?'outside-guide':'within-guide',min,max,below,above,attacks:pitches.length,
  text:`Printed pitch range ${noteName(min)}–${noteName(max)} · your guide ${noteName(low)}–${noteName(high)}. `+(below||above?`${below} pitched components below and ${above} above your guide. Change transposition if needed.`:'All pitched components fit your guide.')+' The guide does not change the notes.'};
}
