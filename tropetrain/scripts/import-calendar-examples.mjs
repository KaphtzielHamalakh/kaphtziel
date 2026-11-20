import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {monthRequest,parseCalendarResponse} from '../calendar.js';

const root=new URL('../',import.meta.url),source=JSON.parse(await readFile(new URL('docs/CALENDAR-SOURCES.json',root),'utf8'));
const records=[];
for(const entry of source.bundled){
  const bytes=await readFile(new URL(entry.file,root));
  if(bytes.length!==entry.bytes||createHash('sha256').update(bytes).digest('hex')!==entry.sha256)throw Error('Calendar source bytes changed: '+entry.file);
  const request=monthRequest(entry.month,entry.region);if(request.url!==entry.url)throw Error('Calendar source URL changed: '+entry.file);
  const raw=bytes.toString('utf8');parseCalendarResponse(raw,request);records.push({...entry,raw});
}
await writeFile(new URL('calendar-example-data.js',root),'export const calendarExamples='+JSON.stringify(records)+';\n');
console.log(`Validated ${records.length} unchanged attributed calendar source examples.`);
