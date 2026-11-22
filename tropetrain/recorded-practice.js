// Source-timed recording practice; never a melody or pronunciation realization.
export function practiceAudioMode(value){return ['recorded','measured'].includes(value)?value:'instrument';}
export function chantPracticePlan(library,words,start,end){
  if(!library)throw Error('The recorded-chant catalog is loading.');
  const rows=library.selection(words,start,end),records=library.recordsFor(rows);
  return {rows,records,words:rows.length,bytes:records.reduce((n,r)=>n+r.audio.bytes,0)};
}
export function chantCoverage(library){
  const books=new Map(),gaps=[];
  for(const recording of library.recordings){
    let book=books.get(recording.bookId);
    if(!book){book={bookId:recording.bookId,words:0,sourceTimedWords:0,reviewWords:0,recordings:0};books.set(recording.bookId,book);}
    book.recordings++;book.words+=recording.words.length;
    if(recording.status==='aligned')book.sourceTimedWords+=recording.words.length;
    else{book.reviewWords+=recording.words.length;gaps.push({id:recording.id,title:recording.title,words:recording.words.length,coverage:recording.coverage,issues:recording.issues});}
  }
  return {schema:'tropetrain-chant-coverage-v1',revision:1,words:library.byWord.size,
    sourceTimedWords:[...books.values()].reduce((n,b)=>n+b.sourceTimedWords,0),
    reviewWords:[...books.values()].reduce((n,b)=>n+b.reviewWords,0),books:[...books.values()],gaps,
    limits:'Source timing structure only; acoustic review pending. No new timestamps, musical rules, phonemes, pronunciation presets or source text replacements.'};
}
