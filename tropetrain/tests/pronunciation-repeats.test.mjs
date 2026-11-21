import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {PronunciationLibrary} from '../pronunciation.js';
import {sourcePronunciationStudy} from '../pronunciation-structure.js';
import {Corpus} from '../library.js';
import {createReadingModel} from '../music.js';
const read=f=>readFileSync(new URL('../'+f,import.meta.url));
const data=JSON.parse(gunzipSync(read('data/pronunciation/torah-display.json.gz'))),library=new PronunciationLibrary(data);
const word=id=>{const g=library.byWord.get(id).group;return {id,sourceHebrew:g.readerHebrew[g.readerIds.indexOf(id)]};};
const reading=(label,text)=>[{kind:'reading',label,content:[text]}];
function fixture(ashkenazic,hebrew=[reading('קמץ-ד','אב'),reading('קמץ-ס','אב')]){
 const group={id:'test',readerIds:['test-0'],readerHebrew:['אב'],rows:[{number:1,hebrew,transcriptions:{sephardic:[reading('קמץ-ד','ba'),reading('קמץ-ס','ba')],ashkenazic}}]};
 return sourcePronunciationStudy(group,{word:{id:'test-0',sourceHebrew:'אב'},sourceCommit:'test',style:'ashkenazic'}).rows[0].styles.ashkenazic;
}

test('a qamats dash explicitly references the same style and retains its literal AST, labels, stress and Unicode',()=>{
 const w=word('deu-1-27-2'),before=JSON.stringify(library.at(w)),s=library.study(w,'ashkenazic'),[first,repeat]=s.rows[0].styles.ashkenazic;
 assert.equal(s.revision,3);assert.deepEqual(s.sourceGroup.rows[0].transcriptions.ashkenazic[1],['—']);
 assert.equal(repeat.literalText,'—');assert.equal(repeat.literalStatus,'repeat-mark');assert.equal(repeat.status,'repeated');
 assert.equal(repeat.sourceReference.cellId,first.id);assert.equal(repeat.sourceReference.style,'ashkenazic');assert.equal(repeat.sourceReference.column,1);assert.deepEqual(repeat.sourceReference.alternativeLabels,['קמץ-ס']);
 assert.equal(repeat.text,first.text);assert.notEqual(repeat.text,s.rows[0].styles.sephardic[1].text);
 assert.deepEqual(repeat.units.map(u=>[u.text,u.sourceStress,u.acutePositions,u.brevePositions,u.readerWordId]),first.units.map(u=>[u.text,u.sourceStress,u.acutePositions,u.brevePositions,u.readerWordId]));
 assert.ok(repeat.units.every(u=>u.id.startsWith('pmam-deu-1-27-2-ashkenazic-r2-c2-u')&&u.sourceReference.cellId===first.id&&u.sourceMarks.every(m=>m.sourceColumn===1)));
 assert.equal(JSON.stringify(library.at(w)),before);
});
test('all89source repeat marks resolve, including joined words and four Hebrew alternatives, while old unit links retain their hashes',()=>{
 let count=0,units=0,joined=0,fourWay=0;
 for(const group of data.groups){
  if(!group.rows.some(r=>Object.values(r.transcriptions).some(c=>c.some(n=>JSON.stringify(n)==='["—"]'))))continue;
  const s=library.study({id:group.readerIds[0],sourceHebrew:group.readerHebrew[0]},'ashkenazic');
  for(const row of s.rows)for(const cells of Object.values(row.styles))for(const c of cells)if(c.sourceReference){
   count++;units+=c.units.length;joined+=group.readerIds.length>1;fourWay+=group.rows[0].hebrew.length===4;
   const first=cells[c.sourceReference.column-1];assert.equal(c.text,first.text);assert.equal(c.wordAlignment.status,'word-aligned');
   assert.deepEqual(c.units.map(u=>u.readerWordId),first.units.map(u=>u.readerWordId));assert.equal(new Set([...first.units,...c.units].map(u=>u.id)).size,first.units.length+c.units.length);
  }
 }
 assert.deepEqual({count,units,joined,fourWay},{count:89,units:351,joined:10,fourWay:2});
 const audit=JSON.parse(read('docs/PRONUNCIATION-WORD-ALIGNMENT.json')),refs=JSON.parse(read('docs/PRONUNCIATION-REPEATS.json'));
 assert.equal(refs.repetitions.length,89);assert.deepEqual(refs.unresolvedRepeats,[]);
 assert.equal(audit.styles.sephardic.baseLiteralAssignmentSha256,'2d11421fcb39794b35f0f98a83768592c1e4a66eb087e366f0c2e225cf743443');
 assert.equal(audit.styles.ashkenazic.baseLiteralAssignmentSha256,'ebf77ef1f99acc56b158c376582cc98820542223db7983901eabaad6a88c90af');
 assert.equal(createHash('sha256').update(read('data/pronunciation/torah-display.json.gz')).digest('hex'),'8172b85f786c127b33aa999c64a69f588601c089e25caebaa72b3ad294663741');
});
test('unqualified, missing, cyclic, other-column and other-style references stay unresolved',()=>{
 const good=fixture([reading('קמץ-ד','bo'),['—']]);assert.equal(good[1].text,'bo');
 for(const values of [[null,['—']],[['bo'],['—']],[['—'],['—']],[reading('קמץ-ד','bo'),['x'],['—']]]){
  const cells=fixture(values),c=cells.at(-1);assert.equal(c.status,'unresolved-repeat');assert.equal(c.sourceReference,null);assert.deepEqual(c.units,[]);assert.equal(c.literalText,'—');
 }
 const noLabel=fixture([reading('קמץ-ד','bo'),['—']],[['אב']]);assert.equal(noLabel[1].status,'unresolved-repeat');
});
test('repeat references leave marked Hebrew, melody events, transposition, tempo and phoneme/time fields independent',()=>{
 const manifest=JSON.parse(read('data/torah/manifest.json')),books=manifest.books.map(b=>JSON.parse(read('data/torah/'+b.file))),corpus=new Corpus({manifest,books});
 const model=createReadingModel(corpus.passage([{id:'a',bookId:'deu',start:{chapter:1,verse:27},end:{chapter:1,verse:27}}]));
 const before=JSON.stringify(model),plan=JSON.stringify(model.buildPlan(0,model.words.length-1,{tempo:72,transpose:2}));
 for(const w of model.words)for(const style of ['sephardic','ashkenazic'])library.study(w,style);
 assert.equal(JSON.stringify(model),before);assert.equal(JSON.stringify(model.buildPlan(0,model.words.length-1,{tempo:72,transpose:2})),plan);
 const s=library.study(model.words[1],'ashkenazic');assert.equal(s.selection.sourceHebrew,'בְאָהֳלֵיכֶם֙');
 assert.ok(s.rows[0].styles.ashkenazic[1].units.every(u=>u.phonemes===null&&u.hebrewClusterRanges===null&&u.noteIds===null&&u.audioTimes===null));
});
