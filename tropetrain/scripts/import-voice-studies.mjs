import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url),read=name=>readFile(new URL(name,root));
const catalog=JSON.parse(await read('docs/VOICE-STUDIES.json'));
if(catalog.format!=='tropetrain-voice-studies-v1'||catalog.revision!==1||catalog.recordings.length!==5)throw Error('Unexpected voice-study catalog.');
const ids=new Set(),combinations=new Set();
for(const record of catalog.recordings){
  const study=catalog.studies.find(s=>s.id===record.studyId),key=[record.studyId,record.pronunciationId,record.deliveryId].join('/');
  if(!study||ids.has(record.id)||combinations.has(key)||!study.pronunciations.some(p=>p.id===record.pronunciationId)||!study.deliveries.some(d=>d.id===record.deliveryId))throw Error('Invalid source-study identity.');
  ids.add(record.id);combinations.add(key);
  const bytes=await read(record.audio.file);
  if(bytes.length!==record.audio.bytes||['sha1','sha256'].some(hash=>createHash(hash).update(bytes).digest('hex')!==record.audio[hash]))throw Error(`Original recording changed: ${record.id}.`);
  for(const field of ['timedWords','syllableAlignment','phonemes','musicalNotes','independentReview'])if(record[field]!==null)throw Error('Unreviewed alignment or realization was introduced.');
}
for(const study of catalog.studies)for(const p of study.pronunciations)for(const d of study.deliveries)
  if(!combinations.has([study.id,p.id,d.id].join('/')))throw Error('Unsupported pronunciation/delivery cross-product.');
await writeFile(new URL('voice-study-data.js',root),'// Generated from docs/VOICE-STUDIES.json by scripts/import-voice-studies.mjs.\nexport const VOICE_STUDIES='+JSON.stringify(catalog)+';\n');
console.log('Verified five unchanged licensed source recordings; pronunciation/delivery axes and absent alignment preserved.');
