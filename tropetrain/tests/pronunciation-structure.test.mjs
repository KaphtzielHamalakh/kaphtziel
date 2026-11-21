import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {transcriptionStructure,sourcePronunciationStudy} from '../pronunciation-structure.js';
import {PronunciationLibrary} from '../pronunciation.js';
import {Corpus} from '../library.js';
import {createReadingModel} from '../music.js';
const read=f=>readFileSync(new URL('../'+f,import.meta.url));
const data=JSON.parse(gunzipSync(read('data/pronunciation/torah-display.json.gz'))),library=new PronunciationLibrary(data);
const get=id=>{const g=library.byWord.get(id).group;return {g,w:{id,sourceHebrew:g.readerHebrew[g.readerIds.indexOf(id)]}};};
const originalText=nodes=>nodes===null?null:nodes.map(n=>typeof n==='string'?n:n.kind==='superscript-e'?'ᵉ':originalText(n.content)).join('');

test('source primary stress stays distinct from acute marks and superscript vowels',()=>{
 const {w}=get('gen-1-1-1'),study=library.study(w,'sephardic'),cell=study.rows[0].styles.sephardic[0];
 assert.deepEqual(cell.units.map(u=>u.text),['bᵉ','ré','shít']);
 assert.deepEqual(cell.units.map(u=>u.sourceStress),[false,false,true]);
 assert.deepEqual(cell.units.map(u=>u.acutePositions.length),[0,1,1]);
 assert.equal(cell.units[0].sourceMarks[0].kind,'superscript-e');
 assert.equal(cell.units[0].sourceMarks[0].start,1);
 assert.equal(cell.units[0].id,'pmam-gen-1-1-1-sephardic-r1-c1-u1');
 assert.ok(cell.units.every(u=>u.readerWordId===w.id&&u.phonemes===null&&u.hebrewClusterRanges===null&&u.noteIds===null&&u.audioTimes===null));
 assert.equal(cell.readerWordId,w.id);assert.equal(cell.phonemes,null);assert.equal(cell.hebrewClusterRanges,null);assert.equal(cell.audioTimes,null);assert.equal(cell.noteIds,null);
 const {w:b}=get('gen-1-1-2');assert.deepEqual(library.study(b,'sephardic').rows[0].styles.sephardic[0].units.map(u=>[u.text,u.sourceStress]),[['ba',false],['ra',true]]);
 assert.deepEqual(library.study(b,'ashkenazic').rows[0].styles.ashkenazic[0].units.map(u=>u.text),['bo','ro']);
});
test('reading labels, decomposed breve, literal missing cells and column indices survive',()=>{
 const {w}=get('deu-1-27-2'),rows=library.study(w,'sephardic').rows[0].styles;
 assert.deepEqual(rows.sephardic.map(c=>c.column),[1,2]);
 assert.deepEqual(rows.sephardic.map(c=>c.marks.find(m=>m.kind==='reading').label),['קמץ-ד','קמץ-ס']);
 assert.ok(rows.sephardic[0].units.some(u=>u.brevePositions.length));
 assert.equal(rows.ashkenazic[1].status,'repeated');assert.equal(rows.ashkenazic[1].literalText,'—');assert.equal(rows.ashkenazic[1].sourceReference.column,1);assert.equal(rows.ashkenazic[1].text,rows.ashkenazic[0].text);
 assert.equal(transcriptionStructure(null).status,'missing');assert.equal(transcriptionStructure(['']).status,'empty');
});
test('shared groups and internal joins never acquire an invented per-word or Hebrew-letter split',()=>{
 const {w}=get('deu-32-6-1'),s=library.study(w,'ashkenazic');
 assert.equal(s.alignmentScope,'complete-reader-group');assert.deepEqual(s.readerIds,['deu-32-6-1','deu-32-6-2']);
 assert.deepEqual(s.readerHebrew,['הֲ־','לַיְהוָה֙']);
 assert.equal(s.rows[0].styles.ashkenazic[0].readerWordId,null);
 assert.ok(s.rows[0].styles.ashkenazic[0].units.every(u=>u.readerWordId===null));
 assert.deepEqual(s.rows[0].styles.ashkenazic[0].units.map(u=>u.text),['hal','’ă','dó','noy']);
 const {w:n}=get('num-12-9-1'),c=library.study(n,'sephardic').rows[0].styles.sephardic[0];
 assert.equal(c.boundaries.find(b=>b.kind==='source-join').text,'-');assert.equal(c.readerWordId,n.id);assert.equal(c.hebrewClusterRanges,null);
});
test('source units losslessly reconstruct all cells, including joins, spaces and nested readings',()=>{
 let count=0,missing=0,repeatMarks=0,stress=0,readings=0,supers=0;
 const visit=(nodes,counts)=>{for(const n of nodes??[])if(typeof n!=='string'){counts[n.kind]=(counts[n.kind]??0)+1;if(n.content)visit(n.content,counts);}};
 for(const g of data.groups)for(const r of g.rows)for(const cells of Object.values(r.transcriptions))for(const cell of cells){
  const s=transcriptionStructure(cell),counts={};visit(cell,counts);count++;
  assert.equal(s.text,originalText(cell));
  assert.equal(s.marks.filter(m=>m.kind==='stressed').length,counts.stressed??0);
  assert.equal(s.marks.filter(m=>m.kind==='reading').length,counts.reading??0);
  assert.equal(s.marks.filter(m=>m.kind==='superscript-e').length,counts['superscript-e']??0);
  if(s.status==='present'){
   const parts=[...s.units,...s.boundaries].sort((a,b)=>a.start-b.start);
   assert.equal(parts.map(p=>p.text).join(''),s.text);let end=0;
   for(const p of parts){assert.equal(p.start,end);assert.equal(s.text.slice(p.start,p.end),p.text);end=p.end;}
   assert.equal(end,s.text.length);
  }
  missing+=s.status==='missing';repeatMarks+=s.status==='repeat-mark';stress+=counts.stressed??0;readings+=counts.reading??0;supers+=counts['superscript-e']??0;
 }
 assert.deepEqual({count,missing,repeatMarks,stress,readings,supers},{count:139196,missing:2282,repeatMarks:88,stress:136848,readings:324,supers:38921});
 const audit=JSON.parse(read('docs/PRONUNCIATION-STRUCTURE.json'));assert.equal(audit.inputSha256,createHash('sha256').update(read('data/pronunciation/torah-display.json.gz')).digest('hex'));assert.equal(audit.groups,68354);assert.equal(audit.mappedReaderWords,79806);
});
test('source study follows occurrence IDs while reader text, syllable drafts, melody, range, tempo and pitches remain independent',()=>{
 const manifest=JSON.parse(read('data/torah/manifest.json')),books=manifest.books.map(b=>JSON.parse(read('data/torah/'+b.file))),corpus=new Corpus({manifest,books});
 const model=createReadingModel(corpus.passage([{id:'a',bookId:'gen',start:{chapter:1,verse:1},end:{chapter:1,verse:1}}]));
 const before=JSON.stringify(model),word=model.words[1],events=JSON.stringify(model.buildPlan(0,model.words.length-1,{tempo:81,transpose:3}));
 const a=library.study(word,'sephardic'),b=library.study(word,'ashkenazic');assert.equal(JSON.stringify(model),before);assert.equal(JSON.stringify(model.buildPlan(0,model.words.length-1,{tempo:81,transpose:3})),events);
 assert.deepEqual(a.rows,b.rows);assert.deepEqual(a.sourceGroup,b.sourceGroup);assert.notEqual(a.selectedStyle,b.selectedStyle);
 const {w}=get('gen-1-1-2'),occurrence={...w,id:'gen-1-1-2@repeat',sourceWordId:w.id};
 const s=library.study(occurrence,'ashkenazic');assert.equal(s.selection.occurrenceId,occurrence.id);assert.equal(s.selection.sourceWordId,w.id);assert.deepEqual(s.readerIds,[w.id]);
 assert.equal(library.study({id:'gen-8-20-8',sourceHebrew:'הַטְּהוֹרָ֗ה'},'sephardic'),null);
});
test('structure refuses unsupported markup/styles and changed marked text without modifying source data',()=>{
 const {g,w}=get('gen-1-1-2'),before=JSON.stringify(g);
 assert.throws(()=>transcriptionStructure([{kind:'phoneme',content:['x']}]),/Unsupported/);
 assert.throws(()=>transcriptionStructure([{kind:'reading',content:['x']}]),/Invalid/);
 assert.throws(()=>sourcePronunciationStudy(g,{sourceCommit:data.sourceCommit,word:w,style:'galician'}),/Unsupported/);
 assert.throws(()=>library.study({...w,sourceHebrew:w.sourceHebrew+'֑'},'sephardic'),/Hebrew source changed/);
 assert.equal(JSON.stringify(g),before);
});
