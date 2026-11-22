import {readFile,writeFile}from'node:fs/promises';import{gunzipSync}from'node:zlib';import assert from'node:assert/strict';
import{HISTORICAL_ACCENT_PROFILES as profiles,historicalProfileSpecification as specification}from'../historical-pronunciation.js';
import{HISTORICAL_CATEGORY_INVENTORY as inventory}from'../historical-pronunciation-categories.js';
const source=JSON.parse(gunzipSync(await readFile(new URL('../data/pronunciation/torah-segments.json.gz',import.meta.url))));
assert.deepEqual(inventory.catalog,source.catalog.map(({id,label,kind,geminate})=>({id,label,kind,geminate})));
assert.equal(inventory.sourceCommit,source.sourceCommit);assert.equal(inventory.inputSha256,source.inputSha256);
const record={schema:'tropetrain-historical-pronunciation-profiles-v1',revision:1,date:'2026-11-22',status:'historical_labels_and_incomplete_observations_only',
 profiles:profiles.map(p=>specification(p.id)),reviewedProfiles:0,playableProfiles:0,
 ruleScope:'87 source category slots per label, all522unassigned. Descriptive observations are not executable phonological rules.',
 academicLead:{url:'https://discovery.ucl.ac.uk/id/eprint/10127054/1/Kahn_fgab029.pdf',
  title:'Contemporary Ashkenazic Hebrew: The Grammatical Profile of an Overlooked Twenty-First-Century Variety',authors:['Lily Kahn','Sonya Yampolskaya'],year:2022,doi:'10.1093/jss/fgab029',license:'CC-BY-4.0',location:'Section1.3.2, printedp.215',
  finding:'The authors base their transcriptions on a Stamford Hill speaker from a Satmar background, naming Izzy Posen in their acknowledgments. They describe Polish-Hungarian continuities, stress-conditioned vowel reduction and several consonant mergers. Their transcription choices are not a complete phonology; the article explicitly leaves in-depth phonological analysis for future work.',
  limits:'This contemporary speech/recitation source does not establish equivalence to any Kinnor Accent label or a reusable singing voice. No recording, voice model or rule realization imported.'},
 replacementEvidence:['Complete context-sensitive phonological specification for each label, including stress/reduction, sheva, qamats, joins, furtive patah, diphthongs, gemination and reading variants.',
  'Permission-cleared singing material covering the required phones/transitions/register and exact marked-Hebrew word/syllable/phone annotations.',
  'Qualified linguistic, acoustic and cantorial review recorded independently of historical label evidence.'],
 invariants:{readerHebrewChanged:false,accentsChanged:false,originalMAMDataChanged:false,musicalNotesChanged:false,originalAudioOrTimesChanged:false,newSingingVoice:null,newMelodyGrammar:null}};
assert.equal(record.profiles.length,6);assert.equal(record.profiles.reduce((n,p)=>n+p.categories.length,0),522);
assert(record.profiles.every(p=>!p.playable&&p.categories.every(c=>c.phonologicalRule===null&&c.phonemes===null)));
const path=new URL('../docs/HISTORICAL-PRONUNCIATION-PROFILES.json',import.meta.url),text=JSON.stringify(record,null,2)+'\n';
if(process.argv.includes('--check'))assert.equal(await readFile(path,'utf8'),text);else await writeFile(path,text);
console.log(JSON.stringify({historicalProfiles:6,sourceCategoriesPerProfile:87,unassignedRuleSlots:522,playableProfiles:0,sourceCatalogExact:true}));
