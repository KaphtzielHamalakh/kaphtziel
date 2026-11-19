// Reference adaptation: CC BY-SA 3.0; assets/references/NOTICE.txt.
import {loadReferenceData} from './reference-library-data.js';
export class ReferenceLibrary {
  constructor(data){
    if(data?.format!=='tropetrain-reference-library-packed-v1')throw Error('Unsupported reference library.');
    this.source={...data,recordings:undefined};this.parts=data.parts;this.recordings=[];this.byId=new Map();this.byWord=new Map();
    for(const packed of data.recordings){
      const recording={...packed,words:packed.words.map((row,index)=>{
        const [id,uxlcHebrew,source,startSeconds,endSeconds,readerOrdinal]=row;
        const sourceWords=source.map(([token,chapter,verse,ordinal,notes=[],writtenVariants=[]])=>({id:`wlc-2012-${packed.bookId}-${chapter}-${verse}-${ordinal}`,chapter,verse,ordinal,sourceToken:token,sourceHebrew:token.replaceAll('/',''),editorialNotes:notes.map(code=>({kind:'sourceEditorialCode',code})),writtenVariants}));
        const first=sourceWords[0],sourceHebrew=sourceWords.map(p=>p.sourceHebrew).join(' '),[,readerChapter,readerVerse]=id.split('-');
        const comparison=sourceWords.length>1?'source-boundaries':sourceHebrew===uxlcHebrew?'exact':sourceHebrew.replaceAll('\u034f','')===uxlcHebrew.replaceAll('\u034f','')?'joiner-only':'source-difference';
        return {id,recordingId:packed.id,referenceIndex:index,uxlcHebrew,sourceWords,sourceHebrew,sourceToken:sourceWords.length===1?first.sourceToken:null,comparison,startSeconds,endSeconds,chapter:first.chapter,verse:first.verse,ordinal:first.ordinal,readerChapter:Number(readerChapter),readerVerse:Number(readerVerse),readerOrdinal};
      })};
      this.recordings.push(recording);this.byId.set(recording.id,recording);
      for(const word of recording.words){if(this.byWord.has(word.id))throw Error('Reference coverage overlaps.');this.byWord.set(word.id,{recording,word});}
    }
  }
  at(word){return this.byWord.get(word.sourceWordId??word.id);}
  selection(words,start,end){
    if(!Number.isInteger(start)||!Number.isInteger(end)||start<0||end<start||end>=words.length)throw Error('Choose a valid reference span.');
    return words.slice(start,end+1).map(word=>{
      const entry=this.at(word);if(!entry)throw Error('No recorded reference is mapped to this source word.');
      if(entry.word.uxlcHebrew!==word.sourceHebrew)throw Error('The reader source changed; reference alignment needs review.');
      if(entry.recording.status!=='aligned')throw Error(`${entry.recording.title} has unreliable source timings. Use its complete recording; word playback needs review.`);
      return {...entry.word,occurrenceId:word.id,wordIndex:word.index};
    });
  }
  recordsFor(rows){return [...new Set(rows.map(w=>w.recordingId))].map(id=>this.byId.get(id));}
}
let promise;
export function getReferenceLibrary(){return promise??=loadReferenceData().then(data=>new ReferenceLibrary(data));}
