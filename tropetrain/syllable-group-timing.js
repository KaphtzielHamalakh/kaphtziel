// Original annotation software CC0. Source text CC BY-SA4; unchanged
// PocketTorah clocks/audio keep their separately recorded attribution/terms.
import {validateJointStudy} from './source-joint-syllables.js';
import {chooseSourceStudy} from './source-reading-choices.js';
import {sourceTimedPracticePlan} from './measured-practice.js';
import {pitchManifest} from './source-pitch.js';
import {validateSyllableTimingDraft} from './syllable-timing-draft.js';
const measurements=new Map(pitchManifest.records.map(r=>[r.id,r]));
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b),canonical=w=>w.sourceWordId??w.id;

export function groupTimingChoices(study,group,words,style){
 if(!group||group.wordIds.length<2||new Set(group.wordIds).size!==group.wordIds.length||group.sourceGroupId!==study?.groupId||group.individualWordAllocation!==null||group.writtenSyllableRanges!==null||group.sourceTiming!==null||group.phonemes!==null||group.voice!==null||group.review!==null)throw Error('A complete unchanged shared source word is required.');
 const members=group.wordIndices.map(i=>words[i]);
 if(members.length!==group.wordIds.length||members.some((w,i)=>!w||w.id!==group.wordIds[i]||canonical(w)!==group.sourceWordIds[i]||w.sourceHebrew!==group.readerHebrew[i]||w.index!==group.wordIndices[i]||i&&w.index!==members[i-1].index+1||w.sectionId!==members[0].sectionId||w.verseKey!==members[0].verseKey)||!same(group.sourceWordIds,study.readerIds)||!same(group.readerHebrew,study.readerHebrew))throw Error('Shared source word members, occurrences or marked Hebrew changed.');
 const selected=validateJointStudy(chooseSourceStudy(study,group.sourceReadingChoices),group,style);
 if(selected.selectedStyle!==style)throw Error('Choose the current source text style.');
 if(group.navigationWordId!==members[0].id||group.navigationWordIndex!==members[0].index||group.source.sourceCommit!==study.sourceCommit||group.syllables.map(s=>s.sourceHebrew).join('')!==group.sourceReadingHebrew||group.syllables.some(s=>s.readerWordId!==null||s.writtenRange!==null||s.acousticTimes!==null))throw Error('Shared source syllables or navigation changed.');
 for(const path of group.paths.filter(p=>p.style===style))if(path.sourceReadingHebrew!==group.sourceReadingHebrew||!same(path.units.map(u=>[u.hebrew,u.sourceStress]),group.syllables.map(s=>[s.sourceHebrew,s.stress])))throw Error('Shared source syllable text or stress changed.');
 return group.paths.filter(p=>p.style===style).map(path=>({id:`r${path.sourceRow}-c${path.sourceColumn}`,row:path.sourceRow,column:path.sourceColumn,
  label:`Source row ${path.sourceRow}, column ${path.sourceColumn} · complete shared word · ${path.units.map(u=>u.sourceText).join(' · ')}`,
  units:path.units.map(u=>({sourceUnitId:u.sourceUnitId,ownerWordId:null,ownerWordIds:group.sourceWordIds.slice(),ownerOccurrenceIds:group.wordIds.slice(),sourceText:u.sourceText,sourceStress:u.sourceStress,
   sourceMarks:structuredClone(u.sourceMarks),sourceSegments:structuredClone(u.sourceSegments),hebrewClusterRanges:null,hebrewUnderlay:structuredClone(u.hebrewUnderlay)}))}));
}

