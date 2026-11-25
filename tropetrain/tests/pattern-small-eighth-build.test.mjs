import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {restoredPortableHtml,portableFileBytes} from './portable-artifact.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url)),sha=b=>createHash('sha256').update(b).digest('hex');
test('both distributions preserve exact source evidence and separate opt-in small-note controls without certifying source duration, word fitting or voice',()=>{
 const path='docs/IDELSOHN-NO267-SMALL-NOTE-STUDY.json',raw=read(path),r=JSON.parse(raw),source=JSON.parse(read(r.source.record));
 assert.equal(r.schema,'tropetrain-no267-original-small-note-study-v1');assert.equal(sha(read(r.source.record)),r.source.recordSha256);assert.equal(sha(read(r.source.image)),r.source.imageSha256);
 for(const input of r.inputs)assert.equal(sha(read(input.path)),input.sha256,input.path);
 assert.deepEqual(r.counts,{defaultWrittenValueFigures:21,sourcePendingFigures:5,additionalOriginalSmallNoteStudies:2,figuresStillWithheldWithAllOptions:3,sourceComponentsInOriginalStudies:6,smallNotes:2,acceptedHistoricalDurations:0,acceptedWordOrPhonemeFits:0});
 assert.equal(source.figures.filter(f=>f.status==='pending').length,5);
 for(const f of r.figures){assert.equal(f.sourceStatus,'pending');assert.equal(f.originalInstrumentTiming.id,'original-no267-small-eighth-80ms-v1');assert.deepEqual(f.sourceComponents,source.figures.find(s=>s.id===f.id).components);for(const k of ['sourceTotalDuration','sourceSmallNoteRole','sourceSmallNoteDuration','acceptedWordUnderlay','acceptedSyllableUnderlay','phonemes','voice','recordedTiming','actualTuning','modernAccentEquivalent','kinnorEquivalent','independentReview'])assert.equal(f[k],null,k);}
 const normal=read('index.html').toString(),portable=restoredPortableHtml(read('TropeTrain.html')).toString();
 for(const html of [normal,portable]){assert.match(html,/<input id="pattern-small-eighth-demo" type="checkbox">/);assert(html.includes('id="pattern-small-eighth-options" class="muted" hidden'));assert(html.includes('id="pattern-grace-demo"'));assert(html.includes('id="pattern-repeat-demo"'));assert(html.includes('id="printed-small-eighth-demo"'));}
 assert(normal.includes('href="./'+path+'"'));assert(portable.includes('data:application/json;base64,'+raw.toString('base64')));assert(read('sw.js').includes(path));assert(read('app.bundle.js').includes('original-no267-small-eighth-80ms-v1'));assert(portableFileBytes()<100*1024*1024);
});
