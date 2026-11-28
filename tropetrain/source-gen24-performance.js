// Original optional timing, CC0-1.0. Source small-note role/duration stay null.
import {GEN24_RECORD as record} from './idelsohn-gen24-data.js';
export const GEN24_SMALL_NOTE_STUDY=Object.freeze({id:'original-idelsohn-gen24-small-eighth-80ms-v1',secondsPerNote:.08,status:'original-instrumental-demonstration',sourceDuration:null,sourceRole:null,stealTimePrevious:null,stealTimeFollowing:null,review:null,basis:'Add80ms between unchanged measured notes for the single printed small A4 eighth. This original timing is not historical performance or a pronunciation/syllable fit.'});
function source(event){
 const c=record.components.find(c=>c.id===event.sourceNoteId),word=record.words.find(w=>w.id===c?.candidateWordId),link=event.sourceWordCorrespondence;
 if(event.sourceProfile!==record.id||!c?.smallNote||event.sourceWordId!==c.candidateWordId||typeof event.wordId!=='string'||!event.wordId||event.syllableId!==null||event.syllable!==null||event.phonemes!==null||event.sourceQuarterBeats!==null||event.sourcePrintedSyllableIndex!==c.sourcePrintedGroupIndex||event.sourcePrintedLyric!==c.sourcePrintedLyric||JSON.stringify(event.sourceGen24SmallNote)!==JSON.stringify(c.smallNote)||JSON.stringify(event.sourceRhythm)!==JSON.stringify(c.rhythm)||JSON.stringify(event.sourcePitch)!==JSON.stringify(c.sourcePitch)||!Number.isInteger(event.sourceTranspose)||Math.abs(event.sourceTranspose)>36||event.midi!==c.midi+event.sourceTranspose||link?.status!=='lexical-source-word-candidate'||link.sourceWordId!==c.candidateWordId||link.sourceHebrew!==word.sourceHebrew||link.independentReview!==null||link.acceptedSyllableMapping!==null||link.acceptedPhonemes!==null)throw Error('Genesis24 small note needs its exact printed pitch/word/group and null source-role, syllable, phoneme and review fields.');
 return c;
}
export function gen24SmallNoteTiming(event,{tempo,gen24SmallNoteDemo=false}={}){
 if(!event.sourceGen24SmallNote)return null;source(event);
 if(gen24SmallNoteDemo!==true)throw Error('This Genesis24:49 span includes a printed small eighth with unassigned source duration. Choose the optional original80ms instrumental timing; historical role and syllable/phoneme fitting remain unassigned.');
 if(!Number.isFinite(tempo)||tempo<=0)throw Error('Invalid Genesis24 small-note tempo.');
 return {seconds:.08,beats:.08*tempo/60,performanceTiming:GEN24_SMALL_NOTE_STUDY};
}
export function validateGen24SmallNoteEvent(event){
 const c=source(event);if(event.durationSeconds!==.08||!Number.isFinite(event.performanceTempo)||event.performanceTempo<=0||Math.abs(event.beats-.08*event.performanceTempo/60)>1e-10||JSON.stringify(event.performanceTiming)!==JSON.stringify(GEN24_SMALL_NOTE_STUDY))throw Error('Genesis24 small-note playback requires the exact optional original80ms policy.');return c.smallNote;
}
