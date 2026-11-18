import { passage } from './passage.js';

// Hand-entered working syllabification. These are editing fixtures, not a
// pronunciation grammar. Each boundary is a Unicode base-letter boundary.
const syllableDrafts = [
  [[1,2,3],['bə','rē','shīt'],2], [[1,2],['bā','rā'],1], [[1,1,3],['e','lo','hīm'],2],
  [[2],['ēt'],0], [[1,1,1,2],['ha','shā','ma','yim'],2], [[1,2],['və','ēt'],1], [[1,1,2],['hā','ā','rets'],1],
  [[1,1,1,2],['və','hā','ā','rets'],2], [[1,1,2],['hā','yə','tāh'],2], [[1,2],['to','hu'],0],
  [[1,1,2],['vā','vo','hu'],1], [[1,1,2],['və','cho','shekh'],1], [[2],['al'],0],
  [[1,2],['pə','nē'],1], [[1,3],['tə','hom'],1], [[1,2,1],['və','ru','ach'],1],
  [[1,1,3],['e','lo','hīm'],2], [[1,1,1,2],['mə','ra','che','fet'],2], [[2],['al'],0],
  [[1,2],['pə','nē'],1], [[1,1,2],['ha','ma','yim'],1],
  [[1,2,2],['vai','yo','mer'],1], [[1,1,3],['e','lo','hīm'],2], [[1,2],['yə','hi'],1],
  [[3],['or'],0], [[1,1,2],['vai','yə','hi'],2], [[3],['or'],0],
];
const groupEnds = [2, 6, 10, 14, 16, 20, 24, 26];
export const melody = Object.freeze({ id:'original-demo-01', revision:1,
  name:'Original demonstration 01', status:'original, unreviewed', license:'CC0-1.0',
  description:'A newly composed note fixture for testing playback and alignment. No historical or communal attribution.' });
const accentNames = { '\u0591':'Etnaḥta', '\u0594':'Zakef katon', '\u0597':'Revia',
  '\u0599':'Pashta', '\u05a3':'Munaḥ', '\u05a5':'Merkha', '\u0596':'Tipḥa' };
export const words = passage.verses.flatMap(v => v.words.map(w => ({...w, verse:v.number, reference:v.reference}))).map((w,index)=>{
  const [lengths,roman,stress] = syllableDrafts[index];
  const clusters = [...w.sourceHebrew.matchAll(/[\u05d0-\u05ea][^\u05d0-\u05ea]*/gu)].map(m=>m[0]);
  let offset=0;
  const syllables=lengths.map((n,i)=>{
    const text=clusters.slice(offset,offset+n).join(''); offset+=n;
    return {id:`${w.id}-s${i+1}`,sourceHebrew:text, roman:roman[i],stress:i===stress,phonemes:null,reviewStatus:'draft'};
  });
  if(offset!==clusters.length || syllables.map(s=>s.sourceHebrew).join('')!==w.sourceHebrew) throw Error(`Alignment mismatch: ${w.id}`);
  return {...w,index,syllables,group:groupEnds.findIndex(e=>e>=index),groupEnd:groupEnds.includes(index),
    accent:w.sourceHebrew.endsWith('׃')?'Silluq / sof pasuq':Object.entries(accentNames).find(([c])=>w.sourceHebrew.includes(c))?.[1]||'Joined by maqaf'};
});
export const consonantal = text => text.replace(/[\u0591-\u05bd\u05bf\u05c1\u05c2\u05c4\u05c5\u05c7\u200d\u034f]/gu,'');
export function bounds(cursor,anchor,scope) {
  if(scope==='selection') return [Math.min(cursor,anchor),Math.max(cursor,anchor)];
  if(scope==='word') return [cursor,cursor];
  if(scope==='passage') return [cursor,words.length-1];
  const field=scope==='group'?'group':'verse';
  let end=cursor;
  while(end+1<words.length && words[end+1][field]===words[cursor][field]) end++;
  return [cursor,end];
}
// A single canonical sequence powers sound, highlighting and the note table.
// Half-step shifts never modify text, syllables, beat positions or durations.
export const events = Object.freeze(words.flatMap(w => w.syllables.flatMap((s,i)=>{
  const seed=[62,64,65,67][w.index%4];
  const pitches=w.groupEnd && i===w.syllables.length-1?[65,64,62]:[seed+(i%2?2:0)];
  return pitches.map((midi,j)=>Object.freeze({id:`${s.id}-n${j+1}`,wordId:w.id,wordIndex:w.index,
    syllableId:s.id,syllable:s.sourceHebrew,roman:s.roman,phonemes:s.phonemes,
    midi,beats:pitches.length>1?0.5:(s.stress?0.9:0.6),part:j+1}));
})));
export function buildPlan(start,end,{tempo=84,transpose=0}={}) {
  let beat=0;
  return events.filter(e=>e.wordIndex>=start && e.wordIndex<=end).map(e=>{
    const event={...e,midi:e.midi+transpose,startBeat:beat,startSeconds:beat*60/tempo,durationSeconds:e.beats*60/tempo};
    beat+=e.beats;
    return event;
  });
}
export const frequency = midi=>440*2**((midi-69)/12);
export const noteName = midi=>['C','C♯','D','E♭','E','F','F♯','G','A♭','A','B♭','B'][((midi%12)+12)%12]+(Math.floor(midi/12)-1);
