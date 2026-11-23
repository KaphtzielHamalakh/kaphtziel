import {isJointEvent,jointEventCorrespondence} from './event-correspondence.js';
import {validateGraceEvent} from './source-grace.js';
import {validateSmallNoteEvent} from './source-small-note.js';
export const escapeXml=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&apos;');
const gcd=(a,b)=>b?gcd(b,a%b):a;
export function beatLabel(beats){
  for(const [n,d] of [[1,3],[1,6],[2,3],[5,6]])if(Math.abs(beats-n/d)<1e-8)return `${n}/${d}`;
  return String(Number(beats.toFixed(6)));
}
export function pitchSpelling(midi){
  if(!Number.isInteger(midi)||midi<0||midi>127)throw Error('This score exporter currently requires integer MIDI pitches.');
  const [step,alter]=[['C',0],['C',1],['D',0],['E',-1],['E',0],['F',0],['F',1],['G',0],['A',-1],['A',0],['B',-1],['B',0]][midi%12];
  const octave=Math.floor(midi/12)-1,position=octave*7+'CDEFGAB'.indexOf(step);
  return {step,alter,octave,position};
}
// Preserve a checked printed accidental spelling at the original source key.
export function eventPitchSpelling(event){
 const p=event.sourcePitch;
 if(!p||event.sourceTranspose!==0)return pitchSpelling(event.midi);
 if(!'CDEFGAB'.includes(p.step)||p.step.length!==1||![-1,0,1].includes(p.alter)||!Number.isInteger(p.octave))throw Error('Invalid printed pitch spelling.');
 const expected=(p.octave+1)*12+{C:0,D:2,E:4,F:5,G:7,A:9,B:11}[p.step]+p.alter;
 if(expected!==event.midi)throw Error('Printed pitch spelling and sounding MIDI disagree.');
 return {...p,position:p.octave*7+'CDEFGAB'.indexOf(p.step)};
}
export function eventPitchName(event){const p=eventPitchSpelling(event);return p.step+(p.alter===1?'♯':p.alter===-1?'♭':'')+p.octave;}
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
  if(Math.abs(beats-1/3)<1e-8)return {type:'eighth',dots:0,actual:3,normal:2};
  if(Math.abs(beats-1/6)<1e-8)return {type:'16th',dots:0,actual:3,normal:2};
  const normal=Math.round(beats*10000),factor=gcd(10000,normal);
  if(normal<=0)throw Error('This duration is below the score resolution.');
  return {type:'quarter',dots:0,actual:10000/factor,normal:normal/factor};
}
export function eventRhythm(event){
  const r=event.sourceRhythm;
  if(event.sourceSmallNote){validateSmallNoteEvent(event);return r;}
  if(event.sourceGrace){validateGraceEvent(event);return r;}
  if(!r)return rhythmSpelling(event.beats);
  const value={whole:4,half:2,quarter:1,eighth:.5,'16th':.25,'32nd':.125}[r.type];
  if(!value||![0,1].includes(r.dots)||!Number.isInteger(r.actual)||r.actual<1||!Number.isInteger(r.normal)||r.normal<1||Math.abs(value*(r.dots?1.5:1)*r.normal/r.actual-event.beats)>1e-8)
    throw Error('Printed rhythm and sounding duration disagree.');
  return r;
}
export function scoreData(plan,words){
  return plan.map((event,index)=>{
    const joint=isJointEvent(event)?jointEventCorrespondence(event,words):null,word=joint?.word??words[event.wordIndex];
    if(!word||!joint&&word.id!==event.wordId)throw Error('Score notes no longer match their source words.');
    const previous=plan[index-1],next=plan[index+1],continuation=previous?.syllableId===event.syllableId;
    const extendsNext=next?.syllableId===event.syllableId;
    const syllables=joint?.group.syllables??word.syllables,syllableIndex=syllables.findIndex(s=>s.id===event.syllableId);
    if(syllableIndex<0||syllables[syllableIndex].sourceHebrew!==event.syllable)throw Error('Score syllables no longer match the source.');
    const syllabic=syllables.length===1?'single':syllableIndex===0?'begin':syllableIndex===syllables.length-1?'end':'middle';
    const gapAfterBeats=next?next.startBeat-event.startBeat-event.beats:(event.endingRestSeconds??0)*event.beats/event.durationSeconds;
    return {...event,word,...(joint?{correspondenceWords:joint.members,sourceJointGroup:joint.group}:{}),pitch:eventPitchSpelling(event),rhythm:eventRhythm(event),gapAfterBeats:gapAfterBeats>1e-8?gapAfterBeats:0,continuation,extendsNext,syllabic};
  });
}
// Printed pattern tables may label an accent without specifying a syllable
// allocation. Keep that absence explicit; never manufacture Bible-word IDs,
// lyric strings, melismas or pronunciation from an accent-name heading.
export function untextedScoreData(plan){
  return plan.map((event,index)=>{
    if(event.wordId!==null||event.sourceWordId!==null||event.syllableId!==null||event.syllable!==null||event.phonemes!==null)
      throw Error('An untexted source pattern must not claim word, syllable or phoneme alignment.');
    const next=plan[index+1],gap=next?next.startBeat-event.startBeat-event.beats:event.endingRestBeats??0;
    return {...event,syllable:'',untexted:true,pitch:eventPitchSpelling(event),rhythm:eventRhythm(event),gapAfterBeats:gap>1e-8?gap:0};
  });
}
