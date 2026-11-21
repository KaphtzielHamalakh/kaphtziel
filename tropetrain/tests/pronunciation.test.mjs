import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
import {PronunciationLibrary,PRONUNCIATION_STYLES,pronunciationStyle,inlineSourceText} from '../pronunciation.js';
import {Corpus} from '../library.js';
import {createReadingModel} from '../music.js';
const bytes=name=>readFileSync(new URL('../'+name,import.meta.url));
const json=name=>JSON.parse(bytes(name));
const data=JSON.parse(gunzipSync(bytes('data/pronunciation/torah-display.json.gz'))),library=new PronunciationLibrary(data);
const manifest=json('data/torah/manifest.json'),books=manifest.books.map(b=>json('data/torah/'+b.file)),corpus=new Corpus({manifest,books});
const tokens=new Map(books.flatMap(b=>b.chapters.flatMap(c=>c.verses.flatMap(v=>v.tokens.map(t=>[t.id,t])))));
const group=rid=>library.at(tokens.get(rid));
const text=(g,style)=>g.rows.flatMap(r=>r.transcriptions[style].map(inlineSourceText));

test('every mapped row and marked reader word matches the pinned original, with no duplicates or cross-order joins',()=>{
 const result=JSON.parse(execFileSync('python3',[new URL('../scripts/audit-pronunciation.py',import.meta.url).pathname],{encoding:'utf8'}));
 assert.equal(result.sourceBytes,14992105);assert.equal(result.mappedWords,77756);assert.equal(result.unassignedWords,2229);
 assert.ok(result.exactOriginalRows>66000);assert.ok(result.manyWordGroups>10000);
});
test('independent source styles preserve original stress strings, exact Hebrew, syllables and instrument events',()=>{
 const p=corpus.passage([{id:'test',bookId:'gen',start:{chapter:1,verse:1},end:{chapter:1,verse:1}}]);
 const model=createReadingModel(p),before=JSON.stringify(model);
 const g=group('gen-1-1-2');assert.deepEqual(g.readerHebrew,['בָּרָ֣א']);
 assert.deepEqual(text(g,'sephardic'),['ba·ra']);assert.deepEqual(text(g,'ashkenazic'),['bo·ro']);
 assert.equal(g.rows[0].transcriptions.sephardic[0][1].kind,'stressed');
 for(const style of PRONUNCIATION_STYLES)for(const word of model.words)text(library.at(word),style.id);
 assert.equal(JSON.stringify(model),before);assert.equal(model.pronunciationId,undefined);
 assert.equal(pronunciationStyle('unsupported'),'sephardic');
 assert.deepEqual(PRONUNCIATION_STYLES.map(s=>s.id),['sephardic','ashkenazic']);
});
test('explicit reading forms and many-word groups retain both source texts and never allocate invented syllables',()=>{
 const g=group('deu-32-6-1');assert.equal(group('deu-32-6-2'),g);
 assert.deepEqual(g.readerHebrew,['הֲ־','לַיְהוָה֙']);assert.equal(inlineSourceText(g.rows[0].hebrew[0]),'הַלְאֲדֹנָי֙');
 assert.ok(g.flags.includes('documented-reading-form'));assert.ok(g.flags.includes('source-group'));
 assert.equal(g.phonemes,undefined);assert.equal(g.syllables,undefined);assert.equal(g.audio,undefined);
 assert.equal(group('gen-8-20-8'),null);
 const h=group('num-12-9-1');assert.deepEqual(h.readerHebrew,['וַיִּֽחַרְאַ֧ף']);assert.equal(inlineSourceText(h.rows[0].hebrew[0]),'וַיִּֽחַר־אַ֧ף');
});
test('alternate qamats readings, missing style cell and source column positions remain literal',()=>{
 const row=group('deu-1-27-2').rows[0];
 assert.equal(row.hebrew.length,2);assert.deepEqual(row.hebrew.map(c=>c[0].label),['קמץ-ד','קמץ-ס']);
 assert.equal(row.transcriptions.sephardic.length,2);assert.equal(row.transcriptions.ashkenazic.length,2);
 assert.deepEqual(row.transcriptions.ashkenazic[1],['—']);
 assert.notDeepEqual(row.transcriptions.sephardic[0],row.transcriptions.sephardic[1]);
 assert.ok(data.groups.some(g=>g.rows.some(r=>r.hebrew.includes(null)||Object.values(r.transcriptions).some(c=>c.includes(null)))));
});
test('source display verse namespaces, assignment occurrences and changed-text refusal are explicit',()=>{
 const g=group('exo-20-26-1');assert.equal(g.displayVerse,22);assert.equal(g.displayChapter,20);
 const d=group('deu-5-33-1');assert.equal(d.displayVerse,29);
 const word=tokens.get('gen-1-1-2');assert.equal(library.at({...word,id:word.id+'@repeat',sourceWordId:word.id}),group(word.id));
 assert.throws(()=>library.at({...word,sourceHebrew:word.sourceHebrew+'֑'}),/Hebrew source changed/);
 assert.equal(library.at({id:'unknown',sourceHebrew:'א'}),null);
 assert.throws(()=>new PronunciationLibrary({...data,groups:[data.groups[0],data.groups[0]]}),/Overlapping/);
});
test('source originals, provenance and correspondence survive both distributions losslessly',()=>{
 const html=bytes('TropeTrain.html').toString(),bundle=bytes('app.bundle.js').toString();
 assert.ok(html.includes(bytes('data/pronunciation/torah-display.json.gz').toString('base64')));
 assert.ok(bundle.includes(bytes('data/pronunciation/torah-display.json.gz').toString('base64')));
 for(const name of ['assets/pronunciation/phonetic-mam-torah-sources.zip','docs/PRONUNCIATION-ALIGNMENT.json'])assert.ok(html.includes(bytes(name).toString('base64')));
 assert.ok(html.includes('id="pronunciation-notices"'));assert.ok(html.includes('Hebrew Wikisource'));
 assert.doesNotMatch(html,/href="\.\/(?:assets\/pronunciation|docs\/PRONUNCIATION-ALIGNMENT)/);
});
test('comparison alternatives refuse masculine hu, unexpected spelling and unbounded row partitions',()=>{
 const result=execFileSync('python3',['-c',`import importlib.util
spec=importlib.util.spec_from_file_location('join', '${new URL('../scripts/import-pronunciation.py',import.meta.url).pathname}')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
assert m.reader_alternatives({'sourceHebrew':'ה֖וּא'})=={'הוא'}
assert m.reader_alternatives({'sourceHebrew':'הִ֖וא'})=={'הוא','היא'}
assert m.reader_alternatives({'sourceHebrew':'הִנֵּ֥ה הוּא'})=={'הנההוא'}
assert m.reader_alternatives({'sourceHebrew':'יְהוָ֥ה'})=={'יהוה','אדני','אלהים'}
assert m.reader_alternatives({'sourceHebrew':'יִשָּׂשכָ֖ר'})=={'יששכר','ישכר'}
rows=[(0,{'hebrew':[['היא']]},'היא',['היא'])]
assert m.join_groups(rows,[{'id':'test','sourceHebrew':'ה֖וּא'}]) is None
assert m.join_groups(rows,[{'id':'test','sourceHebrew':'הִ֖וא'}]) is not None
assert m.join_groups([(0,{'hebrew':[['הטהרה']]},'הטהרה',['הטהרה'])],[{'id':'test','sourceHebrew':'הַטְּהוֹרָ֑ה'}]) is None
print('ok')`],{encoding:'utf8'});assert.equal(result.trim(),'ok');
});
