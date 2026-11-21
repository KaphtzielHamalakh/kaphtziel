import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
import {PronunciationLibrary} from '../pronunciation.js';
import {sourcePronunciationStudy} from '../pronunciation-structure.js';
import {readerLetterForms,literalReaderWordPaths} from '../pronunciation-word-alignment.js';
import {Corpus} from '../library.js';
import {createReadingModel} from '../music.js';
const read=f=>readFileSync(new URL('../'+f,import.meta.url));
const data=JSON.parse(gunzipSync(read('data/pronunciation/torah-display.json.gz'))),library=new PronunciationLibrary(data);
const word=id=>{const g=library.byWord.get(id).group;return {id,sourceHebrew:g.readerHebrew[g.readerIds.indexOf(id)]};};
const study=(id,style='sephardic')=>library.study(word(id),style);
const cell=(s,style='sephardic')=>s.rows[0].styles[style][0];
function fixture({hebrew=[['אב־גד']],sephardic=[['a-b']],ashkenazic=[['a-b']],reader=['אב','גד'],rows}={}){
 const group={id:'test',readerIds:reader.map((_,i)=>'test-'+i),readerHebrew:reader,rows:rows??[{number:1,hebrew,transcriptions:{sephardic,ashkenazic}}]};
 return sourcePronunciationStudy(group,{sourceCommit:'test',word:{id:group.readerIds[0],sourceHebrew:reader[0]},style:'sephardic'});
}

