import numbering from './data/calendar/torah-verse-numbering.json' with {type:'json'};

const compare=(a,b)=>a.chapter-b.chapter||a.verse-b.verse;
const same=(a,b)=>a.chapter===b.chapter&&a.verse===b.verse;
export const TORAH_NUMBERING=Object.freeze({id:numbering.id,revision:numbering.revision,license:numbering.license,licenseUrl:numbering.licenseUrl});
const tableFor=(book,chapter)=>{
  const table=numbering.chapters.find(table=>table.bookId===book.id&&table.chapter===chapter);
  if(table&&(table.sourceSha256!==book.sourceSha256||table.targetVerseRecords!==book.chapters[chapter-1]?.verses.length))throw Error('This Torah numbering map needs review for the current Hebrew edition.');
  return table;
};
const sourceLength=(book,chapter)=>tableFor(book,chapter)?.sourceVerseCount??book.chapters[chapter-1]?.verses.length;
const point=value=>{
  if(typeof value!=='string'||!/^[1-9]\d{0,2}:[1-9]\d{0,2}$/.test(value))throw Error('Partial-verse divisions cannot yet be opened without an exact source word boundary.');
  const [chapter,verse]=value.split(':').map(Number);return {chapter,verse};
};
export const rangeNeedsNumbering=range=>numbering.chapters.some(table=>table.bookId===range.bookId&&table.chapter>=range.start.chapter&&table.chapter<=range.end.chapter);

export function resolveTorahCalendarUnit(unit,book){
  if(!book||!['gen','exo','lev','num','deu'].includes(book.id)||!unit||unit.k!==book.name)throw Error('This division needs a book outside the current Torah library.');
  const sourceStart=point(unit.b),sourceEnd=point(unit.e);
  if(compare(sourceStart,sourceEnd)>0||!sourceLength(book,sourceStart.chapter)||!sourceLength(book,sourceEnd.chapter)||
    sourceStart.verse>sourceLength(book,sourceStart.chapter)||sourceEnd.verse>sourceLength(book,sourceEnd.chapter))throw Error('The source Torah reference is outside its available numbering scheme.');
  const mapped=(value,end)=>{
    const table=tableFor(book,value.chapter),row=table?.mappings[value.verse-1];
    if(table&&(!row||row.sourceVerse!==value.verse||!Number.isInteger(row.targetStart)||!Number.isInteger(row.targetEnd)||row.targetEnd<row.targetStart))throw Error('The Torah reference-numbering map is incomplete or invalid.');
    return {chapter:value.chapter,verse:row?(end?row.targetEnd:row.targetStart):value.verse};
  };
  const start=mapped(sourceStart,false),end=mapped(sourceEnd,true);let sourceCount=0,targetCount=0;
  for(let chapter=sourceStart.chapter;chapter<=sourceEnd.chapter;chapter++)sourceCount+=(chapter===sourceEnd.chapter?sourceEnd.verse:sourceLength(book,chapter))-(chapter===sourceStart.chapter?sourceStart.verse:1)+1;
  for(let chapter=start.chapter;chapter<=end.chapter;chapter++)targetCount+=(chapter===end.chapter?end.verse:book.chapters[chapter-1].verses.length)-(chapter===start.chapter?start.verse:1)+1;
  if(!Number.isInteger(unit.v)||unit.v!==sourceCount)throw Error(`${unit.k} ${unit.b}–${unit.e}: source verse count differs from the checked numbering scheme. Review the source before opening.`);
  let mapping;
  if(rangeNeedsNumbering({bookId:book.id,start,end})){
    const raw=JSON.stringify(unit);if(raw.length>8000)throw Error('Torah source unit is too large.');
    mapping={id:numbering.id,revision:numbering.revision,sourceUnit:JSON.parse(raw),sourceVerseCount:sourceCount,uxlcVerseRecords:targetCount};
  }
  return {start,end,sourceVerseCount:sourceCount,uxlcVerseRecords:targetCount,mapping};
}
export function preserveNumberingMapping(input,range,corpus){
  if(!input||input.id!==numbering.id||input.revision!==numbering.revision||!input.sourceUnit)throw Error('Unsupported Torah reference-numbering mapping.');
  const resolved=resolveTorahCalendarUnit(input.sourceUnit,corpus.byId.get(range.bookId));
  if(!resolved.mapping||!same(range.start,resolved.start)||!same(range.end,resolved.end)||input.sourceVerseCount!==resolved.sourceVerseCount||input.uxlcVerseRecords!==resolved.uxlcVerseRecords)throw Error('The retained Torah source reference does not match this UXLC section.');
  return resolved.mapping;
}
