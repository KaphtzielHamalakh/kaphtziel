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
    const policy=library.timingPolicy(recording);book.sourceTimedWords+=policy.eligibleWords;book.reviewWords+=policy.withheldWords;
    if(policy.withheldWords)gaps.push({id:recording.id,title:recording.title,words:recording.words.length,sourceTimedWords:policy.eligibleWords,reviewWords:policy.withheldWords,policy:policy.kind,firstAvailableWordId:policy.kind==='partial-original-windows'?policy.windows.keys().next().value:null,firstWithheldWordId:recording.words.find(w=>!policy.windows?.has(w.id))?.id??null,ambiguities:policy.ambiguities,coverage:recording.coverage,issues:recording.issues});
  }
  return {schema:'tropetrain-chant-coverage-v1',revision:2,words:library.byWord.size,
    sourceTimedWords:[...books.values()].reduce((n,b)=>n+b.sourceTimedWords,0),
    reviewWords:[...books.values()].reduce((n,b)=>n+b.reviewWords,0),books:[...books.values()],gaps,
    limits:'Source timing structure only; acoustic review pending. Equal-count defective takes expose only original intervals outside every closed ambiguity range; intersecting words and selections crossing them stay withheld. Source packet/status/timestamps remain unchanged. No new timestamps, musical rules, phonemes, pronunciation presets or source text replacements.'};
}