export function createGroupTimingDraft({library,words,group,study,style,choiceId}){
 if(!library)throw Error('The recorded source catalog is still loading.');
 const choice=groupTimingChoices(study,group,words,style).find(c=>c.id===choiceId);
 if(!choice)throw Error('Choose a complete shared source-word variant.');
 const plan=sourceTimedPracticePlan(library,words,group.wordIndices[0],group.wordIndices.at(-1));
 if(plan.records.length!==1||plan.rows.length!==group.wordIds.length)throw Error('A shared source word must have one complete original recording window.');
 const record=plan.records[0],measured=measurements.get(record.id),rows=plan.rows;
 for(const [i,row]of rows.entries()){
  if(row.id!==group.sourceWordIds[i]||row.occurrenceId!==group.wordIds[i]||row.uxlcHebrew!==group.readerHebrew[i]||row.recordingId!==record.id||!Number.isFinite(row.endSeconds)||i&&(rows[i-1].endSeconds!==row.startSeconds||rows[i-1].referenceIndex+1!==row.referenceIndex))throw Error('Original shared-word windows must be consecutive and touch exactly; no gap, overlap or boundary can be inferred.');
 }
 const originalWordWindows=rows.map(row=>({id:row.id,occurrenceId:row.occurrenceId,hebrew:row.uxlcHebrew,recordingHebrew:row.sourceHebrew,sourceWords:structuredClone(row.sourceWords),sourceComparison:row.comparison,
  referenceIndex:row.referenceIndex,startSeconds:row.startSeconds,endSeconds:row.endSeconds,...(row.timingPolicy?{timingPolicy:structuredClone(row.timingPolicy)}:{})}));
 return {schema:'tropetrain-syllable-timing-draft-v2',revision:2,status:'personal-unreviewed',
  source:{recordingId:record.id,audioSha1:record.audio.sha1,audioBytes:record.audio.bytes,measuredPcmSha256:measured.pcmSha256,measuredDurationSeconds:measured.durationSeconds,measurementPacketSha256:measured.sha256,timingSource:structuredClone(record.timingSource)},
  word:null,span:{kind:'complete-shared-source-word',wordIds:group.sourceWordIds.slice(),occurrenceIds:group.wordIds.slice(),hebrew:group.readerHebrew.slice(),startSeconds:rows[0].startSeconds,endSeconds:rows.at(-1).endSeconds,originalWordWindows},
  correspondence:{sourceGroupId:group.sourceGroupId,sourceReadingHebrew:group.sourceReadingHebrew,sourceReadingChoices:structuredClone(group.sourceReadingChoices),individualWordAllocation:null,writtenSyllableRanges:null,sourceTiming:null,recordedPronunciationEquivalent:null},
  pronunciation:{sourceCommit:study.sourceCommit,style,row:choice.row,column:choice.column,choiceId:choice.id,sourceGroupId:group.sourceGroupId,
   sourceUrl:'https://github.com/bdenckla/MAM-basics/tree/'+study.sourceCommit+'/Phonetic-MAM',license:structuredClone(study.license),attribution:structuredClone(study.attribution),sourceUnitMeaning:'Complete shared source transcription word; every syllable corresponds jointly to all member words. No claim about the recorded reader’s pronunciation.'},
  recordingAttribution:Object.fromEntries(['source','creator','projectCredits','individualReader','sourceUrl','audioLicense','timingLicense','alignmentLicense','originalCommit'].map(k=>[k,structuredClone(library.source[k])])),
  sourceEditionCompared:false,phonemes:null,musicalNotes:null,independentReview:null,
  units:choice.units.map(u=>({...u,start:null,end:null,startBasis:null,endBasis:null}))};
}

// A joint audition has no word clock of its own. Keep the original member
// windows in the draft; do not relabel a personal syllable as a source word.
export function groupTimingPreview({library,words,study,style,draft,span}){
 const first=words.find(w=>w.id===draft.span?.occurrenceIds?.[0]),group=first?.sourceJointGroup;
 if(!group)throw Error('The complete shared source word is no longer selected or available.');
 const expected=createGroupTimingDraft({library,words,group,study,style,choiceId:draft.pronunciation.choiceId});
 const checked=validateSyllableTimingDraft(draft,expected),window=checked.span;
 if(!span||!Number.isFinite(span.start)||!Number.isFinite(span.end)||span.start<window.startSeconds||span.start>=span.end||span.end>window.endSeconds)throw Error('Draft interval must stay inside the unchanged complete shared-word window.');
 return {record:library.byId.get(checked.source.recordingId),segment:{recordingId:checked.source.recordingId,start:span.start,end:span.end,words:[]},originalWordWindows:structuredClone(window.originalWordWindows),individualWordAllocation:null};
}