test('joined source syllables link to exact reader words in both styles without renaming units or losing source marks',()=>{
 const a=study('gen-1-2-6'),b=study('gen-1-2-7','ashkenazic');
 assert.equal(a.revision,3);assert.equal(a.alignmentScope,'source-word-boundaries');
 assert.deepEqual(cell(a).units.map(u=>[u.text,u.readerWordId]),[['‘al','gen-1-2-6'],['pᵉ','gen-1-2-7'],['né','gen-1-2-7']]);
 assert.equal(cell(a).units[1].id,'pmam-gen-1-2-6-sephardic-r6-c1-u2');
 assert.deepEqual(a.rows,b.rows);assert.deepEqual(a.sourceGroup,b.sourceGroup);
 assert.deepEqual(cell(a).wordSegments.map(p=>[p.start,p.end,p.sourceForms[0].text]),[[0,3,'עַל'],[4,10,'פְּנֵ֣י']]);
 assert.ok(cell(a).units.every(u=>u.phonemes===null&&u.hebrewClusterRanges===null&&u.audioTimes===null&&u.noteIds===null));
});
test('a clear word in a partly combined name is linked while the combined name and Deut32:6 stay unsplit',()=>{
 const s=study('gen-14-17-8');assert.equal(s.alignmentScope,'partial-source-word-boundaries');
 assert.equal(cell(s).units[0].readerWordId,'gen-14-17-8');assert.ok(cell(s).units.slice(1).every(u=>u.readerWordId===null));
 assert.deepEqual(cell(s).wordSegments[1].readerIds,['gen-14-17-9','gen-14-17-10']);
 const d=study('deu-32-6-1');assert.equal(d.alignmentScope,'complete-reader-group');assert.ok(cell(d).units.every(u=>u.readerWordId===null));
 assert.deepEqual(cell(d).wordSegments[0].readerIds,['deu-32-6-1','deu-32-6-2']);
 const n=study('num-12-9-1');assert.ok(cell(n).units.every(u=>u.readerWordId==='num-12-9-1'));assert.equal(cell(n).wordSegments.length,2);
});
test('documented qere letter forms stay independent of pronunciation and never rewrite the marked reader text',()=>{
 const s=study('gen-4-1-13');assert.equal(s.alignmentScope,'source-word-boundaries');
 assert.deepEqual(s.readerHebrew,['אֶת־','יְהוָֽה׃']);assert.equal(cell(s).wordSegments[1].sourceForms[0].text,'אֲדֹנָֽי׃');
 assert.ok(cell(s).units.slice(1).every(u=>u.readerWordId==='gen-4-1-14'));
 assert.deepEqual(readerLetterForms('ה֖וּא'),['הוא']);assert.deepEqual(readerLetterForms('הִ֖וא'),['הוא','היא']);
 assert.deepEqual(readerLetterForms('לַיהוָ֑ה'),['ליהוה','לאדני','לאלהים']);
 assert.deepEqual(readerLetterForms('יִשָּׂשכָ֖ר'),['יששכר','ישכר']);assert.deepEqual(readerLetterForms('כִּי הוּא'),['כיהוא']);
});
test('conflicting readings, missing joins and letter mismatches refuse guesses without coupling the styles',()=>{
 const split=fixture({ashkenazic:[['a·b']]});
 assert.equal(split.wordAlignment.styles.sephardic.status,'word-aligned');assert.equal(split.wordAlignment.styles.ashkenazic.status,'group-only');
 assert.ok(cell(split,'ashkenazic').units.every(u=>u.readerWordId===null));
 assert.equal(cell(split,'ashkenazic').wordAlignment.reason,'transcription-boundaries-differ');
 const different=fixture({hebrew:[['אב־גד'],['אבגד']]});assert.ok(cell(different).units.every(u=>u.readerWordId===null));
 assert.equal(cell(different).wordAlignment.reason,'source-Hebrew-boundaries-differ');
 const mismatch=fixture({hebrew:[['אב־גה']]});assert.equal(cell(mismatch).wordAlignment.reason,'source-reading-word-difference');
 const alternatives=fixture({hebrew:[['אב־גד'],['אבג־ד']]});
 assert.equal(cell(alternatives).units[0].readerWordId,null);assert.equal(cell(alternatives).units[1].readerWordId,'test-1');
 const missing=fixture({ashkenazic:[null,['—']]});assert.equal(missing.rows[0].styles.ashkenazic[0].status,'missing');assert.equal(missing.rows[0].styles.ashkenazic[1].status,'unresolved-repeat');
 const rows=[{number:1,hebrew:[['אב']],transcriptions:{sephardic:[['a']],ashkenazic:[['a']]}},{number:2,hebrew:[['גד']],transcriptions:{sephardic:[['b']],ashkenazic:[['b']]}}];
 const multi=fixture({rows});assert.deepEqual(multi.rows.map(r=>r.styles.sephardic[0].units[0].readerWordId),['test-0','test-1']);
});
test('all exact letter paths and ambiguous cuts match independent literal enumeration',()=>{
 const choices=[['א'],['ב'],['א','ב'],['א','אב'],['בא','א']];let cases=0;
 for(const a of choices)for(const b of choices)for(let length=1;length<=4;length++)for(let bits=0;bits<2**length;bits++){
  const source=Array.from({length},(_,i)=>bits>>i&1?'א':'ב').join('');
  const paths=[];for(const x of a)for(const y of b)if(x+y===source)paths.push([{word:0,start:0,end:x.length,form:x},{word:1,start:x.length,end:source.length,form:y}]);
  const result=literalReaderWordPaths(source,[a,b]);assert.equal(result.paths,String(paths.length));
  const stable=xs=>[...new Set(xs.map(x=>JSON.stringify(x)))].sort();assert.deepEqual(stable(result.edges),stable(paths.flat()));cases++;
 }
 assert.equal(cases,750);assert.equal(literalReaderWordPaths('אבא',[['א','אב'],['בא','א']]).paths,'2');
});
test('independent full-corpus enumeration reproduces every unit-word assignment and both style coverage hashes',()=>{
 const independent=JSON.parse(execFileSync('python3',[new URL('../scripts/audit-pronunciation-word-alignment.py',import.meta.url).pathname],{encoding:'utf8'}));
 const audit=JSON.parse(read('docs/PRONUNCIATION-WORD-ALIGNMENT.json'));
 assert.deepEqual(independent.styles,audit.styles);assert.equal(audit.exceptions.length,7);
 for(const s of Object.values(audit.styles)){assert.equal(s.joinedGroupsAligned,11051);assert.equal(s.joinedGroupsPartial,6);assert.equal(s.joinedGroupsUnsplit,1);assert.equal(s.wordsWithUnits,79829);assert.equal(s.groupOnlyUnits,26);}
 assert.ok(independent.enumeratedReaderChoices>11051);assert.ok(independent.maximumReaderChoices>=3);
});
test('word ownership follows source IDs in repeated assignments while Hebrew, events and controls stay untouched',()=>{
 const manifest=JSON.parse(read('data/torah/manifest.json')),books=manifest.books.map(b=>JSON.parse(read('data/torah/'+b.file))),corpus=new Corpus({manifest,books});
 const model=createReadingModel(corpus.passage([{id:'a',bookId:'gen',start:{chapter:1,verse:2},end:{chapter:1,verse:2}}]));
 const before=JSON.stringify(model),plan=JSON.stringify(model.buildPlan(5,6,{tempo:63,transpose:4}));
 for(const w of model.words)for(const style of ['sephardic','ashkenazic'])library.study(w,style);
 assert.equal(JSON.stringify(model),before);assert.equal(JSON.stringify(model.buildPlan(5,6,{tempo:63,transpose:4})),plan);
 const w=word('gen-1-2-7'),repeat=library.study({...w,id:w.id+'@repeat',sourceWordId:w.id},'ashkenazic');
 assert.equal(repeat.selection.occurrenceId,w.id+'@repeat');assert.equal(cell(repeat).units[1].readerWordId,w.id);
 assert.deepEqual(JSON.parse(JSON.stringify(repeat)).sourceGroup,library.at(w));
});
