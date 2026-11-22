import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
import {PronunciationLibrary} from '../pronunciation.js';
import {PRONUNCIATION_REPERTOIRE_SUMMARY as summary} from '../pronunciation-repertoire-summary.js';
import {readerPronunciationWord} from '../pronunciation-reader.js';
import {sourceIpaEvidence} from '../pronunciation-ipa.js';
const root=new URL('../',import.meta.url),bytes=p=>readFileSync(new URL(p,root)),book=id=>JSON.parse(gunzipSync(bytes('data/pronunciation/repertoire/'+id+'.json.gz'))),reader=id=>JSON.parse(bytes('data/repertoire/'+id+'.json'));
const words=id=>reader(id).chapters.flatMap(c=>c.verses.flatMap(v=>v.tokens)).filter(t=>t.kind!=='k'&&/[א-ת]/u.test(t.sourceHebrew)),word=id=>words(id.split('-')[0]).find(w=>w.id===id);
const empty={format:'tropetrain-pronunciation-display-v1',revision:5,sourceCommit:summary.sourceCommit,groups:[]};
const make=(loadBook=async id=>book(id))=>new PronunciationLibrary(empty,{repertoire:{books:summary.books,loadBook}});

test('all26 source book files retain exact Git blobs, original AST rows and marked reader IDs',()=>{
 const report=JSON.parse(execFileSync('python3',['-c',String.raw`
from pathlib import Path
import gzip,hashlib,json,zipfile
root=Path.cwd();audit=json.loads((root/'docs/PRONUNCIATION-REPERTOIRE-ALIGNMENT.json').read_text());archive=root/audit['archive'];assert hashlib.sha256(archive.read_bytes()).hexdigest()==audit['archiveSha256'];total=0;rows=0
with zipfile.ZipFile(archive) as z:
 lock=json.loads(z.read('SOURCE-MANIFEST.json'));assert len(lock['files'])==28
 for f in lock['files']:
  raw=z.read(f['filename']);assert len(raw)==f['bytes'] and hashlib.sha256(raw).hexdigest()==f['sha256'] and hashlib.sha1(b'blob '+str(len(raw)).encode()+b'\0'+raw).hexdigest()==f['gitBlob']
 for info in audit['books']:
  bid=info['bookId'];spec=next(f for f in lock['files'] if f['bookId']==bid);src=json.loads(z.read(spec['filename']));original={(c['number'],v['number'],n):r for c in src['chapters'] for v in c['verses'] for n,r in enumerate(v['rows'],1)}
  raw=(root/('data/repertoire/'+bid+'.json')).read_bytes();assert hashlib.sha256(raw).hexdigest()==info['readerSha256'];target=json.loads(raw);marked={w['id']:w['sourceHebrew'] for c in target['chapters'] for v in c['verses'] for w in v['tokens'] if w['kind']!='k'}
  raw=(root/('data/pronunciation/repertoire/'+bid+'.json.gz')).read_bytes();assert hashlib.sha256(raw).hexdigest()==info['packetSha256'];packet=json.loads(gzip.decompress(raw));assert packet['bookId']==bid;seen=set();seen_rows=set()
  for g in packet['groups']:
   assert g['bookId']==bid
   for rid,text in zip(g['readerIds'],g['readerHebrew']):assert rid not in seen and marked[rid]==text;seen.add(rid)
   for row in g['rows']:
    key=(g['displayChapter'],g['displayVerse'],row['number']);assert key not in seen_rows;seen_rows.add(key);assert {k:v for k,v in row.items() if k!='number'}==original[key];rows+=1
  assert len(seen)==info['mappedWords'] and not seen.intersection(info['unmappedReaderIds']);total+=len(seen)
print(json.dumps({'books':len(audit['books']),'mappedWords':total,'rows':rows,'sourceFiles':len(lock['files'])}))
`],{cwd:root,encoding:'utf8',maxBuffer:2048}));
 assert.equal(report.books,26);assert.equal(report.mappedWords,150620);assert.equal(report.sourceFiles,28);assert.equal(report.rows,129400);
});

test('26 additional reader books expose explicit full coverage and1010 unresolved words',()=>{
 assert.equal(summary.books.length,26);assert.equal(summary.readerWords,151630);assert.equal(summary.mappedWords,150620);
 for(const b of summary.books)assert.equal(b.readerWords-b.mappedWords,b.unmappedWords);
 assert.equal(summary.books.reduce((n,b)=>n+b.unmappedWords,0),1010);
});

test('new sources load lazily by canonical word ID and share concurrent book requests',async()=>{
 const calls=[];const library=make(async id=>{calls.push(id);return book(id);}),w=word('isa-42-5-2');
 assert.equal(library.canLoadBook(w),true);assert.equal(library.bookLoaded(w),false);assert.equal(library.at(w),null);assert.deepEqual(calls,[]);
 await Promise.all([library.loadBookFor(w),library.loadBookFor({...w,id:'assigned-occurrence',sourceWordId:w.id})]);
 assert.deepEqual(calls,['isa']);assert.equal(library.bookLoaded(w),true);assert.ok(library.at(w));
 assert.equal(await library.loadBookFor({id:'unknown-1-1-1'}),false);assert.deepEqual(calls,['isa']);
});

