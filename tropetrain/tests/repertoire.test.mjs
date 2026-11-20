import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {gunzipSync} from 'node:zlib';
import {getCorpus,createAssignment} from '../library.js';
import {getRepertoireCorpus,writtenReadingGroups,validateReadingSections,createRepertoireAssignment,parseRepertoireAssignment} from '../repertoire.js';
import {createReadingModel} from '../music.js';
import {PRINTED_SCORE} from '../printed-score.js';
import {ReferenceLibrary} from '../reference-library.js';

const corpus=await getRepertoireCorpus(),torah=await getCorpus();
const directory=new URL('../data/repertoire/',import.meta.url);
const manifest=JSON.parse(readFileSync(new URL('manifest.json',directory),'utf8'));
const audit=JSON.parse(readFileSync(new URL('../docs/REPERTOIRE-AUDIT.json',import.meta.url),'utf8'));
const sources=JSON.parse(readFileSync(new URL('../docs/REPERTOIRE-SOURCES.json',import.meta.url),'utf8'));
const extra=corpus.books.filter(b=>!torah.byId.has(b.id));
const range=(bookId,c,v,endC=c,endV=v,id='one')=>({id,bookId,start:{chapter:c,verse:v},end:{chapter:endC,verse:endV}});
const whole=b=>range(b.id,1,1,b.chapters.at(-1).number,b.chapters.at(-1).verses.at(-1).number);
const verse=(id,c,v)=>corpus.byId.get(id).chapters[c-1].verses[v-1];

test('the added library has exactly 21 Prophets and five Megillot with pinned data and complete boundaries',()=>{
  assert.equal(extra.length,26);assert.equal(corpus.books.length,31);assert.equal(torah.books.length,5);
  assert.equal(extra.filter(b=>b.repertoire==='prophets').length,21);
  assert.equal(extra.filter(b=>b.repertoire==='megillot').length,5);
  let chapters=0,verses=0,reading=0;const ids=new Set();
  for(const [i,b] of extra.entries()){
    const m=manifest.books[i];assert.equal(b.id,m.id);
    assert.equal(createHash('sha256').update(readFileSync(new URL(m.file,directory))).digest('hex'),m.dataSha256);
    assert.deepEqual(b.chapters.map(c=>c.number),Array.from({length:b.chapters.length},(_,i)=>i+1));
    assert.deepEqual(b.chapters.map(c=>c.verses.length),m.chapterVerseCounts);
    assert.equal(b.sourceSha256,m.sourceSha256);chapters+=b.chapters.length;
    assert.ok(sources.verifiedXml.some(s=>s.sha256===b.sourceSha256&&s.url===b.sourceUrl&&s.directMatchesArchive===true));
    const sequence=createHash('sha256');
    const counts={};
    for(const c of b.chapters){
      assert.deepEqual(c.verses.map(v=>v.number),Array.from({length:c.verses.length},(_,i)=>i+1));
      for(const v of c.verses){verses++;
        for(const [i,t] of v.tokens.entries()){
          assert.equal(t.id,`${b.id}-${c.number}-${v.number}-${i+1}`);
          sequence.update(JSON.stringify([t.id,t.kind,t.sourceHebrew])+'\n');
          assert.ok(!ids.has(t.id));ids.add(t.id);
          assert.doesNotMatch(t.sourceHebrew,/[A-Za-z]/u);
          counts[t.kind]=(counts[t.kind]??0)+1;if(t.kind!=='k')reading++;
          for(const n of t.editorialNotes??[])assert.ok(n.offset>=0&&n.offset<=t.sourceHebrew.length);
        }
        for(const marker of v.markers){counts[marker.kind]=(counts[marker.kind]??0)+1;assert.ok(marker.afterToken>=0&&marker.afterToken<=v.tokens.length);}
      }
    }
    assert.deepEqual(counts,m.tokenKinds);
    assert.equal(sequence.digest('hex'),audit.books.find(r=>r.bookId===b.id).exactDomTextAndIdSha256);
  }
  assert.equal(chapters,419);assert.equal(verses,10041);assert.equal(reading,151630);
  for(const b of torah.books)assert.equal(corpus.byId.get(b.id),b,'The original Torah data is reused, not reimported.');
  assert.equal(torah.byId.has('isa'),false);
});

