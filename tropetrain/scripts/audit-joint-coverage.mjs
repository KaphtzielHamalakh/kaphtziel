import {readFileSync,writeFileSync} from 'node:fs';import {gunzipSync} from 'node:zlib';import assert from 'node:assert/strict';
import {PronunciationLibrary} from '../pronunciation.js';import {ReferenceLibrary} from '../reference-library.js';
import {originalWordWindow} from '../source-word-windows.js';
import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url),read=p=>JSON.parse(gunzipSync(readFileSync(new URL(p,root))));
const p=new PronunciationLibrary(read('data/pronunciation/torah-display.json.gz'),{underlay:read('data/pronunciation/torah-underlay.json.gz')}),r=new ReferenceLibrary(read('data/references/torah-library.json.gz'));
const owners={sephardic:new Set(),ashkenazic:new Set()},written={sephardic:new Set(),ashkenazic:new Set()};
for(const g of p.groups){const s=p.study({id:g.readerIds[0],sourceHebrew:g.readerHebrew[0]},'sephardic');for(const row of s.rows)for(const [style,cells] of Object.entries(row.styles))for(const c of cells)for(const u of c.units){if(u.readerWordId)owners[style].add(u.readerWordId);for(const range of u.hebrewClusterRanges??[])written[style].add(range.readerWordId);}}
const matrix={},gaps=[];let terminalOnsets=0;
for(const [id,{recording,word}] of r.byWord){
 const window=originalWordWindow(recording,word,r.timingPolicy(recording)),timed=!!window,group=p.byWord.get(id),owned=owners.sephardic.has(id),underlay=written.sephardic.has(id);
 assert.equal(owned,owners.ashkenazic.has(id));assert.equal(underlay,written.ashkenazic.has(id));
 if(group)assert.equal(word.uxlcHebrew,group.group.readerHebrew[group.index]);
 if(timed){assert.ok(Number.isFinite(window.startSeconds));if(window.endSeconds===null){assert.equal(recording.words.at(-1).id,id);terminalOnsets++;}else assert.ok(Number.isFinite(window.endSeconds)&&window.endSeconds>window.startSeconds);}
 const key=[timed?'timed':'timing-review',owned?'word-owned':group?'group-only':'no-pronunciation-link',underlay?'written-range':'source-only'].join('/');matrix[key]=(matrix[key]??0)+1;
 if(timed&&!owned)gaps.push({id,hebrew:word.uxlcHebrew,recordingId:recording.id,pronunciation:group?'combined-source-form':'no-checked-source-link'});
}
const inputs=['docs/PRONUNCIATION-EDITION-WORDS.json','assets/pronunciation/mam-simple-torah-sources.zip','data/pronunciation/torah-display.json.gz','data/pronunciation/torah-underlay.json.gz','data/references/torah-library.json.gz'].map(path=>({path,sha256:createHash('sha256').update(readFileSync(new URL(path,root))).digest('hex')}));
const report={revision:2,inputs,schema:'tropetrain-joint-chant-pronunciation-coverage-v1',words:r.byWord.size,terminalOnsets,matrix,timedWithoutPronunciationOwner:gaps,limits:'Exact source-ID/text and source timing structure only; acoustic/linguistic/musical review pending. Written range, pronunciation unit ownership and original recording pronunciation are independent. Final375source-onset words end at verified decoded media duration, never an invented endpoint. No new timing/phoneme/note/voice or source-text rewrite.'};
writeFileSync(new URL('docs/JOINT-CHANT-PRONUNCIATION.json',root),JSON.stringify(report,null,2)+'\n');const summary={words:report.words,withChantAndPronunciation:matrix['timed/word-owned/written-range']+matrix['timed/word-owned/source-only'],withChantAndWrittenRanges:matrix['timed/word-owned/written-range'],timedWithoutOwner:gaps.length,timingReviewWords:Object.entries(matrix).filter(([key])=>key.startsWith('timing-review/')).reduce((n,[,count])=>n+count,0),terminalOnsets};
writeFileSync(new URL('joint-coverage-summary.js',root),'// Generated exact-ID source correspondence summary; inputs retain their attributed licenses.\nexport const JOINT_COVERAGE_SUMMARY='+JSON.stringify(summary)+';\n');
console.log(JSON.stringify({words:report.words,terminalOnsets,matrix,timedWithoutOwner:gaps.length}));
