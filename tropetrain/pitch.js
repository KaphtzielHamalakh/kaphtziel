// Original equal-quarter-tone notation helpers, CC0-1.0. This encoding does
// not establish the intonation of a historical performance.
export function pitchSpelling(midi){
  if(!Number.isFinite(midi)||!Number.isInteger(midi*2)||midi<0||midi>127)throw Error('This score exporter requires integer MIDI pitches or exact half-semitone values.');
  let base=Math.floor(midi);
  const spell=n=>{const [step,alter]=[['C',0],['C',1],['D',0],['E',-1],['E',0],['F',0],['F',1],['G',0],['A',-1],['A',0],['B',-1],['B',0]][n%12];return {step,alter,octave:Math.floor(n/12)-1};};
  let p=spell(base);
  // Avoid requiring a three-quarter sharp: choose the neighboring natural.
  if(midi!==base&&p.alter===1){base++;p=spell(base);}
  p.alter+=midi-base;
  return {...p,position:p.octave*7+'CDEFGAB'.indexOf(p.step)};
}
export function spelledPitchName(p){
  if(p.alter===.5||p.alter===-.5)return p.step+p.octave+(p.alter>0?' +50¢':' −50¢');
  return p.step+(p.alter===1?'♯':p.alter===-1?'♭':'')+p.octave;
}
export const accidentalName=alter=>alter===.5?'quarter-sharp':alter===-.5?'quarter-flat':alter===1?'sharp':alter===-1?'flat':'natural';
export const accidentalGlyph=alter=>alter===.5?'\ue282':alter===-.5?'\ue280':alter===1?'\ue262':alter===-1?'\ue260':'\ue261';
