import test from 'node:test';import assert from 'node:assert/strict';import{readFileSync}from'node:fs';import{gunzipSync}from'node:zlib';import{createHash}from'node:crypto';import{execFileSync}from'node:child_process';
import {PronunciationLibrary} from '../pronunciation.js';import {sourcePronunciationStudy} from '../pronunciation-structure.js';import {groupReaderLetterForms} from '../pronunciation-word-alignment.js';import {readerPronunciationWord} from '../pronunciation-reader.js';import{getCorpus}from'../library.js';import{createReadingModel}from'../music.js';import{linkPronunciationToNotes}from'../pronunciation-note-links.js';
const raw=f=>readFileSync(new URL('../'+f,import.meta.url)),json=f=>JSON.parse(raw(f)),data=JSON.parse(gunzipSync(raw('data/pronunciation/torah-display.json.gz'))),underlay=JSON.parse(gunzipSync(raw('data/pronunciation/torah-underlay.json.gz'))),lib=new PronunciationLibrary(data,{underlay}),record=json('docs/PRONUNCIATION-WRITTEN-VARIANTS.json');
const word=id=>{const hit=lib.byWord.get(id);return{id,sourceHebrew:hit.group.readerHebrew[hit.index]};};
const study=(id,style='sephardic')=>lib.study(word(id),style);
const stable=value=>JSON.stringify(value,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a<b?-1:a>b?1:0)):v);

