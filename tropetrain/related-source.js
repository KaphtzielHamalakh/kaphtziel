// Original client-side validation of attributed API output; no provider code.
export const RELATED_READINGS=Object.freeze([
  Object.freeze({field:'haft',summary:'haftara',count:'haftaraNumV',type:'haftarah',repertoire:'prophets',label:'Haftarah · source default'}),
  Object.freeze({field:'seph',summary:'sephardic',count:'sephardicNumV',type:'haftarah',repertoire:'prophets',label:'Haftarah · Sephardic reading variant'}),
  Object.freeze({field:'chabad',type:'haftarah',repertoire:'prophets',label:'Haftarah · Chabad reading variant'}),
  Object.freeze({field:'triHaft',summary:'triHaftara',count:'triHaftaraNumV',type:'haftarah',repertoire:'prophets',label:'Triennial haftarah · source selection'}),
  Object.freeze({field:'megillah',type:'megillah',repertoire:'megillot',label:'Megillah · source reading'})
]);
const BOOKS=Object.freeze({Joshua:'jos',Judges:'jdg','I Samuel':'sam1','II Samuel':'sam2','I Kings':'kgs1','II Kings':'kgs2',
  Isaiah:'isa',Jeremiah:'jer',Ezekiel:'ezk',Hosea:'hos',Joel:'jol',Amos:'amo',Obadiah:'oba',Jonah:'jon',Micah:'mic',Nahum:'nah',
  Habakkuk:'hab',Zephaniah:'zep',Haggai:'hag',Zechariah:'zec',Malachi:'mal',Ruth:'rut','Song of Songs':'sng',Ecclesiastes:'ecc',Lamentations:'lam',Esther:'est'});
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const positive=value=>Number.isSafeInteger(value)&&value>0;
const compare=(a,b)=>a.chapter-b.chapter||a.verse-b.verse;
export const relatedDefinition=field=>RELATED_READINGS.find(reading=>reading.field===field);

export function wholeVersePoint(value){
  if(typeof value!=='string'||!/^[1-9]\d{0,2}:[1-9]\d{0,2}$/.test(value))throw Error('Partial or ambiguous verse boundaries remain reference-only. An exact source word boundary is required; no whole verse was substituted.');
  const [chapter,verse]=value.split(':').map(Number);return {chapter,verse};
}
export function nextVerse(book,point){
  const chapter=book.chapters[point.chapter-1];
  if(point.verse<chapter.verses.length)return {chapter:point.chapter,verse:point.verse+1};
  return book.chapters[point.chapter]?{chapter:point.chapter+1,verse:1}:null;
}
export function relatedUnits(value){
  let shape,entries;
  if(object(value)&&typeof value.k==='string'){shape='unit';entries=[['unit',value]];}
  else if(Array.isArray(value)){shape='array';entries=value.map((unit,i)=>[String(i),unit]);}
  else if(object(value)){
    shape='numbered';entries=Object.entries(value);
    if(entries.some(([key])=>!/^[1-9]\d{0,2}$/.test(key)))throw Error('Unsupported numbered source structure; original references are kept.');
    // JSON objects have no semantic insertion order. Positive numbered keys
    // define their order; array passages retain the exact supplied sequence.
    entries.sort((a,b)=>Number(a[0])-Number(b[0]));
  }else throw Error('This source has only a citation or an unsupported structure; no passage boundaries were inferred.');
  if(!entries.length||entries.length>100)throw Error('The source needs between 1 and 100 explicit reading units.');
  return {shape,units:entries.map(([key,unit])=>({key,unit}))};
}
export function checkedRelatedUnit(entry,definition,corpus){
  if(!object(entry)||typeof entry.key!=='string'||entry.key.length>10||!object(entry.unit))throw Error('Invalid related-reading source unit.');
  const unit=entry.unit,bookId=Object.hasOwn(BOOKS,unit.k)?BOOKS[unit.k]:null,book=corpus.byId.get(bookId);
  if(!book||book.repertoire!==definition.repertoire)throw Error(`The source book ${String(unit.k)} is outside the available ${definition.type} text. No book was substituted.`);
  const start=wholeVersePoint(unit.b),end=wholeVersePoint(unit.e);
  if(compare(start,end)>0||!book.chapters[start.chapter-1]?.verses[start.verse-1]||!book.chapters[end.chapter-1]?.verses[end.verse-1])throw Error(`${unit.k} ${unit.b}–${unit.e} does not match an available UXLC range.`);
  let count=0;for(let chapter=start.chapter;chapter<=end.chapter;chapter++)count+=(chapter===end.chapter?end.verse:book.chapters[chapter-1].verses.length)-(chapter===start.chapter?start.verse:1)+1;
  if(!positive(unit.v)||unit.v!==count)throw Error(`${unit.k} ${unit.b}–${unit.e}: source verse count differs from UXLC. Review edition numbering before opening.`);
  const raw=JSON.stringify(unit);if(raw.length>8000)throw Error('Related-reading source unit is too large.');
  return {key:entry.key,unit:JSON.parse(raw),book,start,end,count};
}

