// Original annotation software CC0. Source text/underlay CC BY-SA 4.0;
// unchanged PocketTorah audio/timing retain their own attribution and terms.
import {PRONUNCIATION_STYLES} from './pronunciation.js';
import {sourceTimedPracticePlan} from './measured-practice.js';
import {pitchManifest} from './source-pitch.js';
const measurements=new Map(pitchManifest.records.map(r=>[r.id,r]));
const editable=['start','end','startBasis','endBasis'];
const canonical=value=>JSON.stringify((function sort(x){return Array.isArray(x)?x.map(sort):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,sort(x[k])])):x;})(value));
const fixedUnit=unit=>Object.fromEntries(Object.entries(unit).filter(([key])=>!editable.includes(key)));

export function sourceSyllableChoices(study,word,style){
 if(!PRONUNCIATION_STYLES.some(s=>s.id===style))throw Error('Choose a supported source text style.');
 const id=word.sourceWordId??word.id,index=study?.readerIds.indexOf(id);
 if(!study?.hebrewUnderlay||index<0||study.readerHebrew[index]!==word.sourceHebrew||study.selectedStyle!==style)throw Error('Exact marked Hebrew and source underlay are required.');
 const choices=[];
 for(const row of study.rows)for(const cell of row.styles[style]){
  const units=cell.units.filter(u=>u.readerWordId===id);
  if(!units.length)continue;
  if(units.length>128||new Set(units.map(u=>u.id)).size!==units.length)throw Error('Source syllable identity needs review.');
  choices.push({id:`r${row.number}-c${cell.column}`,row:row.number,column:cell.column,
   label:`Source row ${row.number}, column ${cell.column} · ${units.map(u=>u.text).join(' · ')}`,
   units:units.map(u=>({sourceUnitId:u.id,ownerWordId:u.readerWordId,sourceText:u.text,sourceStress:u.sourceStress,
    sourceMarks:structuredClone(u.sourceMarks),hebrewClusterRanges:structuredClone(u.hebrewClusterRanges),
    hebrewUnderlay:structuredClone(u.hebrewUnderlay)}))});
 }
 return choices;
}
export function createSyllableTimingDraft({library,word,study,style,choiceId}){
 if(!library)throw Error('The recorded source catalog is still loading.');
 const choice=sourceSyllableChoices(study,word,style).find(c=>c.id===choiceId);
 if(!choice)throw Error('No individually owned source syllables in this variant; shared words stay unsplit.');
 const plan=sourceTimedPracticePlan(library,[word],0,0),row=plan.rows[0],record=plan.records[0],measured=measurements.get(record.id);
 return {schema:'tropetrain-syllable-timing-draft-v1',revision:1,status:'personal-unreviewed',
  source:{recordingId:record.id,audioSha1:record.audio.sha1,audioBytes:record.audio.bytes,measuredPcmSha256:measured.pcmSha256,
   measuredDurationSeconds:measured.durationSeconds,measurementPacketSha256:measured.sha256},
  word:{id:word.sourceWordId??word.id,occurrenceId:word.id,hebrew:word.sourceHebrew,recordingHebrew:row.sourceHebrew,
   sourceComparison:row.comparison,startSeconds:row.startSeconds,endSeconds:row.endSeconds??measured.durationSeconds},
  pronunciation:{sourceCommit:study.sourceCommit,style,row:choice.row,column:choice.column,choiceId:choice.id,
   sourceUnitMeaning:'Documented transcription units; not a claim about the recorded reader’s pronunciation.'},
  sourceEditionCompared:false,phonemes:null,musicalNotes:null,independentReview:null,
  units:choice.units.map(u=>({...u,start:null,end:null,startBasis:null,endBasis:null}))};
}
export function syllableTimingKey(draft){
 return 'tropetrain-syllable-timing-v1:'+JSON.stringify([draft.source.audioSha1,draft.word.id,draft.word.occurrenceId,draft.pronunciation.style,draft.pronunciation.choiceId]);
}
export function validateSyllableTimingDraft(value,expected){
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('A syllable timing draft object is required.');
 if(value.schema!=='tropetrain-syllable-timing-draft-v1'||value.revision!==1||value.status!=='personal-unreviewed'||value.sourceEditionCompared!==false||['phonemes','musicalNotes','independentReview'].some(k=>value[k]!==null))throw Error('Only personal unreviewed syllable drafts are supported.');
 const fixed=x=>({...x,units:undefined});
 if(canonical(fixed(value))!==canonical(fixed(expected)))throw Error('Draft source, marked Hebrew, occurrence, style, variant or review status differs.');
 if(!Array.isArray(value.units)||value.units.length!==expected.units.length)throw Error('Draft source syllable count differs.');
 const clean=structuredClone(expected);let boundary=expected.word.startSeconds;
 for(const [index,unit] of value.units.entries()){
  if(!unit||canonical(fixedUnit(unit))!==canonical(fixedUnit(expected.units[index])))throw Error('Draft source syllables, written ranges, stress or shared consonants differ.');
  for(const key of ['start','end']){
   const time=unit[key],basis=unit[key+'Basis'];
   if(time===null){if(basis!==null)throw Error('A blank boundary must have no capture basis.');}
   else {
    if(!Number.isFinite(time)||time<expected.word.startSeconds||time>expected.word.endSeconds)throw Error('Syllable boundaries must be source seconds inside this unchanged word window.');
    if(!['typed','audio-clock','muted-clock'].includes(basis))throw Error('Each boundary must retain its annotation basis.');
    if(time<boundary)throw Error('Syllable boundaries must follow source order without overlaps, including across blank units.');
    boundary=time;
   }
   clean.units[index][key]=time;clean.units[index][key+'Basis']=basis;
  }
  if(unit.start!==null&&unit.end!==null&&unit.start>=unit.end)throw Error('A syllable end must follow its start.');
 }
 return clean;
}
export function setSyllableBoundary(draft,index,key,value,basis='typed'){
 if(!Number.isInteger(index)||index<0||index>=draft.units.length||!['start','end'].includes(key))throw Error('Choose a source syllable boundary.');
 const next=structuredClone(draft);next.units[index][key]=value;next.units[index][key+'Basis']=value===null?null:basis;
 return validateSyllableTimingDraft(next,draft);
}
export function captureSyllableBoundary(draft,index,key,position){
 if(!position||position.recordingId!==draft.source.recordingId||!['audio','muted'].includes(position.mode))throw Error('Play the unchanged source recording before capturing its playhead. Instrumental tones and processed recordings cannot supply this boundary.');
 // Retain the clock value; do not round it across a source word boundary.
 return setSyllableBoundary(draft,index,key,position.seconds,position.mode==='muted'?'muted-clock':'audio-clock');
}
export function parseSyllableTimingDraft(text,expected){
 if(typeof text!=='string'||text.length>1_000_000)throw Error('Draft JSON must be smaller than 1 MB.');
 return validateSyllableTimingDraft(JSON.parse(text),expected);
}
export function draftSyllableSpan(draft,index){
 const unit=draft.units[index];
 if(!unit||unit.start===null||unit.end===null)throw Error('Enter both source boundaries before auditioning a draft syllable.');
 return {start:unit.start,end:unit.end};
}