test('all thirty variant groups retain original source rows and explicit UXLC pairs between two unchanged anchors',()=>{
 assert.equal(data.revision,5);assert.equal(record.addedGroups,30);assert.equal(record.addedWords,37);assert.equal(record.baseGroups,68354);
 const byId=new Map(data.groups.map(g=>[g.id,g]));let pairs=0;
 for(const entry of record.entries){
  const group=byId.get(entry.groupId);assert.deepEqual(group.readerHebrew,entry.readerHebrew);assert.deepEqual(group.writtenReadVariants,entry.writtenReadVariants);assert.deepEqual(group.rows[0].hebrew,entry.sourceHebrew);
  const bookBytes=raw('data/torah/'+entry.bookId+'.json');assert.equal(createHash('sha256').update(bookBytes).digest('hex'),entry.readerBookSha256);
  const book=JSON.parse(bookBytes),chapter=book.chapters.find(c=>c.number===entry.displayChapter),verse=chapter.verses.find(v=>v.number===entry.displayVerse);
  for(const pair of entry.writtenReadVariants){
   const i=verse.tokens.findIndex(t=>t.id===pair.readerWordId);assert.ok(i>0);assert.equal(verse.tokens[i].kind,'q');assert.equal(verse.tokens[i-1].kind,'k');assert.equal(verse.tokens[i-1].id,pair.writtenTokenId);assert.equal(verse.tokens[i-1].sourceHebrew,pair.writtenHebrew);assert.equal(verse.tokens[i].sourceHebrew,pair.readerHebrew);assert.notEqual(verse.tokens[i-2]?.kind,'k');assert.notEqual(verse.tokens[i+1]?.kind,'q');pairs++;
  }
  for(const id of [entry.anchors.beforeGroup,entry.anchors.afterGroup]){assert.ok(byId.has(id));assert.equal(byId.get(id).writtenReadVariants,undefined);}
 }
 assert.equal(pairs,30);
 // The independent audit checks every source byte/column, explicit token pair,
 // old group digest, all anchors and all142remaining unassigned words.
 const result=JSON.parse(execFileSync('python3',[new URL('../scripts/audit-pronunciation.py',import.meta.url).pathname],{encoding:'utf8'}));assert.equal(result.mappedWords,79985);assert.equal(result.unassignedWords,0);
});
test('written qere forms retain both pronunciation styles and qamats repeat evidence without a false written syllable range',()=>{
 const w=word('gen-13-3-13');assert.equal(w.sourceHebrew,'אֽ͏ָהֳלוֹ֙');
 for(const style of ['sephardic','ashkenazic']){
  const s=study(w.id,style),r=readerPronunciationWord(w,s,style);assert.equal(r.status,'word-linked');assert.equal(r.hebrew,w.sourceHebrew);assert.equal(r.entries.length,2);
  assert.deepEqual(r.entries.map(e=>e.labels),[['קמץ-ד'],['קמץ-ס']]);assert.ok(r.entries.every(e=>e.sourceForm&&e.writtenReadVariant.writtenHebrew==='אהלה'));
  assert.ok(s.rows.flatMap(r=>r.styles[style].flatMap(c=>c.units)).every(u=>u.readerWordId===w.id&&u.hebrewClusterRanges===null&&u.phonemes===null&&u.noteIds===null&&u.audioTimes===null));
 }
 assert.notEqual(readerPronunciationWord(w,study(w.id),'sephardic').entries[0].text,readerPronunciationWord(w,study(w.id),'sephardic').entries[1].text);
 const a=readerPronunciationWord(w,study(w.id,'ashkenazic'),'ashkenazic');assert.equal(a.entries[0].text,a.entries[1].text);assert.equal(a.entries[1].sourceReference.column,1);
});
test('joined ordinary words gain exact ranges while the neighboring explicit qere retains its original Hebrew and source-only form',async()=>{
 const c=await getCorpus(),m=createReadingModel(c.passage([{id:'variant',bookId:'exo',start:{chapter:22,verse:4},end:{chapter:22,verse:4}}])),ids=['exo-22-4-8','exo-22-4-10'];
 const before=JSON.stringify(m),plan=m.buildPlan(0,m.words.length-1,{tempo:60,transpose:0}),p=JSON.stringify(plan);
 for(const style of ['sephardic','ashkenazic']){
  const prefix=m.words.find(w=>(w.sourceWordId??w.id)===ids[0]),qere=m.words.find(w=>(w.sourceWordId??w.id)===ids[1]);
  const a=readerPronunciationWord(prefix,lib.study(prefix,style),style),b=readerPronunciationWord(qere,lib.study(qere,style),style);assert.equal(a.status,'word-linked');assert.ok(a.entries.every(e=>!e.sourceForm));assert.ok(b.entries.every(e=>e.sourceForm));assert.equal(prefix.sourceHebrew,'אֶת־');assert.equal(qere.sourceHebrew,'בְּעִיר֔וֹ');
  const links=linkPronunciationToNotes(plan.filter(e=>ids.includes(e.sourceWordId??e.wordId)),m.words,lib,style);assert.ok(links.links.filter(l=>l.sourceWordId===ids[0]).every(l=>l.status==='exact-written-span'));assert.ok(links.links.filter(l=>l.sourceWordId===ids[1]).every(l=>l.reason==='source-only-written-form'));
 }
 assert.equal(JSON.stringify(m),before);assert.equal(JSON.stringify(m.buildPlan(0,m.words.length-1,{tempo:60,transpose:0})),p);
});
test('malformed or unanchored written/read evidence cannot create a pronunciation form',()=>{
 const w=word('exo-22-4-10'),group=lib.at(w),i=group.readerIds.indexOf(w.id);assert.ok(groupReaderLetterForms(group,i).includes('בעירה'));
 for(const mutate of [g=>g.writtenReadVariants[0].readerHebrew+='א',g=>g.writtenReadVariants[0].kind='approximate-spelling',g=>g.variantWindow.beforeGroup=null,g=>g.writtenReadVariants.push({...g.writtenReadVariants[0]}),g=>g.writtenReadVariants[0].readerWordId='different-word']){
  const bad=structuredClone(group);mutate(bad);assert.throws(()=>sourcePronunciationStudy(bad,{sourceCommit:lib.sourceCommit,word:w,style:'sephardic'}),/written\/read/);
 }
 const unrelated=word('gen-8-20-7');assert.equal(groupReaderLetterForms(lib.at(unrelated),0).includes('הטהרה'),false);assert.equal(lib.at({id:'gen-4-18-9',sourceHebrew:'וּמְחִיּיָאֵ֗ל'}).implicitReadingLinks[0].ruleId,'mam-umexiyael-gen4-18');assert.equal(lib.at({id:'unknown',sourceHebrew:'וּמְחִיּיָאֵ֗ל'}),null);
});
test('all old source groups keep their exact digest and prior literal/resolved word-ownership hashes',()=>{
 // Python sorted keys supply a language-independent canonical JSON proof.
 const base=data.groups.filter(g=>!g.writtenReadVariants&&!g.editionWordLinks&&!g.implicitReadingLinks);assert.equal(base.length,68354);
 const hash=createHash('sha256').update(stable(base)).digest('hex');assert.equal(hash,'e0a84b5a2839e025b2e68e71cf3f65af825d410b2f475ab0cf7f4d80ade56c07');assert.equal(hash,record.baseGroupsSha256);
 const audit=json('docs/PRONUNCIATION-WORD-ALIGNMENT.json');assert.equal(audit.styles.sephardic.baseLiteralAssignmentSha256,'2d11421fcb39794b35f0f98a83768592c1e4a66eb087e366f0c2e225cf743443');assert.equal(audit.styles.ashkenazic.baseAssignmentSha256,'361c7110e9729970f4c7c5cd4f829de849c006ccb28c21f4a2d451aa52124773');
});
test('new evidence is embedded unchanged in the standalone and does not add a melody or voice',()=>{
 const bytes=raw('docs/PRONUNCIATION-WRITTEN-VARIANTS.json');assert.ok(raw('TropeTrain.html').toString().includes('data:application/json;base64,'+bytes.toString('base64')));assert.match(record.review,/no equality of phonology/);assert.match(record.method,/no spelling normalization/);
 const profiles=json('docs/STATE.json').features;assert.ok(profiles.find(f=>f.id==='pronunciations'));assert.equal(study('gen-13-3-13').rows[0].styles.sephardic[0].units[0].phonemes,null);
});
