import { passage as defaultPassage } from './passage.js';
import { alignedSyllables } from './syllables.js';
import {analyzeSourceSigns} from './accents.js';
import {PRINTED_SCORE} from './printed-score.js';
import {PRINTED_SCORE_PROFILES,isPrintedScore,printedSourceWord} from './printed-score-registry.js';
import {analyzeAccentContext} from './accent-context.js';
import {SOURCE_SYLLABLE_UNDERLAY,SOURCE_SYLLABLE_GAPS,sourceSyllableWord} from './source-syllable-underlay.js';

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

const fixtureWords=defaultPassage.verses.flatMap(v=>v.words);
const fixtures=new Map(fixtureWords.map((w,i)=>[w.id,{text:w.sourceHebrew,syllables:syllableDrafts[i]}]));
export const melody=Object.freeze({id:'original-demo-01',revision:1,name:'Original demonstration 01',status:'original, unreviewed',license:'CC0-1.0',description:'A newly composed note fixture for playback and alignment. No historical or communal attribution.'});
export const consonantal=text=>text.replace(/[\u0591-\u05bd\u05bf\u05c1\u05c2\u05c4\u05c5\u05c7\u200d\u034f]/gu,'');
export const frequency=midi=>440*2**((midi-69)/12);
export const noteName=midi=>['C','C♯','D','E♭','E','F','F♯','G','A♭','A','B♭','B'][((midi%12)+12)%12]+(Math.floor(midi/12)-1);
export const melodyProfiles=Object.freeze([melody,...PRINTED_SCORE_PROFILES]);
export function createReadingModel(passage,{melodyId=melody.id,sourceUnderlay}={}){
  const profile=melodyProfiles.find(p=>p.id===melodyId);
  if(!profile)throw Error('This musical source is not implemented.');
  const sourceUnderlayEnabled=melodyId===melody.id&&sourceUnderlay!==undefined;
  if(sourceUnderlayEnabled&&sourceUnderlay!==null&&typeof sourceUnderlay.word!=='function')throw Error('Invalid source syllable provider.');
  let group=0;
  const raw=passage.verses.flatMap((v,verseIndex)=>v.words.map((w,ordinal)=>({...w,chapter:w.chapter??v.chapter??1,
    verse:v.number,verseKey:v.id??v.reference,verseIndex,reference:v.reference,bookName:w.bookName??v.bookName??'Genesis',
    sectionId:w.sectionId??v.sectionId??'opening',ordinal:w.ordinal??ordinal+1})));
  const words=raw.map((w,index)=>{
    const fixture=fixtures.get(w.sourceWordId??w.id),printed=printedSourceWord(w,melodyId);
    const sourceSyllables=sourceUnderlayEnabled?(sourceUnderlay===null?sourceSyllableWord(w,null):sourceUnderlay.word(w)):null;
    const syllables=sourceSyllables?.status==='available'?sourceSyllables.syllables.map((s,i)=>({...s,id:`${w.id}-mams${i+1}`})):alignedSyllables(w,{fixture:printed?[printed.lengths,null,printed.stress]:fixture?.text===w.sourceHebrew?fixture.syllables:null});
    const atVerseEnd=index===raw.length-1||raw[index+1].verseKey!==w.verseKey;
    const groupEnd=atVerseEnd||(!w.sourceHebrew.endsWith('־')&&/[\u0591-\u0595]/u.test(w.sourceHebrew));
    const signAnalysis=analyzeSourceSigns(w.sourceHebrew);
    const word={...w,index,syllables,group,groupEnd,signAnalysis,accent:signAnalysis.label,
      ...(sourceSyllables?{sourceSyllableUnderlay:sourceSyllables}:{}),
      analysisStatus:sourceSyllables?.status==='unavailable'?'source-underlay-unavailable':syllables.some(s=>s.reviewStatus==='unsegmented')?'unsegmented':syllables[0].reviewStatus};
    if(groupEnd)group++;return word;
  });
  const events=Object.freeze(words.flatMap(w=>w.syllables.flatMap((s,i)=>{
    if(w.sourceSyllableUnderlay?.status==='unavailable')return [];
    if(isPrintedScore(melodyId)){
      const row=printedSourceWord(w,melodyId);if(!row)return [];
      return row.notes.filter(n=>n.syllableIndex===i).map((n,j)=>Object.freeze({id:`${s.id}-${profile.eventPrefix??(melodyId===PRINTED_SCORE.id?'cohen':'baer')}-n${j+1}`,wordId:w.id,wordIndex:w.index,
        sourceWordId:w.sourceWordId??w.id,syllableId:s.id,syllable:s.sourceHebrew,roman:null,phonemes:null,
        midi:n.midi,beats:n.quarterBeats,part:j+1,sourceLyric:n.printedLyric,sourceLocation:n.location,sourceBar:n.bar,sourceProfile:melodyId,sourceRhythm:n.rhythm,
        ...(n.pitch?{sourcePitch:n.pitch,sourceTranspose:0,sourceNoteId:n.id,sourceSystem:n.system}:{}),
        ...(n.fermata?{sourceFermata:n.fermata}:{}),
        ...(n.slurId?{sourceSlurId:`${profile.notationGroupScope==='verse'?w.verseKey:w.id}-${n.slurId}`,sourceSlurPhase:n.slurPhase}:{}),
        ...(n.tupletId?{sourceTupletId:`${profile.notationGroupScope==='verse'?w.verseKey:w.id}-${n.tupletId}`,sourceTupletPhase:n.tupletPhase}:{}),
        ...(n.restAfterBeats?{sourceRestAfterBeats:n.restAfterBeats}:{}),
        ...(n.restAfterBar!==undefined?{sourceRestAfterBar:n.restAfterBar}:{}),
        ...(n.tieId?{tieId:`${w.id}-${n.tieId}`,tieStart:n.tiePhase==='start',tieStop:n.tiePhase==='stop'}:{})}));
    }
    const seed=[62,64,65,67][w.index%4];
    const pitches=w.groupEnd&&i===w.syllables.length-1?[65,64,62]:[seed+(i%2?2:0)];
    return pitches.map((midi,j)=>Object.freeze({id:`${s.id}-n${j+1}`,wordId:w.id,wordIndex:w.index,
      sourceWordId:w.sourceWordId??w.id,syllableId:s.id,syllable:s.sourceHebrew,roman:s.roman,phonemes:s.phonemes,
      midi,beats:pitches.length>1?0.5:(s.stress?0.9:0.6),part:j+1,
      ...(sourceUnderlayEnabled?{sourceSyllableLink:Object.freeze({underlayId:SOURCE_SYLLABLE_UNDERLAY.id,revision:1,
       sourceCommit:SOURCE_SYLLABLE_UNDERLAY.sourceCommit,dataLicense:SOURCE_SYLLABLE_UNDERLAY.dataLicense,
       sourceUnitIds:Object.freeze([...s.sourceUnitIds]),writtenRange:Object.freeze({...s.writtenRange}),sourceSyllablePosition:s.sourceSyllablePosition,
       sourceTiming:null,phonemes:null,voice:null,review:null,performance:'original-demo-01'})}:{})}));
  })));
  function bounds(cursor,anchor,scope){
    if(!words[cursor]||!words[anchor])throw Error('Choose a word in this reading.');
    if(scope==='selection')return [Math.min(cursor,anchor),Math.max(cursor,anchor)];
    if(scope==='word')return [cursor,cursor];
    if(scope==='passage')return [cursor,words.length-1];
    const field=scope==='group'?'group':scope==='aliyah'?'sectionId':'verseKey';
    let end=cursor;while(end+1<words.length&&words[end+1][field]===words[cursor][field])end++;
    return [cursor,end];
  }
  function buildPlan(start,end,{tempo=84,transpose=0}={}){
    if(!Number.isInteger(start)||!Number.isInteger(end)||!words[start]||!words[end]||start>end)throw Error('Invalid playback span.');
    if(!Number.isFinite(tempo)||tempo<=0||!Number.isInteger(transpose)||Math.abs(transpose)>36)throw Error('Invalid tempo or transposition.');
    const blocked=sourceUnderlayEnabled?words.slice(start,end+1).find(w=>w.sourceSyllableUnderlay.status!=='available'):null;
    if(blocked)throw Error(`${blocked.reference} · word ${blocked.ordinal}: ${SOURCE_SYLLABLE_GAPS[blocked.sourceSyllableUnderlay.reason]} Choose a covered span or turn off source syllable underlay. No notes were substituted.`);
    if(isPrintedScore(melodyId)&&words.slice(start,end+1).some(w=>!printedSourceWord(w,melodyId)))
      throw Error(`This printed-score study covers only the unchanged words of ${profile.coverageLabel??(melodyId===PRINTED_SCORE.id?'Genesis 22:1':'Genesis 1:1–5')}. Open that passage or choose the original demonstration. No notes are substituted.`);
    let beat=0;
    const selected=events.filter(e=>e.wordIndex>=start&&e.wordIndex<=end);
    return selected.map((e,index)=>{
      const event={...e,midi:e.midi+transpose,...(e.sourcePitch?{sourceTranspose:transpose}:{}),startBeat:beat,startSeconds:beat*60/tempo,durationSeconds:e.beats*60/tempo,
        ...(profile.preserveBoundaryRests&&index===selected.length-1&&e.sourceRestAfterBeats?{endingRestSeconds:e.sourceRestAfterBeats*60/tempo}:{})};beat+=e.beats+(e.sourceRestAfterBeats??0);return event;
    });
  }
  return {passage,words,events,bounds,buildPlan,profile,context:analyzeAccentContext(words),
   ...(sourceUnderlayEnabled?{sourceSyllableUnderlay:{...SOURCE_SYLLABLE_UNDERLAY,availableWords:words.filter(w=>w.sourceSyllableUnderlay.status==='available').length,unavailableWords:words.filter(w=>w.sourceSyllableUnderlay.status!=='available').length}}:{})};
}
const initial=createReadingModel(defaultPassage);
export const words=initial.words,events=initial.events,bounds=initial.bounds,buildPlan=initial.buildPlan;
