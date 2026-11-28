import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {PronunciationLibrary} from '../pronunciation.js';
import {phonologyWordProposal as propose,phonologySourceForProfile,ALL_PHONOLOGY_PROFILES} from '../pronunciation-phonology.js';
import {readerPhonologyWord} from '../pronunciation-phonology-reader.js';
import {TIBERIAN_CONSONANT_EVIDENCE as evidence,TIBERIAN_CONSONANT_PROFILE as profile,TIBERIAN_CONSONANT_SOURCE as source} from '../tiberian-consonants.js';
import {READER_PRONUNCIATION_SOURCES} from '../khan-pronunciation.js';
import {getCorpus} from '../library.js';
import {createReadingModel} from '../music.js';
import {SourceSyllableUnderlay} from '../source-syllable-underlay.js';
import {linkPronunciationProposalsToNotes as link} from '../pronunciation-note-proposals.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url)),j=n=>JSON.parse(gunzipSync(read('data/pronunciation/'+n+'.json.gz'))),lib=new PronunciationLibrary(j('torah-display'),{underlay:j('torah-underlay'),segments:j('torah-segments')});
const word=id=>{const h=lib.byWord.get(id);assert(h,id);return{id,sourceHebrew:h.group.readerHebrew[h.index]};},study=(id,style='sephardic')=>lib.study(word(id),style),report=(id,style='sephardic')=>propose(study(id,style),word(id),style,profile.id),fragments=r=>r.routes.flatMap(r=>r.units.flatMap(u=>u.fragments)),sha=b=>createHash('sha256').update(b).digest('hex');
test('Tiberian inventory is a separately sourced partial research profile, not a published reading or singing preset',()=>{
 assert.equal(phonologySourceForProfile(profile.id),source);assert.equal(ALL_PHONOLOGY_PROFILES.length,5);assert.equal(READER_PRONUNCIATION_SOURCES.length,8);assert.equal(READER_PRONUNCIATION_SOURCES.filter(p=>p.kind==='published-word').length,2);assert(profile.consonantsOnly&&!profile.playable&&profile.singingVoice===null&&profile.kinnorAccentId===null&&profile.review===null);assert(Object.isFrozen(profile));assert.equal(source.license,'CC-BY-4.0');assert.deepEqual(source.printedPages,[161,162,165,608,609,610]);
 const pack=read(evidence.sourcePack.file);assert.equal(pack.length,evidence.sourcePack.bytes);assert.equal(sha(pack),evidence.sourcePack.sha256);
 const result=JSON.parse(execFileSync('python3',['-c',`import zipfile,json,hashlib,io;from pypdf import PdfReader
with zipfile.ZipFile(${JSON.stringify(new URL('../'+evidence.sourcePack.file,import.meta.url).pathname)})as z:
 m=json.loads(z.read('manifest.json'))
 for f in m['files']:
  b=z.read(f['file']);assert len(b)==f['bytes']and hashlib.sha256(b).hexdigest()==f['sha256']
 b=z.read('consonant-sources.pdf');assert len(PdfReader(io.BytesIO(b)).pages)==7
 print(json.dumps({'pages':7,'sha256':hashlib.sha256(b).hexdigest(),'license':m['license']}))`],{encoding:'utf8'}));assert.equal(result.sha256,evidence.sourcePack.excerptSha256);assert.equal(result.license,'CC-BY-4.0');
});
test('the opening word keeps exact Hebrew and source syllables while Tiberian tav differs from the regional s without inventing vowels',()=>{
 for(const style of ['sephardic','ashkenazic']){const w=word('gen-1-1-1'),s=study(w.id,style),before=JSON.stringify(s),r=report(w.id,style),fs=fragments(r);assert.equal(r.hebrew,'בְּרֵאשִׁ֖ית');assert.deepEqual(fs.find(f=>f.source.categoryId==='TAV_0DAG').proposal.candidatePhonemes,['θ']);assert.deepEqual(fs.find(f=>f.source.categoryId==='BET_1DAG_QAL').proposal.candidatePhonemes,['b']);assert(fs.filter(f=>f.source.kind==='vowel').every(f=>f.proposal.candidatePhonemes===null));assert(fs.filter(f=>f.source.kind==='silent-letter').every(f=>f.proposal.candidatePhonemes.length===0));assert.equal(JSON.stringify(s),before);const regional=propose(s,w,style,'katz-1993-northeastern-formal');assert.deepEqual(fragments(regional).find(f=>f.source.categoryId==='TAV_0DAG').proposal.candidatePhonemes,['s']);}
 const a=report('gen-1-1-1'),b=report('gen-1-1-1','ashkenazic');assert.deepEqual(a.routes.map(r=>r.units.map(u=>u.readerRanges)),b.routes.map(r=>r.units.map(u=>u.readerRanges)));
});
test('reciprocal geminate halves retain one source event with gemination metadata and no degemination or assigned duration',()=>{
 const r=report('gen-8-20-7'),route=r.routes[0],halves=fragments(r).filter(f=>f.source.categoryId==='BET_1DAG_XAZAQ');assert.equal(halves.length,2);assert.equal(halves[0].eventId,halves[1].eventId);const event=route.events.find(e=>e.id===halves[0].eventId);assert.equal(event.rule,'tiberian-phoneme-inventory-source-gemination-retained');assert(event.sourceGemination);assert.deepEqual(event.candidatePhonemes,['b']);assert.equal(event.sourceSegmentIds.length,2);assert.equal(event.acousticGemination,null);assert.equal(event.duration,null);assert.equal(event.phonemes,null);
 const display=readerPhonologyWord(word('gen-8-20-7'),study('gen-8-20-7'),'sephardic',profile.id),refs=display.entries.flatMap(e=>e.parts.flatMap(p=>p.references)).filter(r=>r.eventId===event.id);assert.equal(refs.length,2);assert.equal(refs.filter(r=>r.sharedReference).length,1);assert.equal(refs.find(r=>r.sharedReference).text,'↔');
});
test('mappiq he is a consonant candidate, while special alef and complete vowel-consonant compounds remain unresolved',()=>{
 const he=fragments(report('gen-1-24-7')).find(f=>f.source.categoryId==='HE_1MAPIQ');assert(he);assert.deepEqual(he.proposal.candidatePhonemes,['h']);assert.deepEqual(he.proposal.evidence.printedPages,[161,162,165,608]);
 const alef=fragments(report('gen-43-26-4')).find(f=>f.source.categoryId==='ALEF_1MAPIQ');assert(alef);assert.equal(alef.proposal.candidatePhonemes,null);assert.equal(alef.proposal.rule,'tiberian-special-alef-needs-comparison');
 const compound=fragments(report('gen-1-2-9')).find(f=>f.source.categoryId==='FPP_PATAX_XET');assert(compound);assert.equal(compound.proposal.candidatePhonemes,null);assert.equal(compound.proposal.rule,'outside-tiberian-consonant-inventory');
});
test('source-only branches, CGJ, collective ownership and repeated reading occurrences keep their original identities',()=>{
 const s=study('gen-13-3-13'),before=JSON.stringify(s),r=report('gen-13-3-13');assert.equal(r.hebrew,'אֽ͏ָהֳלוֹ֙');assert.equal(r.routes.length,2);assert(r.routes.flatMap(r=>r.units).every(u=>u.readerRanges===null));assert.equal(JSON.stringify(s),before);
 for(const id of ['deu-32-6-1','deu-32-6-2'])assert(report(id).routes.flatMap(r=>r.units).every(u=>u.ownerWordId===null&&u.occurrenceId===null));
 const w=word('gen-1-1-1');for(const id of ['first-occurrence','second-occurrence']){const r=propose(study(w.id),{...w,id,sourceWordId:w.id},'sephardic',profile.id);assert.equal(r.wordId,id);assert(r.routes.flatMap(r=>r.units).every(u=>u.occurrenceId===id));assert.equal(r.sourceWordId,w.id);}
});
test('changed marked Hebrew, forged source categories, broken shared halves and non-Torah scope never acquire substitute pronunciations',()=>{
 const w=word('gen-1-1-1'),s=study(w.id);assert.throws(()=>propose(s,{...w,sourceHebrew:'בראשית'},'sephardic',profile.id),/marked Hebrew/);const bad=structuredClone(s);bad.rows[0].styles.sephardic[0].units[0].sourceSegments.variants[0].segments[0].categoryId='fake';assert.throws(()=>propose(bad,w,'sephardic',profile.id),/category/);
 const shared=study('gen-8-20-7');shared.rows[0].styles.sephardic[0].units[0].sourceSegments.variants[0].segments.at(-1).sharedWithUnitId='missing';const r=propose(shared,word('gen-8-20-7'),'sephardic',profile.id);assert(fragments(r).filter(f=>f.source.categoryId==='BET_1DAG_XAZAQ').every(f=>f.proposal.candidatePhonemes===null));assert(r.routes[0].gaps.some(g=>g.reason==='shared-consonant-counterpart-missing'));
 const outside=propose(null,{id:'dan-11-45-1',sourceHebrew:'וְיִטַּע֙'},'sephardic',profile.id);assert.deepEqual(outside.routes,[]);assert.equal(outside.coverageReason,'torah-only-consonant-research-scope');assert.equal(outside.playable,false);assert.equal(outside.phonemes,null);
});
test('inventory references remain independent of source style, melody, key, tempo and all note/recording clocks under every source-reading policy',async()=>{
 const c=await getCorpus(),policies=JSON.parse(read('docs/SOURCE-READING-CHOICES.json')).results.map(r=>r.policy);
 for(const policy of policies)for(const style of ['sephardic','ashkenazic']){
  const adapter=new SourceSyllableUnderlay(lib,{allowSourceReadings:true,allowJointSources:true,sourceReadingChoices:policy}),m=createReadingModel(c.passage([{id:'inventory',bookId:'gen',start:{chapter:1,verse:1},end:{chapter:1,verse:3}}]),{sourceUnderlay:adapter}),plan=m.buildPlan(0,m.words.length-1,{tempo:91,transpose:2}),before=JSON.stringify({words:m.words,plan}),r=link(plan,m.words,lib,style,profile.id);assert.equal(r.phonologySource.id,source.id);assert.equal(r.counts.linkedNotes,plan.length);assert.equal(r.counts.unlinkedNotes,0);for(const k of ['phonemes','enginePhones','audioTimes','voice','review'])assert.equal(r[k],null);assert.equal(JSON.stringify({words:m.words,plan}),before);assert(r.sourceEvents.every(e=>e.phonemes===null&&e.audioTimes===null&&e.noteIds===null));
 }
});