// Called by Corpus.range for imports as well as fresh calendar selections.
// The complete ordered variant snapshot is retained for every selected range.
export function preserveRelatedSource(input,range,corpus){
  const definition=relatedDefinition(input?.variant);
  if(!object(input)||input.format!=='hebcal-related-reading-v1'||input.provider!=='Hebcal.com'||!definition||input.readingType!==definition.type||
    typeof input.url!=='string'||!/^https:\/\/www\.hebcal\.com\/leyning\?[^\s]{1,300}$/.test(input.url)||typeof input.sha256!=='string'||!/^[a-f0-9]{64}$/.test(input.sha256)||
    typeof input.serviceDate!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(input.serviceDate)||input.serviceDate<'0001-01-01'||input.serviceDate>'9999-12-31'||
    !['Diaspora','Israel'].includes(input.region)||typeof input.retrieved!=='string'||input.retrieved.length>40||
    !object(input.serviceName)||typeof input.serviceName.en!=='string'||!input.serviceName.en||input.serviceName.en.length>200||
    (input.serviceName.he!==undefined&&(typeof input.serviceName.he!=='string'||input.serviceName.he.length>200))||
    !['unit','array','numbered'].includes(input.shape)||!Array.isArray(input.units)||!input.units.length||input.units.length>100)throw Error('This section has invalid related-reading source metadata.');
  const date=new Date(input.serviceDate+'T12:00:00Z');if(!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==input.serviceDate)throw Error('Invalid related-reading service date.');
  const units=input.units.map(entry=>checkedRelatedUnit(entry,definition,corpus));
  if(new Set(units.map(entry=>entry.key)).size!==units.length)throw Error('Source unit keys must remain unique.');
  if(input.shape==='unit'&&(units.length!==1||units[0].key!=='unit')||input.shape==='array'&&units.some((entry,i)=>entry.key!==String(i))||
    input.shape==='numbered'&&units.some((entry,i)=>!/^[1-9]\d{0,2}$/.test(entry.key)||(i>0&&Number(entry.key)<=Number(units[i-1].key))))throw Error('Source unit ordering does not match its recorded structure.');
  const selection=input.selection;
  if(!object(selection)||!Number.isInteger(selection.first)||!Number.isInteger(selection.last)||selection.first<0||selection.last<selection.first||selection.last>=units.length||
    (definition.type==='haftarah'&&selection.first!==selection.last))throw Error('Invalid related-reading source selection.');
  const selected=units.slice(selection.first,selection.last+1),first=selected[0],last=selected.at(-1);
  for(let i=1;i<selected.length;i++)if(selected[i].book.id!==first.book.id||compare(selected[i].start,nextVerse(selected[i-1].book,selected[i-1].end)??{chapter:-1,verse:-1})!==0)throw Error('Discontinuous source units cannot be merged into one section.');
  if(range.bookId!==first.book.id||compare(range.start,first.start)!==0||compare(range.end,last.end)!==0)throw Error('Section boundaries differ from the retained source selection. Remove or replace the source claim before changing boundaries.');
  const result={format:input.format,provider:input.provider,url:input.url,sha256:input.sha256,retrieved:input.retrieved,
    serviceDate:input.serviceDate,region:input.region,serviceName:{en:input.serviceName.en,...(input.serviceName.he!==undefined?{he:input.serviceName.he}:{})},
    readingType:input.readingType,variant:input.variant,shape:input.shape,units:units.map(({key,unit})=>({key,unit})),selection:{first:selection.first,last:selection.last}};
  if(input.sourceSummary!==undefined){if(typeof input.sourceSummary!=='string'||input.sourceSummary.length>2000)throw Error('Invalid source citation summary.');result.sourceSummary=input.sourceSummary;}
  if(input.serviceContext!==undefined){
    if(!object(input.serviceContext)||Object.keys(input.serviceContext).some(key=>!['hdate','type','reason','note','admonition','parshaNum'].includes(key)))throw Error('Invalid related-reading service context.');
    const raw=JSON.stringify(input.serviceContext);if(raw.length>16000)throw Error('Related-reading service context is too large.');result.serviceContext=JSON.parse(raw);
  }
  if(input.reportedTotal!==undefined){
    if(!definition.count||!object(input.reportedTotal)||input.reportedTotal.field!==definition.count||input.reportedTotal.value!==units.reduce((n,u)=>n+u.count,0))throw Error('Source total verse count differs from its exact units.');
    result.reportedTotal={field:input.reportedTotal.field,value:input.reportedTotal.value};
  }
  if(input.triennialYear!==undefined){if(input.variant!=='triHaft'||![1,2,3].includes(input.triennialYear))throw Error('Invalid source triennial year.');result.triennialYear=input.triennialYear;}
  return result;
}