test('Isaiah42:5maqaf group retains separate owned units and independent source text styles',async()=>{
 const library=make(),w=word('isa-42-5-2');await library.loadBookFor(w);
 const seph=library.study(w,'sephardic'),ash=library.study(w,'ashkenazic');
 assert.deepEqual(seph.readerIds,['isa-42-5-1','isa-42-5-2']);assert.deepEqual(seph.readerHebrew,['כֹּֽה־','אָמַ֞ר']);
 const a=readerPronunciationWord(w,seph,'sephardic'),b=readerPronunciationWord(w,ash,'ashkenazic');assert.equal(a.status,'word-linked');assert.equal(b.status,'word-linked');
 assert.deepEqual(a.entries.map(e=>e.text),['’a·mar']);assert.deepEqual(b.entries.map(e=>e.text),['’o·mar']);assert.equal(a.entries[0].parts.at(-1).sourceStress,true);
 assert.equal(seph.hebrewUnderlay,undefined);assert.equal(seph.sourceSegments,undefined);
 for(const study of [seph,ash])for(const row of study.rows)for(const cells of Object.values(row.styles))for(const cell of cells)for(const unit of cell.units){assert.equal(unit.hebrewClusterRanges,null);assert.equal(unit.phonemes,null);assert.equal(unit.noteIds,null);assert.equal(unit.audioTimes,null);}
 assert.throws(()=>sourceIpaEvidence(seph,w,'sephardic'),/source category evidence changed/);
});

test('new book correspondence rejects changed accents while repeated assignment occurrences keep canonical source',async()=>{
 const library=make(),w=word('isa-42-5-2');await library.loadBookFor(w);
 assert.throws(()=>library.study({...w,sourceHebrew:w.sourceHebrew.replace('֞','')},'sephardic'),/Hebrew source changed/);
 const repeated={...w,id:'repeated-assignment-word',sourceWordId:w.id},study=library.study(repeated,'ashkenazic');assert.equal(study.selection.occurrenceId,repeated.id);assert.equal(study.selection.sourceWordId,w.id);assert.equal(study.selection.sourceHebrew,w.sourceHebrew);
});

test('all26 lazy libraries retain explicit gaps without substituting neighboring source text',async()=>{
 const library=make(),audit=JSON.parse(bytes('docs/PRONUNCIATION-REPERTOIRE-ALIGNMENT.json'));let gaps=0;
 for(const b of audit.books){const rw=words(b.bookId),first=rw[0];await library.loadBookFor(first);for(const id of b.unmappedReaderIds){assert.equal(library.at(rw.find(w=>w.id===id)),null);gaps++;}}
 assert.equal(gaps,1010);
});

test('each of five cross-book assignment sections can stay loaded in the bounded cache',async()=>{
 const library=make();for(const id of ['isa','jer','ezk','hos','amo'])await library.loadBookFor(words(id)[0]);
 for(const id of ['isa','jer','ezk','hos','amo'])assert.equal(library.bookLoaded(words(id)[0]),true);
 for(const id of ['jos','jdg','kgs1','kgs2'])await library.loadBookFor(words(id)[0]);assert.equal(library.bookLibraries.size,8);
 assert.equal(library.bookLoaded(word('isa-42-5-2')),false);
});

test('failed source load can retry and wrong book/revision/word coverage cannot replace any installed source',async()=>{
 const w=word('isa-42-5-2');let attempts=0;const library=make(async id=>{if(!attempts++)throw Error('offline fixture');return book(id);});
 await assert.rejects(library.loadBookFor(w),/offline fixture/);assert.equal(library.bookLoaded(w),false);await library.loadBookFor(w);assert.ok(library.at(w));
 for(const mutate of [d=>{d.bookId='jer';},d=>{d.sourceCommit='changed';},d=>{d.groups.pop();},d=>{d.groups[0].readerIds[0]='jer-1-1-1';}]){
  const bad=make(async id=>{const d=book(id);mutate(d);return d;});await assert.rejects(bad.loadBookFor(w),/source identity changed/);assert.equal(bad.bookLibraries.size,0);
 }
});

test('Torah source packet and computed pronunciation facts remain separate from new display-only books',async()=>{
 const d=JSON.parse(gunzipSync(bytes('data/pronunciation/torah-display.json.gz'))),library=new PronunciationLibrary(d,{repertoire:{books:summary.books,loadBook:async id=>book(id)}}),w=word('isa-42-5-2');
 const before=library.groups;assert.equal(library.byWord.size,79985);await library.loadBookFor(w);assert.strictEqual(library.groups,before);assert.equal(library.byWord.size,79985);assert.ok(library.study(w,'sephardic'));
});

test('normal and portable builds embed every new book and retain original source archive and audit',()=>{
 const bundle=bytes('app.bundle.js').toString(),portable=bytes('TropeTrain.html').toString(),normal=bytes('index.html').toString();
 for(const b of summary.books){const encoded=bytes('data/pronunciation/repertoire/'+b.bookId+'.json.gz').toString('base64');assert.ok(bundle.includes(encoded),b.bookId);assert.ok(portable.includes(encoded),b.bookId);}
 assert.ok(portable.includes(bytes('assets/pronunciation/phonetic-mam-repertoire-sources.zip').toString('base64')));assert.ok(portable.includes(bytes('docs/PRONUNCIATION-REPERTOIRE-ALIGNMENT.json').toString('base64')));assert.ok(normal.includes('id="pronunciation-retry"'));
 assert.ok(portable.length<100*1024*1024,'Portable artifact remains publishable within GitHub single-file size limit.');
});