test('first/final verses and ordered cross-book occurrences retain source text and stable IDs',()=>{
  for(const b of extra){
    const c=b.chapters.at(-1),v=c.verses.at(-1);
    for(const [chapter,verseNumber] of [[1,1],[c.number,v.number]]){
      const p=corpus.passage([range(b.id,chapter,verseNumber)]);
      assert.equal(p.verses.length,1);assert.equal(p.verses[0].reference,`${b.name} ${chapter}:${verseNumber}`);
      assert.deepEqual(p.verses[0].sourceTokens,verse(b.id,chapter,verseNumber).tokens);
    }
  }
  const p=corpus.passage([range('isa',40,1,40,2,'a'),range('mic',7,18,7,20,'b'),range('isa',40,1,40,1,'again')]);
  assert.deepEqual(p.verses.map(v=>v.reference),['Isaiah 40:1','Isaiah 40:2','Micah 7:18','Micah 7:19','Micah 7:20','Isaiah 40:1']);
  const first=p.verses[0].words,last=p.verses.at(-1).words;
  assert.deepEqual(first.map(w=>w.sourceWordId),last.map(w=>w.sourceWordId));
  assert.ok(first.every(w=>w.id.endsWith('@a')));assert.ok(last.every(w=>w.id.endsWith('@again')));
  assert.equal(new Set(p.verses.flatMap(v=>v.words.map(w=>w.id))).size,p.verses.reduce((n,v)=>n+v.words.length,0));
});

test('all written-only, reading-only and unequal k/q runs survive without invented alignment',()=>{
  let writtenOnly=0,readingOnly=0,unequal=0;
  for(const b of extra)for(const c of b.chapters)for(const v of c.verses){
    const groups=writtenReadingGroups(v.tokens);
    const expectedWritten=v.tokens.filter(t=>t.kind!=='q');
    const expectedReading=v.tokens.filter(t=>t.kind!=='k');
    assert.deepEqual(groups.flatMap(g=>g.written),expectedWritten);
    assert.deepEqual(groups.flatMap(g=>g.reading),expectedReading);
    writtenOnly+=groups.filter(g=>g.status==='written-only').length;
    readingOnly+=groups.filter(g=>g.status==='reading-only').length;
    unequal+=groups.filter(g=>g.written.length&&g.reading.length&&g.written.length!==g.reading.length).length;
  }
  assert.equal(writtenOnly,8);assert.equal(readingOnly,9);assert.equal(unequal,14);
  const written=writtenReadingGroups(verse('sam2',13,33).tokens).find(g=>g.status==='written-only');
  assert.equal(written.written[0].sourceHebrew,'אִם־');assert.deepEqual(written.reading,[]);
  const read=writtenReadingGroups(verse('jdg',20,13).tokens).find(g=>g.status==='reading-only');
  assert.equal(read.reading[0].sourceHebrew,'בְנֵ֣י');assert.deepEqual(read.written,[]);
  assert.deepEqual(read.reading[0].editorialNotes,[{kind:'editorialCode',offset:1,code:'q'}]);
  assert.throws(()=>writtenReadingGroups([{kind:'unknown'}]),/not inferred/);
});

