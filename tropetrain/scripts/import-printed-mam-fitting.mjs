import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
import {PronunciationLibrary} from '../pronunciation.js';
import {SourceSyllableUnderlay,SOURCE_SYLLABLE_UNDERLAY} from '../source-syllable-underlay.js';
const root=new URL('../',import.meta.url),read=p=>readFileSync(new URL(p,root)),sha=b=>createHash('sha256').update(b).digest('hex'),json=p=>JSON.parse(read(p));
const files=['docs/IDELSOHN-NO268-SCORE.json','docs/IDELSOHN-NO268-PRINTED-UNDERLAY.json','docs/IDELSOHN-PHONETIC-KEY.json','data/pronunciation/torah-display.json.gz','data/pronunciation/torah-underlay.json.gz','data/pronunciation/torah-segments.json.gz'];
const [score,printed,key]=files.slice(0,3).map(json),[display,underlay,segments]=files.slice(3).map(p=>JSON.parse(gunzipSync(read(p)))),library=new PronunciationLibrary(display,{underlay,segments}),adapter=new SourceSyllableUnderlay(library);
assert.equal(sha(read(files[0])),printed.sourceScoreRecordSha256);assert.equal(score.words.length,39);assert.equal(key.source.pdfSha256,score.source.pdfSha256);
for(const p of key.pages){const b=read(p.image);assert.equal(b.length,p.imageBytes);assert.equal(sha(b),p.imageSha256);}
const words=printed.words.map((w,index)=>{
 const original=score.words[index];assert.equal(w.sourceWordId,original.id);assert.equal(w.sourceHebrew,original.sourceHebrew);
 const m=adapter.word({id:w.sourceWordId,sourceHebrew:w.sourceHebrew});assert.equal(m.status,'available');assert.equal(m.paths.length,2);assert(m.paths.every(p=>p.gap===null));
 assert.equal(m.syllables.map(u=>u.sourceHebrew).join(''),w.sourceHebrew);assert.deepEqual(m.paths.map(p=>p.style),['sephardic','ashkenazic']);
 for(const [i,u]of m.syllables.entries()){assert.equal(w.sourceHebrew.slice(u.writtenRange.start,u.writtenRange.end),u.sourceHebrew);assert.deepEqual(m.paths.map(p=>[p.units[i].start,p.units[i].end,p.units[i].sourceStress]),m.paths.map(()=>[u.writtenRange.start,u.writtenRange.end,u.stress]));assert.equal(u.phonemes,null);}
 return {sourceWordId:w.sourceWordId,sourceHebrew:w.sourceHebrew,printedWordId:w.printedWordId,printedGroups:w.units.map(u=>({id:u.id,index:u.index,noteIds:u.noteIds.slice()})),mamUnits:m.syllables,mamPaths:m.paths,acceptedMapping:null,phonemes:null,audioTimes:null,voice:null,review:null};
});
const counts={words:words.length,printedGroups:words.reduce((n,w)=>n+w.printedGroups.length,0),mamUnits:words.reduce((n,w)=>n+w.mamUnits.length,0),equalCounts:words.filter(w=>w.printedGroups.length===w.mamUnits.length).length};assert.deepEqual(counts,{words:39,printedGroups:93,mamUnits:94,equalCounts:38});assert.deepEqual(words.filter(w=>w.printedGroups.length!==w.mamUnits.length).map(w=>w.sourceWordId),['exo-12-22-12']);
const record={schema:'tropetrain-printed-mam-fitting-sources-v1',revision:1,id:'idelsohn-no268-mam-source-partitions-v1',status:'source-partitions-only-no-accepted-cross-source-fitting',sources:files.map(path=>({path,sha256:sha(read(path))})),printedScoreId:score.id,printedUnderlayId:printed.id,mamSource:SOURCE_SYLLABLE_UNDERLAY,phoneticKey:key,rights:{printedSource:'PublicDomain',mamSourceData:'CC-BY-SA-4.0; Phonetic MAM by Benjamin Denckla, Hebrew Wikisource Miqra according to the Masorah',newCode:'CC0-1.0',correspondenceData:'CC-BY-SA-4.0'},words,counts,acceptedMapping:null,phoneticUnicode:null,phonemes:null,audioTimes:null,voice:null,review:null,limits:['Independent printed and MAM divisions are retained. Equal counts do not establish phonetic identity.','Personal bindings and the optional original project proposal are separate from accepted source fitting. Default fitting is blank.','A complete proposed span follows as a whole. No source syllable is assigned to an individual note or sung acoustic boundary.','Source alternatives, stress, shared consonants, written ranges and exact Hebrew remain unchanged. No traditional voice or complete grammar is supplied.']};
const raw=Buffer.from(JSON.stringify(record,null,2)+'\n');writeFileSync(new URL('docs/PRINTED-MAM-FITTING-SOURCES.json',root),raw);
const sourceModule=[
 '// Generated source partitions; MAM data CC-BY-SA4, original print public domain, new code CC0. No accepted fitting.',
 'export const FIT_SOURCES='+JSON.stringify(record)+';',
 'export const FIT_SOURCES_SHA256='+JSON.stringify(sha(raw))+';',
 "export const FIT_SOURCE_EVIDENCE='data:application/json;charset=utf-8,'+encodeURIComponent(JSON.stringify(FIT_SOURCES,null,2)+'\\n');",
 'export const FIT_KEY_IMAGES='+JSON.stringify(key.pages.map(p=>'data:image/jpeg;base64,'+read(p.image).toString('base64')))+';'
].join('\n')+'\n';
writeFileSync(new URL('printed-mam-fit-data.js',root),sourceModule);
console.log('No268/MAM source partitions:39 unchanged words,93 printed groups/94 MAM units,38 count matches; all accepted fitting/phonemes/times/voice/review null.');
