// Original exhaustive correspondence checks; no linguistic review is inferred.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {PronunciationLibrary} from '../pronunciation.js';
import {PRONUNCIATION_REPERTOIRE_SUMMARY as source} from '../pronunciation-repertoire-summary.js';
import {PRONUNCIATION_REPERTOIRE_UNDERLAY as facts} from '../pronunciation-repertoire-underlay-summary.js';
const root=new URL('../',import.meta.url),read=p=>readFileSync(new URL(p,root));
const hash=b=>createHash('sha256').update(b).digest('hex');
const totals=()=>({units:0,exactReaderUnits:0,sourceOnlyUnits:0,priorWordLinks:0,additionalWordLinks:0,wordsWithUnits:0,wordsWithExactRanges:0,wordsFullyCovered:0,wordsWithPartialRanges:0});
const books=[];
for(const spec of source.books){
 const bid=spec.bookId,raw=read(`data/pronunciation/repertoire/${bid}.json.gz`),checked=facts.books.find(b=>b.bookId===bid);
 assert.equal(hash(raw),spec.packetSha256);assert.equal(checked.inputSha256,spec.packetSha256);
 const underlayRaw=read(`data/pronunciation/repertoire-underlay/${bid}.json.gz`);assert.equal(hash(underlayRaw),checked.packetSha256);
 const data=JSON.parse(gunzipSync(raw)),underlay=JSON.parse(gunzipSync(underlayRaw));
 const old=new PronunciationLibrary(data),library=new PronunciationLibrary(data,{underlay,underlayInputSha256:spec.packetSha256});
 const styles=Object.fromEntries(['sephardic','ashkenazic'].map(s=>[s,totals()]));
 const owners={sephardic:new Set(),ashkenazic:new Set()},ranges={sephardic:new Map(),ashkenazic:new Map()};
 const marked=new Map(data.groups.flatMap(g=>g.readerIds.map((id,i)=>[id,g.readerHebrew[i]])));
 for(const group of data.groups){
  const word={id:group.readerIds[0],sourceHebrew:group.readerHebrew[0]},before=old.study(word,'sephardic'),after=library.study(word,'sephardic');
  assert.strictEqual(after.sourceGroup,group);assert.deepEqual(after.readerHebrew,before.readerHebrew);assert.deepEqual(after.readerIds,before.readerIds);
  for(const [ri,row] of after.rows.entries())for(const style of Object.keys(styles))row.styles[style].forEach((cell,ci)=>{
   const prior=before.rows[ri].styles[style][ci];assert.equal(cell.text,prior.text);assert.deepEqual(cell.boundaries,prior.boundaries);
   cell.units.forEach((unit,ui)=>{
    const original=prior.units[ui],count=styles[style];count.units++;
    for(const key of ['id','text','start','end','sourceStress','sourceMarks'])assert.deepEqual(unit[key],original[key]);
    assert.equal(unit.sourceBoundaryReaderWordId,original.readerWordId);
    if(original.readerWordId){assert.equal(unit.readerWordId,original.readerWordId);count.priorWordLinks++;}
    else count.additionalWordLinks+=unit.readerWordId!==null;
    for(const key of ['phonemes','noteIds','audioTimes'])assert.equal(unit[key],null);
    if(unit.readerWordId)owners[style].add(unit.readerWordId);
    if(unit.hebrewClusterRanges){
     count.exactReaderUnits++;
     for(const r of unit.hebrewClusterRanges){
      const text=group.readerHebrew[group.readerIds.indexOf(r.readerWordId)];
      assert.equal(text.slice(r.start,r.end),r.text);assert.ok(/[א-ת]/u.test(text[r.start]));
      assert.ok(r.end===text.length||/[א-ת]/u.test(text[r.end]));
      if(r.role==='written'){if(!ranges[style].has(r.readerWordId))ranges[style].set(r.readerWordId,[]);ranges[style].get(r.readerWordId).push([r.start,r.end]);}
     }
    }else count.sourceOnlyUnits++;
   });
  });
 }
 for(const style of Object.keys(styles)){styles[style].wordsWithUnits=owners[style].size;styles[style].wordsWithExactRanges=ranges[style].size;
  for(const [id,parts] of ranges[style]){let end=0,gap=false;for(const [a,b] of parts.sort((x,y)=>x[0]-y[0])){if(a>end)gap=true;end=Math.max(end,b);}const complete=!gap&&end===marked.get(id).length;styles[style][complete?'wordsFullyCovered':'wordsWithPartialRanges']++;}
 }
 books.push({bookId:bid,groups:data.groups.length,inputSha256:spec.packetSha256,underlaySha256:checked.packetSha256,styles});
}
const styles=Object.fromEntries(['sephardic','ashkenazic'].map(style=>[style,Object.fromEntries(Object.keys(totals()).map(key=>[key,books.reduce((n,b)=>n+b.styles[style][key],0)]))]));
const report={schema:'tropetrain-pronunciation-repertoire-underlay-alignment-v1',revision:1,sourceCommit:source.sourceCommit,books,styles,
 review:null,limits:'Exact source transcription and written-cluster correspondence checks only. Original Hebrew, accents, source packets, prior links, stress and units retained. Differing reading forms keep null written ranges. No category/IPA, phonemes, notes, audio times, new singing voices or full Kinnor phonological grammar assigned.'};
const output='docs/PRONUNCIATION-REPERTOIRE-UNDERLAY-ALIGNMENT.json',text=JSON.stringify(report,null,2)+'\n';
if(process.argv.includes('--check'))assert.equal(read(output).toString(),text);else writeFileSync(new URL(output,root),text);
console.log(JSON.stringify({books:books.length,styles,review:null}));