test('suspended/small source letters and editorial offsets are not converted into ordinary text',()=>{
  const suspended=verse('jdg',18,30).tokens.find(t=>t.id==='jdg-18-30-11');
  assert.equal(suspended.sourceHebrew,'מְנַשֶּׁ֜ה');
  assert.deepEqual(suspended.editorialNotes,[{kind:'letterSize',offset:2,length:2,size:'suspended'},{kind:'editorialCode',offset:4,code:'7'}]);
  const small=verse('isa',44,14).tokens.find(t=>t.id==='isa-44-14-12');
  assert.equal(small.sourceHebrew,'אֹ֖רֶן');assert.equal(small.editorialNotes[0].size,'small');
  assert.equal(small.sourceHebrew.slice(5,6),'ן');
  const other=verse('jer',39,13).tokens.find(t=>t.id==='jer-39-13-5');
  assert.equal(other.editorialNotes[0].size,'small');assert.equal(other.sourceHebrew.slice(16,18),'ן֙');
});

test('the full additional library preserves Hebrew and null phonemes through demonstration alignment',()=>{
  let count=0,unresolved=0;
  for(const b of extra){
    const p=corpus.passage([whole(b)]),model=createReadingModel(p),source=p.verses.flatMap(v=>v.words);
    assert.equal(model.words.length,source.length);const eventWords=new Set(model.events.map(e=>e.wordId));
    assert.equal(eventWords.size,model.words.length);
    for(const [i,w] of model.words.entries()){
      assert.equal(w.sourceHebrew,source[i].sourceHebrew);assert.equal(w.sourceWordId,source[i].sourceWordId);
      assert.equal(w.syllables.map(s=>s.sourceHebrew).join(''),w.sourceHebrew);
      assert.ok(w.syllables.every(s=>s.phonemes===null));count++;if(w.analysisStatus==='unsegmented')unresolved++;
    }
    const last=model.words.length-1,base=model.buildPlan(last,last,{tempo:60,transpose:0}),shift=model.buildPlan(last,last,{tempo:90,transpose:3});
    assert.equal(base.length,shift.length);
    for(const [i,e] of shift.entries()){
      assert.equal(e.midi,base[i].midi+3);assert.equal(e.syllable,base[i].syllable);
      assert.ok(Math.abs(e.durationSeconds-base[i].durationSeconds*2/3)<1e-12);assert.equal(e.phonemes,null);
    }
  }
  assert.equal(count,151630);console.log(`Added-repertoire alignment: ${count} exact reading words; ${unresolved} explicitly unresolved drafts. No phonetic/musical review inferred.`);
});

test('bounded printed music and the Torah recording library refuse uncovered repertoire',async()=>{
  const p=corpus.passage([range('isa',40,1)]),model=createReadingModel(p,{melodyId:PRINTED_SCORE.id});
  assert.equal(model.events.length,0);assert.throws(()=>model.buildPlan(0,0),/No notes are substituted/);
  const packed=JSON.parse(gunzipSync(readFileSync(new URL('../data/references/torah-library.json.gz',import.meta.url))));
  const reference=new ReferenceLibrary(packed);assert.equal(reference.at(model.words[0]),undefined);
  assert.throws(()=>reference.selection(model.words,0,0),/No recorded reference/);
});

test('haftarah assignments preserve five discontinuous sections across books and their independent settings',()=>{
  const sections=[range('hos',14,2,14,10,'a'),range('mic',7,18,7,20,'b'),range('jol',2,15,2,27,'c'),range('isa',40,1,40,1,'d'),{...range('isa',40,1,40,1,'e'),hidden:true}];
  const assignment=createRepertoireAssignment('Tutor haftarah','haftarah',sections,{melodyId:PRINTED_SCORE.id,view:'parallel',tempo:45,transpose:8,rangeMin:48,rangeMax:72},corpus);
  assert.equal(assignment.format,'tropetrain-assignment-v2');assert.equal(assignment.readingType,'haftarah');
  assert.deepEqual(assignment.sections.map(r=>r.bookId),['hos','mic','jol','isa','isa']);
  assert.equal(assignment.sections[4].hidden,true);
  assert.equal(assignment.musicalPreferences.melodyId,PRINTED_SCORE.id);assert.equal(assignment.musicalPreferences.pronunciationId,null);
  assert.deepEqual(parseRepertoireAssignment(JSON.stringify(assignment),corpus),assignment);
  assert.equal(assignment.displayPreferences.view,'parallel');
  for(const key of ['tempo','transpose','rangeMin','rangeMax']){
    assert.ok(!(key in assignment));assert.ok(!(key in assignment.musicalPreferences));assert.ok(!(key in assignment.displayPreferences));
  }
  assert.throws(()=>validateReadingSections('haftarah',[...sections,range('jon',1,1,1,1,'six')],corpus),/between 1 and 5/);
  assert.throws(()=>validateReadingSections('haftarah',[range('gen',1,1)],corpus),/outside/);
  assert.throws(()=>validateReadingSections('haftarah',sections.map(r=>({...r,hidden:true})),corpus),/Show at least one/);
});

