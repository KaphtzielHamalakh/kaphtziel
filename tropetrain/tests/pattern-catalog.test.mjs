import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {PRINTED_PATTERNS,PRINTED_PATTERN_CATALOG,PATTERN_IMAGE_DATA,PATTERN_RECORD_DATA,patternSource,availablePatternModes,printedPatternPlan} from '../printed-patterns.js';
import {soundingNotes,validatePlan} from '../synthesis.js';
import {staffMarkup} from '../staff.js';
import {createReadingModel,melodyProfiles} from '../music.js';
import {passage} from '../passage.js';
const bytes=name=>readFileSync(new URL('../'+name,import.meta.url));
const rows=PRINTED_PATTERN_CATALOG.rows,legacyRows=rows.slice(0,6),source=letter=>rows.find(r=>r.id.includes('-I-'+letter+'-')).id;
const plan=(letter,mode='pair',options={})=>printedPatternPlan(mode,{sourceId:source(letter),tempo:60,...options});

test('legacy figures stay exact while the continued source adds ten checked figures without unresolved fallbacks',()=>{
 assert.equal(rows.length,18);assert.equal(legacyRows.reduce((n,r)=>n+r.record.notes.length,0),50);assert.equal(rows.reduce((n,r)=>n+r.record.notes.length,0),129);
 assert.deepEqual(legacyRows.map(r=>availablePatternModes(r.id).map(m=>m.id)),[['pair','munah','revia'],['pair','munah','revia'],['pair','munah','revia'],['munah'],['pair','munah','revia'],['revia']]);
 assert.throws(()=>plan('D','revia'),/no checked transcription/);assert.throws(()=>plan('D','pair'),/no checked transcription/);
 assert.throws(()=>plan('F','munah'),/no checked transcription/);assert.throws(()=>patternSource('invented'),/checked printed source row/);
 assert.equal(rows.filter(r=>r.unavailable.length).length,4);assert.ok(rows.flatMap(r=>r.unavailable).every(p=>p.reason&&p.neededEvidence));
 assert.deepEqual(rows[0].record,PRINTED_PATTERNS);assert.equal(rows[0].record.id,'cohen-1902-munah-revia');
 for(const row of rows)for(const mode of availablePatternModes(row.id))assert.ok(validatePlan(printedPatternPlan(mode.id,{sourceId:row.id}))>0);
});
test('the new source rows retain literal checked pitch sequences and printed values including key signatures',()=>{
 assert.deepEqual(plan('B').map(n=>n.midi),[71,69,69,67,66,67,64,62,62]);
 assert.deepEqual(plan('B').map(n=>n.beats),[1,2,1,.5,.5,.5,.5,1,.5]);
 assert.deepEqual(plan('C').map(n=>n.midi),[65,67,69,69,67,72,69,69,69]);
 assert.deepEqual(plan('C').map(n=>n.beats),[.5,.5,2,1,.5,.5,1,.5,.5]);
 assert.deepEqual(plan('D','munah').map(n=>n.midi),[65,67,69,67]);
 assert.deepEqual(plan('E').map(n=>n.midi),[67,66,67,69,66,62,67,66,67,69,67,64,64,64]);
 assert.deepEqual(plan('F','revia').map(n=>n.midi),[71,69,71,69,67,67]);
 assert.ok(rows.filter(r=>!r.recordPath).every(r=>r.record.notes.every(n=>n.sourceLocation.includes('row I.'))));
});
test('printed held ties merge only their designated components while repeated untied pitches remain separate attacks',()=>{
 const c=plan('C'),e=plan('E'),cs=soundingNotes(c),es=soundingNotes(e);
 assert.equal(c.length,9);assert.equal(cs.length,8);assert.equal(e.length,14);assert.equal(es.length,13);
 assert.equal(cs[2].durationSeconds,2);assert.equal(cs[3].durationSeconds,1);
 const held=cs.find(n=>n.notationEventIds);assert.deepEqual(held.notationEventIds,[c[6].id,c[7].id]);assert.equal(held.durationSeconds,1.5);
 assert.equal(cs.at(-1).durationSeconds,.5);assert.equal(cs.at(-1).midi,held.midi);
 const slowed=soundingNotes(plan('C','pair',{tempo:40})).find(n=>n.notationEventIds);assert.equal(slowed.durationSeconds,2.25);
 assert.equal((staffMarkup(c,[],0,c.length,{untexted:true}).match(/aria-label="Tie: hold the same pitch"/g)||[]).length,1);
});
test('mixed subdivisions retain one complete 3:2 group and the full fourteen-component staff remains inspectable',()=>{
 const e=plan('E','revia'),f=plan('F','revia');
 assert.deepEqual(e.slice(0,4).map(n=>n.sourceRhythm.type),['eighth','16th','16th','eighth']);
 assert.ok(Math.abs(e.slice(0,4).reduce((n,x)=>n+x.beats,0)-1)<1e-10);
 assert.ok(Math.abs(f.slice(2,5).reduce((n,x)=>n+x.beats,0)-1)<1e-10);
 assert.deepEqual(e.slice(0,4).map(n=>n.sourceTupletPhase),['start','continue','continue','stop']);
 const full=plan('E'),svg=staffMarkup(full,[],0,full.length,{untexted:true});
 assert.equal((svg.match(/class="staff-note"/g)||[]).length,14);assert.equal((svg.match(/class="tuplet-bracket"/g)||[]).length,1);
 assert.equal((svg.match(/class="rhythm-ratio"/g)||[]).length,1);assert.doesNotMatch(svg,/data-word-index|class="staff-lyric"/);
});
test('source choice, transposition, pace and range leave marked Hebrew, pronunciation and source figures independent',()=>{
 const model=createReadingModel(passage),before=JSON.stringify(model),records=JSON.stringify(rows);
 for(const row of rows)for(const mode of availablePatternModes(row.id)){
  const base=printedPatternPlan(mode.id,{sourceId:row.id,tempo:60,transpose:0});
  const raised=printedPatternPlan(mode.id,{sourceId:row.id,tempo:40,transpose:2,rangeLow:40,rangeHigh:60,pronunciationId:'unrelated'});
  for(let i=0;i<base.length;i++){
   assert.equal(raised[i].id,base[i].id);assert.equal(raised[i].midi,base[i].midi+2);assert.equal(raised[i].beats,base[i].beats);
   assert.ok(Math.abs(raised[i].durationSeconds-base[i].durationSeconds*1.5)<1e-10);
   for(const key of ['wordId','sourceWordId','syllableId','syllable','phonemes'])assert.equal(base[i][key],null);
  }
  assert.equal(row.record.pronunciation,null);assert.equal(row.record.syllableUnderlay,null);
 }
 assert.equal(JSON.stringify(rows),records);assert.equal(JSON.stringify(model),before);
 assert.deepEqual(melodyProfiles.map(p=>p.id),['original-demo-01','cohen-1902-gen22-ending','baer-1894-gen1-1-5','cohen-1902-gen22-prophetical','baer-1894-gen22-19']);
});
test('all seven source images and both source records are exact and portable in the standalone',()=>{
 const html=bytes('TropeTrain.html').toString();assert.equal(Object.keys(PATTERN_IMAGE_DATA).length,7);
 for(const [path,url] of Object.entries(PATTERN_IMAGE_DATA)){
  assert.ok(url.startsWith('data:image/png;base64,'));assert.deepEqual(Buffer.from(url.split(',')[1],'base64'),bytes(path));assert.ok(html.includes(url));
 }
 for(const [path,url] of Object.entries(PATTERN_RECORD_DATA)){assert.deepEqual(Buffer.from(url.split(',')[1],'base64'),bytes(path));assert.ok(html.includes(url));}
 const original=JSON.parse(bytes('docs/PRINTED-PATTERN-CATALOG.json'));
 assert.equal(original.source.pdfSha1,'cbf09fe8bcf3a6349eac4c013bde04413f7b841d');assert.equal(original.source.page,540);
 assert.equal(createHash('sha256').update(bytes(original.source.image)).digest('hex'),original.source.imageSha256);
 assert.equal(createHash('sha256').update(bytes(original.source.contextImage.image)).digest('hex'),original.source.contextImage.sha256);
});
test('source viewer evidence preserves original image bytes and UTF-8 musical labels without navigation',async()=>{
 const {patternEvidence}=await import('../printed-patterns.js');
 for(const row of rows)for(const kind of ['columns','context','record']){
  const evidence=patternEvidence(row.id,kind);assert.deepEqual(Buffer.from(evidence.bytes),bytes(evidence.file));
  assert.equal(evidence.name,evidence.file.split('/').at(-1));
  if(kind==='record'){assert.equal(evidence.text,bytes(evidence.file).toString('utf8'));assert.match(evidence.text,/Munaḥ/);assert.doesNotMatch(evidence.text,/MunaÃ/);}else assert.equal(evidence.text,null);
 }
 assert.throws(()=>patternEvidence(rows[0].id,'invented'),/source image or record/);
});
