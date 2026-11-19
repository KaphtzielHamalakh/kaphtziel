import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';

const dir=new URL('../data/torah/',import.meta.url);
const manifest=JSON.parse(readFileSync(new URL('manifest.json',dir),'utf8'));
const books=manifest.books.map(b=>JSON.parse(readFileSync(new URL(b.file,dir),'utf8')));
test('all five UXLC books have complete sequential chapter and verse records',()=>{
  assert.deepEqual(books.map(b=>b.name),['Genesis','Exodus','Leviticus','Numbers','Deuteronomy']);
  assert.deepEqual(books.map(b=>b.chapters.length),[50,40,27,36,34]);
  const ids=new Set();let verses=0;
  for(const [i,b] of books.entries()){
    const raw=readFileSync(new URL(manifest.books[i].file,dir));
    assert.equal(createHash('sha256').update(raw).digest('hex'),manifest.books[i].dataSha256);
    assert.deepEqual(b.chapters.map(c=>c.number),Array.from({length:b.chapters.length},(_,i)=>i+1));
    for(const c of b.chapters){
      assert.deepEqual(c.verses.map(v=>v.number),Array.from({length:c.verses.length},(_,i)=>i+1));
      for(const v of c.verses){verses++;assert.ok(v.tokens.length);
        for(const t of v.tokens){assert.ok(!ids.has(t.id));ids.add(t.id);assert.doesNotMatch(t.sourceHebrew,/[A-Za-z]/u);}
      }
    }
  }
  assert.equal(verses,5853); // This edition's source records, not a claim about all verse-count systems.
});
test('ketiv/qere, enlarged letters and editorial notes remain distinct from source Hebrew',()=>{
  const tokens=books.flatMap(b=>b.chapters.flatMap(c=>c.verses.flatMap(v=>v.tokens)));
  assert.ok(tokens.some(t=>t.kind==='k'));assert.ok(tokens.some(t=>t.kind==='q'));
  const shema=books[4].chapters[5].verses[3];
  const enlarged=shema.tokens.filter(t=>t.editorialNotes?.some(n=>n.kind==='letterSize'));
  assert.equal(enlarged.length,2);
  assert.ok(enlarged.some(t=>t.sourceHebrew.includes('ע')));
  assert.ok(enlarged.some(t=>t.sourceHebrew.includes('ד')));
  for(const t of tokens)for(const n of t.editorialNotes||[])assert.ok(n.offset>=0&&n.offset<=t.sourceHebrew.length);
});
