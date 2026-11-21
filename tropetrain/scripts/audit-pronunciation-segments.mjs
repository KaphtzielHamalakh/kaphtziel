import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {PronunciationLibrary} from '../pronunciation.js';
const read=file=>readFileSync(new URL('../'+file,import.meta.url)),hash=raw=>createHash('sha256').update(raw).digest('hex');
const raw=read('data/pronunciation/torah-segments.json.gz'),segments=JSON.parse(gunzipSync(raw)),display=JSON.parse(gunzipSync(read('data/pronunciation/torah-display.json.gz'))),underlay=JSON.parse(gunzipSync(read('data/pronunciation/torah-underlay.json.gz')));
if(segments.inputSha256!==hash(read('data/pronunciation/torah-display.json.gz'))||segments.underlaySha256!==hash(read('data/pronunciation/torah-underlay.json.gz'))||segments.computationSourceSha256!==hash(read('assets/pronunciation/phonetic-mam-computation-sources.zip')))throw Error('Source rule provenance changed.');
const baseline=new PronunciationLibrary(display,{underlay}),lib=new PronunciationLibrary(display,{underlay,segments});
let groups=0,units=0,refs=0,sharedHalves=0,sourceOnlyUnits=0,unownedUnits=0;const categories={};
for(const group of display.groups){
 const word={id:group.readerIds[0],sourceHebrew:group.readerHebrew[0]},before=baseline.study(word,'sephardic'),study=lib.study(word,'sephardic'),restored={...study,revision:4,rows:study.rows.map(row=>({...row,styles:Object.fromEntries(Object.entries(row.styles).map(([style,cells])=>[style,cells.map(cell=>!cell.units.length?cell:{...cell,units:cell.units.map(({sourceSegments,...unit})=>unit)})]))}))};delete restored.sourceSegments;
 if(JSON.stringify(restored)!==JSON.stringify(before))throw Error('Existing pronunciation fields changed: '+group.id);
 for(const row of study.rows)for(const cells of Object.values(row.styles))for(const cell of cells)for(const unit of cell.units){
  units++;if(!unit.readerWordId)unownedUnits++;if(!unit.hebrewClusterRanges)sourceOnlyUnits++;
  for(const variant of unit.sourceSegments.variants)for(const segment of variant.segments){refs++;categories[segment.categoryId]=(categories[segment.categoryId]??0)+1;if(segment.sharedWithUnitId)sharedHalves++;if(segment.ipa!==null||segment.phonemes!==null||segment.audioTimes!==null||segment.noteIds!==null||segment.individualHebrewRange!==null)throw Error('Unsupported acoustic or individual-letter allocation.');}
 }
 groups++;
}
const audit={schema:'tropetrain-pronunciation-segment-alignment-audit-v1',revision:1,sourceCommit:segments.sourceCommit,inputSha256:segments.inputSha256,underlaySha256:segments.underlaySha256,segmentsSha256:hash(raw),groups,units,segmentReferences:refs,sharedHalves,sourceOnlyUnits,unownedUnits,categories,existingFields:'Every prior study field, source cell, unit text, source stress, word ID, marked Hebrew range and shared-consonant reference reconstructs the unchanged revision4 baseline exactly.',limits:'Source categories/transcription projection only. No IPA, reviewed acoustic phonemes, individual segment-letter ranges, music/note timing or voice. All remaining pronunciation/cantillation requirements stay active.'};
const target=new URL('../docs/PRONUNCIATION-SEGMENT-ALIGNMENT.json',import.meta.url);
if(process.argv.includes('--check')){if(JSON.stringify(JSON.parse(readFileSync(target)))!==JSON.stringify(audit))throw Error('Pronunciation source-segment audit changed.');}else writeFileSync(target,JSON.stringify(audit,null,2)+'\n');
console.log(JSON.stringify({...audit,categories:undefined}));
