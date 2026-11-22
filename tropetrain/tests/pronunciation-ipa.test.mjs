import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {gunzipSync} from 'node:zlib';
import {PronunciationLibrary} from '../pronunciation.js';import {sourceIpaEvidence,ipaFragment,IPA_PROPOSAL_SOURCE} from '../pronunciation-ipa.js';import {SOURCE_IPA_PROPOSAL} from '../pronunciation-ipa-data.js';
const json=f=>JSON.parse(gunzipSync(readFileSync(new URL('../data/pronunciation/'+f+'.json.gz',import.meta.url)))),data=json('torah-display'),segments=json('torah-segments'),lib=new PronunciationLibrary(data,{underlay:json('torah-underlay'),segments});
const word=id=>{const hit=lib.byWord.get(id);return {id,sourceHebrew:hit.group.readerHebrew[hit.index]};};
const report=(id,style='sephardic')=>{const w=word(id);return sourceIpaEvidence(lib.study(w,style),w,style);};
test('all87source categories retain the literal proposal and19source uncertainties without becoming reviewed phonemes',()=>{
 assert.deepEqual(SOURCE_IPA_PROPOSAL.counts,{categories:87,questionedCategories:19,geminateCategories:20,withheldSharedHalfCategories:1});assert.equal(IPA_PROPOSAL_SOURCE.parameterizedByTextStyle,false);
 for(const c of segments.catalog){const p=ipaFragment({id:'test',categoryId:c.id,label:c.label,kind:c.kind,part:'whole'});assert.equal(p.phonemes,null);assert.equal(p.noteIds,null);assert.equal(p.audioTimes,null);assert.equal(p.proposedFragment,SOURCE_IPA_PROPOSAL.catalog.find(x=>x.categoryId===c.id).ipa);}
});
test('the same Hebrew keeps two existing text styles while one IPA source proposal stays separate',()=>{
 const a=report('gen-1-1-1'),b=report('gen-1-1-1','ashkenazic');assert.equal(a.hebrew,b.hebrew);assert.equal(a.selectedTranscriptionStyle,'sephardic');assert.equal(b.selectedTranscriptionStyle,'ashkenazic');assert.equal(a.ipaParameterizedByTextStyle,false);assert.notDeepEqual(a.units.map(x=>x.sourceText),b.units.map(x=>x.sourceText));assert.deepEqual(a.units.map(x=>x.fragments.map(f=>f.proposedFragment)),b.units.map(x=>x.fragments.map(f=>f.proposedFragment)));assert.equal(a.phonologicalReview,null);assert.equal(b.phonemes,null);
});
test('literal repeated shared consonants keep halves; uncertain tsadi length is never invented',()=>{
 for(const c of segments.catalog.filter(c=>c.geminate)){
  const row=SOURCE_IPA_PROPOSAL.catalog.find(x=>x.categoryId===c.id),make=part=>ipaFragment({id:'test',categoryId:c.id,label:c.label,kind:c.kind,part}),a=make('first-half-shared'),b=make('second-half-shared');
  if(c.id==='TSADI_1DAG'){assert.equal(a.proposedFragment,null);assert.equal(b.proposedFragment,null);assert.equal(a.sourceWholeIpa,'t͡s');assert.equal(a.questioned,true);assert.match(a.sourceComment,/not sure how to lengthen/);}else assert.equal(a.proposedFragment+b.proposedFragment,row.ipa);
 }
});
test('source-only forms and combined words do not acquire extra written ranges or individual phone ownership',()=>{
 const r=report('gen-4-18-9');assert.equal(r.sourceWordId,'gen-4-18-9');assert(r.units.length);assert(r.units.every(u=>u.readerRanges===null));
 for(const id of ['deu-32-6-1','deu-32-6-2']){const p=report(id);assert(p.units.length);assert(p.units.every(u=>u.ownerWordId===null&&u.occurrenceId===null&&u.ownership==='source-group-shared'));}
});
test('repeated reading occurrences stay distinct and the original study is byte-for-byte unchanged',()=>{
 const w=word('gen-1-1-1'),s=lib.study(w,'sephardic'),before=JSON.stringify(s),a=sourceIpaEvidence(s,{...w,id:'first',sourceWordId:w.id},'sephardic'),b=sourceIpaEvidence(s,{...w,id:'again',sourceWordId:w.id},'sephardic');assert.notEqual(a.wordId,b.wordId);assert(a.units.every(u=>u.occurrenceId==='first'));assert(b.units.every(u=>u.occurrenceId==='again'));assert.equal(JSON.stringify(s),before);
});
test('changed marked Hebrew, wrong source, unknown categories and unsupported styles refuse a proposal',()=>{
 const w=word('gen-1-1-1'),s=lib.study(w,'sephardic');assert.throws(()=>sourceIpaEvidence(s,{...w,sourceHebrew:w.sourceHebrew.replace('֖','')},'sephardic'),/marked Hebrew/);assert.throws(()=>sourceIpaEvidence({...s,sourceCommit:'wrong'},w,'sephardic'),/source/);assert.throws(()=>sourceIpaEvidence(s,w,'Galician'),/Unsupported/);assert.throws(()=>ipaFragment({categoryId:'invented',part:'whole'}),/category/);
});
test('the source proposal and unchanged GPLsource pack survive the portable build',()=>{
 const html=readFileSync(new URL('../TropeTrain.html',import.meta.url),'utf8'),doc=readFileSync(new URL('../docs/PRONUNCIATION-IPA-PROPOSAL.json',import.meta.url)),zip=readFileSync(new URL('../assets/pronunciation/ipa-proposal-sources.zip',import.meta.url));assert(html.includes(doc.toString('base64')));assert(html.includes(zip.toString('base64')));assert(html.includes('ipaParameterizedByTextStyle'));
});