test('Megillah assignments retain two ordered sections; invalid type, books and duplicate IDs are refused',()=>{
  const sections=[range('est',1,1,1,2,'a'),range('est',10,3,10,3,'b')];
  const assignment=createRepertoireAssignment('Esther excerpt','megillah',sections,{},corpus);
  assert.equal(assignment.sections.length,2);assert.equal(assignment.readingType,'megillah');
  assert.throws(()=>validateReadingSections('megillah',[...sections,range('rut',1,1,1,1,'c')],corpus),/between 1 and 2/);
  assert.throws(()=>validateReadingSections('megillah',[range('isa',1,1)],corpus),/outside/);
  assert.throws(()=>validateReadingSections('torah',[range('est',1,1)],corpus),/outside/);
  assert.throws(()=>validateReadingSections('unverified-style',sections,corpus),/reading type/);
  assert.throws(()=>validateReadingSections('megillah',[sections[0],{...sections[1],id:'a'}],corpus),/identifiers must be unique/);
});

test('legacy Torah assignments remain compatible and unknown musical/phonetic requests are never replaced',()=>{
  const legacy=createAssignment('Legacy Torah',[range('deu',6,4)],{melodyId:'original-demo-01'});
  const parsed=parseRepertoireAssignment(JSON.stringify(legacy),corpus);
  assert.equal(parsed.format,'tropetrain-assignment-v1');assert.equal(parsed.readingType,'torah');
  const invalid={...legacy,sections:[range('isa',40,1)]};
  assert.throws(()=>parseRepertoireAssignment(JSON.stringify(invalid),corpus),/outside/);
  for(const preferences of [{melodyId:'historical-label-only'},{pronunciationId:'unimplemented-pronunciation'}])
    assert.throws(()=>createRepertoireAssignment('Refuse unavailable','haftarah',[range('isa',40,1)],preferences,corpus),/not yet implemented/);
  assert.throws(()=>parseRepertoireAssignment('{',corpus),/not valid/);
  assert.throws(()=>parseRepertoireAssignment(JSON.stringify({format:'tropetrain-assignment-v3'}),corpus),/Unsupported/);
});

test('source importer keeps combining order/notes and refuses unfamiliar XML instead of silently dropping it',()=>{
  const code=`import importlib.util,xml.etree.ElementTree as E
spec=importlib.util.spec_from_file_location('repertoire_import','scripts/import-repertoire.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
text,notes=m.word_text(E.fromstring('<w>ב\u034f\u05b0<s t="small">ר\u05b5</s><x>q</x>א</w>'))
assert text=='ב\u034f\u05b0ר\u05b5א'
assert notes==[{'kind':'letterSize','offset':3,'length':2,'size':'small'},{'kind':'editorialCode','offset':5,'code':'q'}]
try:m.word_text(E.fromstring('<w>א<unknown>ב</unknown></w>'))
except ValueError:pass
else:raise AssertionError('Unknown markup was dropped')
`;
  execFileSync('python3',['-B','-c',code],{cwd:new URL('../',import.meta.url)});
});
