import {RELATED_READINGS,relatedDefinition,relatedUnits,checkedRelatedUnit,nextVerse} from './related-source.js';
import {validateReadingSections} from './repertoire.js';

export function relatedReadingChoices(item){
  return RELATED_READINGS.filter(definition=>item[definition.field]!==undefined||(definition.summary&&item[definition.summary]!==undefined)).map(definition=>({
    ...definition,summary:definition.summary&&typeof item[definition.summary]==='string'?item[definition.summary]:typeof item[definition.field]==='string'?item[definition.field]:null,
    value:item[definition.field],year:definition.field==='triHaft'?item.triYear:null
  }));
}
export function relatedUnitLabel(unit){return unit&&typeof unit==='object'?`${unit.k??'?'} ${unit.b??'?'}–${unit.e??'?'}${Number.isInteger(unit.v)?` · ${unit.v} source verses`:''}`:String(unit);}
export function relatedReadingRanges(item,field,record,corpus){
  const definition=relatedDefinition(field);if(!definition)throw Error('Choose an available related reading.');
  const value=item[field],{shape,units}=relatedUnits(value),checked=units.map(entry=>checkedRelatedUnit(entry,definition,corpus));
  const groups=[];
  for(const [index,unit] of checked.entries()){
    const previous=groups.at(-1),last=previous&&checked[previous.last],next=last&&nextVerse(last.book,last.end);
    if(definition.type==='megillah'&&previous&&unit.book.id===last.book.id&&next&&unit.start.chapter===next.chapter&&unit.start.verse===next.verse)previous.last=index;
    else groups.push({first:index,last:index});
  }
  const source={format:'hebcal-related-reading-v1',provider:'Hebcal.com',url:record.url,sha256:record.sha256,retrieved:record.retrieved,
    serviceDate:item.date,region:record.region,serviceName:{...item.name},serviceContext:Object.fromEntries(['hdate','type','reason','note','admonition','parshaNum'].filter(key=>item[key]!==undefined).map(key=>[key,item[key]])),readingType:definition.type,variant:field,shape,units,
    ...(definition.summary&&typeof item[definition.summary]==='string'?{sourceSummary:item[definition.summary]}:{}),
    ...(definition.count&&item[definition.count]!==undefined?{reportedTotal:{field:definition.count,value:item[definition.count]}}:{}),
    ...(field==='triHaft'&&item.triYear!==undefined?{triennialYear:item.triYear}:{})};
  const ranges=groups.map((selection,index)=>{
    const first=checked[selection.first],last=checked[selection.last];
    return corpus.range({id:`related-${item.date.replaceAll('-','')}-${record.region.toLowerCase()}-${field}-${index+1}`,
      bookId:first.book.id,start:first.start,end:last.end,label:`${item.name.en} · ${definition.label} · ${index+1}`,
      relatedSource:{...source,selection}});
  });
  return {readingType:definition.type,label:definition.label,ranges:validateReadingSections(definition.type,ranges,corpus),
    sourceUnits:checked.length,verses:checked.reduce((n,unit)=>n+unit.count,0)};
}
