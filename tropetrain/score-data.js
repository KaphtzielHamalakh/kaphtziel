export const escapeXml=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&apos;');
const gcd=(a,b)=>b?gcd(b,a%b):a;
export function pitchSpelling(midi){
  if(!Number.isInteger(midi)||midi<0||midi>127)throw Error('This score exporter currently requires integer MIDI pitches.');
  const [step,alter]=[['C',0],['C',1],['D',0],['E',-1],['E',0],['F',0],['F',1],['G',0],['A',-1],['A',0],['B',-1],['B',0]][midi%12];
  const octave=Math.floor(midi/12)-1,position=octave*7+'CDEFGAB'.indexOf(step);
  return {step,alter,octave,position};
}
export function rhythmSpelling(beats){
  if(!Number.isFinite(beats)||beats<=0)throw Error('Invalid score duration.');
  for(const [type,value] of [['whole',4],['half',2],['quarter',1],['eighth',.5],['16th',.25],['32nd',.125]]){
    if(Math.abs(beats-value)<1e-8)return {type,dots:0,actual:1,normal:1};
    if(Math.abs(beats-value*1.5)<1e-8)return {type,dots:1,actual:1,normal:1};
  }
  // Preserve the original demonstration's exact timing rather than changing
  // its 0.6/0.9-beat durations to easier values for engraving.
  if(Math.abs(beats-.6)<1e-8)return {type:'quarter',dots:0,actual:5,normal:3};
  if(Math.abs(beats-.9)<1e-8)return {type:'quarter',dots:1,actual:5,normal:3};
  const normal=Math.round(beats*10000),factor=gcd(10000,normal);
  if(normal<=0)throw Error('This duration is below the score resolution.');
  return {type:'quarter',dots:0,actual:10000/factor,normal:normal/factor};
}
export function scoreData(plan,words){
  return plan.map((event,index)=>{
    const word=words[event.wordIndex];
    if(!word||word.id!==event.wordId)throw Error('Score notes no longer match their source words.');
    const previous=plan[index-1],next=plan[index+1],continuation=previous?.syllableId===event.syllableId;
    const extendsNext=next?.syllableId===event.syllableId;
    const syllableIndex=word.syllables.findIndex(s=>s.id===event.syllableId);
    if(syllableIndex<0||word.syllables[syllableIndex].sourceHebrew!==event.syllable)throw Error('Score syllables no longer match the source.');
    const syllabic=word.syllables.length===1?'single':syllableIndex===0?'begin':syllableIndex===word.syllables.length-1?'end':'middle';
    return {...event,word,pitch:pitchSpelling(event.midi),rhythm:rhythmSpelling(event.beats),continuation,extendsNext,syllabic};
  });
}
