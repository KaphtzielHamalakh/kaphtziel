import {writeFile} from 'node:fs/promises';
import {calendarExamples} from '../calendar-example-data.js';
import {getRepertoireCorpus} from '../repertoire.js';
import {relatedReadingChoices,relatedReadingRanges} from '../calendar-related.js';

const corpus=await getRepertoireCorpus(),selections=[];
for(const record of calendarExamples)for(const item of JSON.parse(record.raw).items)for(const choice of relatedReadingChoices(item)){
  const entry={file:record.file,sha256:record.sha256,region:record.region,serviceDate:item.date,service:item.name.en,variant:choice.field,...(choice.summary?{sourceCitation:choice.summary}:{})};
  try{
    const checked=relatedReadingRanges(item,choice.field,record,corpus);
    selections.push({...entry,status:'source_references_checked_against_UXLC',readingType:checked.readingType,sourceUnits:checked.sourceUnits,verses:checked.verses,
      sections:checked.ranges.map(range=>({id:range.id,bookId:range.bookId,start:range.start,end:range.end,sourceSelection:range.relatedSource.selection}))});
  }catch(error){selections.push({...entry,status:'reference_only',reason:error.message});}
}
const report={format:'tropetrain-calendar-related-audit-v1',sourceRecords:calendarExamples.map(({file,sha256,url})=>({file,sha256,url})),
  choices:selections.length,checked:selections.filter(s=>s.status==='source_references_checked_against_UXLC').length,referenceOnly:selections.filter(s=>s.status==='reference_only').length,
  limits:'Structural text/reference/verse-count checks for these eight pinned responses only. Not an exhaustive calendar/congregation, musical, phonetic or independent expert review. Source snapshot/hash retained by assignments is not a signed or independently refetched provider response.',selections};
await writeFile(new URL('../docs/CALENDAR-RELATED-AUDIT.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({choices:report.choices,checked:report.checked,referenceOnly:report.referenceOnly}));
