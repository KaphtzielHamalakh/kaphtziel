import {build} from 'esbuild';
import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {gzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
import {shareEmbeddedImages} from './share-embedded-images.mjs';
import {writePortableArtifact} from './write-portable.mjs';
import {packPortableProgram} from './pack-portable-program.mjs';
import './import-printed-score.mjs';
import './import-baer-score.mjs';
import './import-cohen-prophetical.mjs';
import './import-cohen-penitential.mjs';
import './import-baer-high-holiday.mjs';
import './import-printed-patterns.mjs';
import './import-pattern-catalog.mjs';
import './import-baer-patterns.mjs';
import './import-idelsohn-patterns.mjs';
import './audit-pattern-small-eighth.mjs';
import './import-idelsohn-score.mjs';
import './import-idelsohn-no266-score.mjs';
import './audit-idelsohn-no266.mjs';
import './import-printed-underlay.mjs';
import './import-printed-mam-fitting.mjs';
import './import-calendar-examples.mjs';
import './import-voice-studies.mjs';
import './import-khan-pronunciation.mjs';
import './audit-chant-coverage.mjs';
import './audit-source-word-windows.mjs';

const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
execFileSync('node',[path.join(root,'scripts/audit-recording-timing-groups.mjs')],{stdio:'inherit'});
execFileSync('node',[path.join(root,'scripts/audit-recording-group-word-drafts.mjs')],{stdio:'inherit'});
execFileSync('python3',[path.join(root,'scripts/import-source-phrases.py')],{stdio:'inherit'});
execFileSync('node',[path.join(root,'scripts/audit-source-phrases.mjs')],{stdio:'inherit'});
execFileSync('node',[path.join(root,'scripts/audit-source-recall.mjs')],{stdio:'inherit'});
execFileSync('python3',[path.join(root,'scripts/import-scroll-layout.py')],{stdio:'inherit'});
execFileSync('python3',[path.join(root,'scripts/import-pronunciation.py')],{stdio:'inherit'});
execFileSync('python3',[path.join(root,'scripts/audit-pronunciation-editions.py')],{stdio:'inherit'});
execFileSync('python3',[path.join(root,'scripts/audit-pronunciation-implicit-reading.py')],{stdio:'inherit'});
execFileSync('node',[path.join(root,'scripts/audit-pronunciation-structure.mjs')],{stdio:'inherit'});
execFileSync('node',[path.join(root,'scripts/audit-pronunciation-word-alignment.mjs')],{stdio:'inherit'});
execFileSync('python3',[path.join(root,'scripts/build-pronunciation-underlay.py')],{stdio:'inherit'});
execFileSync('node',[path.join(root,'scripts/audit-pronunciation-underlay.mjs')],{stdio:'inherit'});
execFileSync('python3',[path.join(root,'scripts/build-pronunciation-segments.py')],{stdio:'inherit'});
execFileSync('node',[path.join(root,'scripts/audit-pronunciation-segments.mjs')],{stdio:'inherit'});
execFileSync('node',[path.join(root,'scripts/audit-pronunciation-letter-bindings.mjs')],{stdio:'inherit'});
execFileSync('python3',[path.join(root,'scripts/build-pronunciation-ipa.py')],{stdio:'inherit'});
execFileSync('node',[path.join(root,'scripts/audit-pronunciation-ipa.mjs')],{stdio:'inherit'});
execFileSync('node',[path.join(root,'scripts/audit-joint-coverage.mjs')],{stdio:'inherit'});
execFileSync('node',[path.join(root,'scripts/audit-pronunciation-note-links.mjs')],{stdio:'inherit'});
execFileSync('node',[path.join(root,'scripts/audit-baer-note-links.mjs')],{stdio:'inherit'});
execFileSync('node',[path.join(root,'scripts/audit-source-pitches.mjs')],{stdio:'inherit'});
execFileSync('node',[path.join(root,'scripts/audit-source-contour.mjs')],{stdio:'inherit'});
execFileSync('node',[path.join(root,'scripts/audit-pronunciation-score-groups.mjs')],{stdio:'inherit'});
execFileSync('node',[path.join(root,'scripts/audit-pronunciation-span-follow.mjs')],{stdio:'inherit'});
execFileSync('node',[path.join(root,'scripts/audit-cohen-penitential.mjs')],{stdio:'inherit'});
execFileSync('python3',[path.join(root,'scripts/import-haftarah-references.py'),'--verify'],{stdio:'inherit'});
execFileSync('python3',[path.join(root,'scripts/import-pronunciation-repertoire.py'),'--verify'],{stdio:'inherit'});
execFileSync('python3',[path.join(root,'scripts/build-pronunciation-repertoire-underlay.py'),'--check'],{stdio:'inherit'});
execFileSync('node',[path.join(root,'scripts/audit-pronunciation-repertoire-underlay.mjs'),'--check'],{stdio:'inherit'});
execFileSync('node',[path.join(root,'scripts/audit-historical-pronunciation.mjs')],{stdio:'inherit'});
execFileSync('node',[path.join(root,'scripts/audit-pronunciation-phonology.mjs')],{stdio:'inherit'});
execFileSync('node',[path.join(root,'scripts/audit-modern-phonology.mjs')],{stdio:'inherit'});
execFileSync('node',[path.join(root,'scripts/audit-modern-final-consonants.mjs')],{stdio:'inherit'});
execFileSync('node',[path.join(root,'scripts/audit-source-syllable-playback.mjs')],{stdio:'inherit'});
execFileSync('node',[path.join(root,'scripts/audit-source-reading-playback.mjs')],{stdio:'inherit'});
execFileSync('node',[path.join(root,'scripts/audit-source-reading-choices.mjs')],{stdio:'inherit'});
execFileSync('node',[path.join(root,'scripts/audit-source-joint-playback.mjs')],{stdio:'inherit'});
execFileSync('node',[path.join(root,'scripts/audit-source-group-timing.mjs')],{stdio:'inherit'});
execFileSync('node',[path.join(root,'scripts/audit-pronunciation-note-proposals.mjs')],{stdio:'inherit'});
execFileSync('node',[path.join(root,'scripts/audit-modern-note-links.mjs')],{stdio:'inherit'});
execFileSync('node',[path.join(root,'scripts/audit-modern-final-note-links.mjs')],{stdio:'inherit'});
execFileSync('python3',[path.join(root,'scripts/import-asael-source-catalog.py'),'--check'],{stdio:'inherit'});
execFileSync('python3',[path.join(root,'scripts/import-word-support.py'),'--check'],{stdio:'inherit'});
execFileSync('python3',[path.join(root,'scripts/import-phonetic-words.py'),'--check'],{stdio:'inherit'});
execFileSync('python3',[path.join(root,'scripts/import-vowel-anchors.py'),'--check'],{stdio:'inherit'});
const vowelAnchors=JSON.parse(await readFile(path.join(root,'docs/ASAEL-VOWEL-ANCHORS.json'),'utf8'));
const vowelAnchorsEncoded=Object.fromEntries(await Promise.all(vowelAnchors.records.map(async r=>[r.file,(await readFile(path.join(root,r.file))).toString('base64')])));
const phoneticWords=JSON.parse(await readFile(path.join(root,'docs/ASAEL-PHONETIC-WORDS.json'),'utf8'));
const phoneticWordsEncoded=Object.fromEntries(await Promise.all(phoneticWords.records.map(async r=>[r.file,(await readFile(path.join(root,r.file))).toString('base64')])));
const wordSupport=JSON.parse(await readFile(path.join(root,'docs/ASAEL-WORD-SUPPORT.json'),'utf8'));
const wordSupportEncoded=Object.fromEntries(await Promise.all(wordSupport.records.map(async r=>[r.file,(await readFile(path.join(root,r.file))).toString('base64')])));
const version=JSON.parse(await readFile(path.join(root,'package.json'),'utf8')).version;
const license=await readFile(path.join(root,'node_modules/havarotjs/LICENSE'),'utf8');
const manifest=JSON.parse(await readFile(path.join(root,'data/torah/manifest.json'),'utf8'));
const books=await Promise.all(manifest.books.map(b=>readFile(path.join(root,'data/torah',b.file),'utf8').then(JSON.parse)));
const corpus=JSON.stringify({manifest,books});
const encoded=gzipSync(corpus,{level:9}).toString('base64');
const repertoireManifest=JSON.parse(await readFile(path.join(root,'data/repertoire/manifest.json'),'utf8'));
const repertoireBooks=await Promise.all(repertoireManifest.books.map(b=>readFile(path.join(root,'data/repertoire',b.file),'utf8').then(JSON.parse)));
const repertoireEncoded=gzipSync(JSON.stringify({manifest:repertoireManifest,books:repertoireBooks}),{level:9}).toString('base64');
const underlayEncoded=(await readFile(path.join(root,'data/pronunciation/torah-underlay.json.gz'))).toString('base64');
const segmentsEncoded=(await readFile(path.join(root,'data/pronunciation/torah-segments.json.gz'))).toString('base64');
const pronunciationRepertoireSummary=JSON.parse((await readFile(path.join(root,'pronunciation-repertoire-summary.js'),'utf8')).split('export const PRONUNCIATION_REPERTOIRE_SUMMARY=')[1].trim().replace(/;$/,''));
const repertoireUnderlaySummary=JSON.parse((await readFile(path.join(root,'pronunciation-repertoire-underlay-summary.js'),'utf8')).split('export const PRONUNCIATION_REPERTOIRE_UNDERLAY=')[1].trim().replace(/;$/,''));
const repertoireUnderlayEncoded=Object.fromEntries(await Promise.all(repertoireUnderlaySummary.books.map(async b=>[b.bookId,(await readFile(path.join(root,'data/pronunciation/repertoire-underlay',b.bookId+'.json.gz'))).toString('base64')])));
const pronunciationRepertoireEncoded=Object.fromEntries(await Promise.all(pronunciationRepertoireSummary.books.map(async b=>[b.bookId,(await readFile(path.join(root,'data/pronunciation/repertoire',b.bookId+'.json.gz'))).toString('base64')])));
const pronunciationEncoded=(await readFile(path.join(root,'data/pronunciation/torah-display.json.gz'))).toString('base64');
const haftarahEncoded=(await readFile(path.join(root,'data/references/haftarah-library.json.gz'))).toString('base64');
const referenceEncoded=(await readFile(path.join(root,'data/references/torah-library.json.gz'))).toString('base64');
const pitchManifest=JSON.parse(await readFile(path.join(root,'data/pitch/manifest.json'),'utf8'));
const pitchPackets=Object.fromEntries(await Promise.all(pitchManifest.records.map(async r=>[r.id,(await readFile(path.join(root,'data/pitch',r.file))).toString('base64')])));
const sourcePhrasesEncoded=(await readFile(path.join(root,'data/structure/torah-phrases.json.gz'))).toString('base64');
const pitchEvidence=await readFile(path.join(root,'docs/SOURCE-PITCH-EVIDENCE.json'),'utf8');
const pitchSampleAudit=await readFile(path.join(root,'docs/SOURCE-PITCH-SAMPLE-AUDIT.json'),'utf8');
const pitchWorker=await build({absWorkingDir:root,entryPoints:['recorded-pitch-worker.js'],bundle:true,format:'iife',platform:'browser',target:['es2022'],write:false,legalComments:'eof',charset:'utf8'});
const pitchWorkerSource=pitchWorker.outputFiles[0].text;
const contourWorker=await build({absWorkingDir:root,entryPoints:['source-contour-worker.js'],bundle:true,format:'iife',platform:'browser',target:['es2022'],write:false,legalComments:'eof',charset:'utf8'});
const contourWorkerSource=contourWorker.outputFiles[0].text;
// Compact only formatting; retain identifier names, source data and syntax choices.
await build({absWorkingDir:root,entryPoints:['app.js'],bundle:true,format:'iife',target:['es2022'],minifyWhitespace:true,minifyIdentifiers:false,minifySyntax:false,outfile:'app.bundle.js',legalComments:'eof',charset:'utf8',banner:{js:`/*! havarotjs license:\n${license.replaceAll('*/','* /')}\n*/`},plugins:[{
  name:'embedded-corpus',setup(builder){builder.onLoad({filter:/source-phrase-data\.js$/},()=>({loader:'js',contents:`const encoded=${JSON.stringify(sourcePhrasesEncoded)};let promise;export function loadSourcePhrasePacket(){return promise??=(async()=>JSON.parse(await new Response(new Blob([Uint8Array.from(atob(encoded),c=>c.charCodeAt(0))]).stream().pipeThrough(new DecompressionStream('gzip'))).text()))();}`}));builder.onLoad({filter:/vowel-anchor-data\.js$/},()=>({loader:'js',contents:`const packets=${JSON.stringify(vowelAnchorsEncoded)};export async function loadVowelAnchorPacket(file){if(!Object.hasOwn(packets,file))throw Error('Unknown source vowel packet.');return Uint8Array.from(atob(packets[file]),c=>c.charCodeAt(0));}`}));builder.onLoad({filter:/phonetic-word-data\.js$/},()=>({loader:'js',contents:`const packets=${JSON.stringify(phoneticWordsEncoded)};export async function loadPhoneticWordPacket(file){if(!Object.hasOwn(packets,file))throw Error('Unknown phonetic word source packet.');return Uint8Array.from(atob(packets[file]),c=>c.charCodeAt(0));}`}));builder.onLoad({filter:/word-support-data\.js$/},()=>({loader:'js',contents:`const packets=${JSON.stringify(wordSupportEncoded)};export async function loadWordSupportPacket(file){if(!Object.hasOwn(packets,file))throw Error('Unknown word-support source packet.');return Uint8Array.from(atob(packets[file]),c=>c.charCodeAt(0));}`}));builder.onLoad({filter:/pronunciation-repertoire-underlay-data\.js$/},()=>({loader:'js',contents:`
    import {PRONUNCIATION_REPERTOIRE_UNDERLAY} from './pronunciation-repertoire-underlay-summary.js';
    const encoded=${JSON.stringify(repertoireUnderlayEncoded)};
    export async function loadPronunciationRepertoireUnderlayBook(bookId){
      const expected=PRONUNCIATION_REPERTOIRE_UNDERLAY.books.find(b=>b.bookId===bookId);
      if(!expected||!Object.hasOwn(encoded,bookId))throw Error('Choose a supported pronunciation underlay book.');
      if(typeof DecompressionStream==='undefined')throw Error('Hebrew underlay needs gzip support.');
      const bytes=Uint8Array.from(atob(encoded[bookId]),c=>c.charCodeAt(0));
      const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(b=>b.toString(16).padStart(2,'0')).join('');
      if(bytes.length!==expected.packetBytes||hash!==expected.packetSha256)throw Error('This book’s pronunciation underlay checksum changed.');
      return JSON.parse(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text());
    }`}));builder.onLoad({filter:/pronunciation-repertoire-data\.js$/},()=>({loader:'js',contents:`
    const encoded=${JSON.stringify(pronunciationRepertoireEncoded)};
    export async function loadPronunciationRepertoireBook(bookId){
      if(!Object.hasOwn(encoded,bookId))throw Error('Choose a supported pronunciation source book.');
      if(typeof DecompressionStream==='undefined')throw Error('Pronunciation source text needs gzip support.');
      const bytes=Uint8Array.from(atob(encoded[bookId]),c=>c.charCodeAt(0));
      return JSON.parse(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text());
    }`}));builder.onLoad({filter:/haftarah-reference-data\.js$/},()=>({loader:'js',contents:`
    const encoded=${JSON.stringify(haftarahEncoded)};
    export async function loadHaftarahData(){
      if(typeof DecompressionStream==='undefined')throw Error('The Haftarah catalog needs gzip support.');
      const bytes=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0));
      return JSON.parse(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text());
    }`}));builder.onLoad({filter:/source-contour-worker-data\.js$/},()=>({loader:'js',contents:`export const SOURCE_CONTOUR_WORKER_SOURCE=${JSON.stringify(contourWorkerSource)};`}));builder.onLoad({filter:/recorded-pitch-worker-data\.js$/},()=>({loader:'js',contents:`export const RECORDED_PITCH_WORKER_SOURCE=${JSON.stringify(pitchWorkerSource)};`}));builder.onLoad({filter:/pronunciation-segment-data\.js$/},()=>({loader:'js',contents:`
    const segmentsEncoded=${JSON.stringify(segmentsEncoded)};
    export async function loadPronunciationSegmentData(){
      if(typeof DecompressionStream==='undefined')throw Error('Pronunciation source rules need a current browser with gzip support.');
      const bytes=Uint8Array.from(atob(segmentsEncoded),c=>c.charCodeAt(0));
      return JSON.parse(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text());
    }`}));builder.onLoad({filter:/pronunciation-underlay-data\.js$/},()=>({loader:'js',contents:`
    const encoded=${JSON.stringify(underlayEncoded)};
    export async function loadPronunciationUnderlayData(){
      if(typeof DecompressionStream==='undefined')throw Error('Hebrew underlay needs a current browser with gzip support.');
      const bytes=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0));
      return JSON.parse(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text());
    }`}));builder.onLoad({filter:/(?:^|[\\/])pronunciation-data\.js$/},()=>({loader:'js',contents:`
    const pronunciationEncoded=${JSON.stringify(pronunciationEncoded)};
    export async function loadPronunciationData(){
      if(typeof DecompressionStream==='undefined')throw Error('Pronunciation text needs a current browser with gzip support.');
      const bytes=Uint8Array.from(atob(pronunciationEncoded),c=>c.charCodeAt(0));
      return JSON.parse(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text());
    }`}));builder.onLoad({filter:/repertoire-data\.js$/},()=>({loader:'js',contents:`
    const repertoireEncoded=${JSON.stringify(repertoireEncoded)};
    export async function loadRepertoire(){
      if(typeof DecompressionStream==='undefined')throw Error('The reading library needs a current browser with gzip support. The opening passage remains available.');
      const bytes=Uint8Array.from(atob(repertoireEncoded),c=>c.charCodeAt(0));
      return JSON.parse(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text());
    }`}));builder.onLoad({filter:/reference-library-data\.js$/},()=>({loader:'js',contents:`
    const referenceEncoded=${JSON.stringify(referenceEncoded)};
    export async function loadReferenceData(){
      if(typeof DecompressionStream==='undefined')throw Error('The recorded-reference library needs a current browser with gzip support.');
      const bytes=Uint8Array.from(atob(referenceEncoded),c=>c.charCodeAt(0));
      return JSON.parse(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text());
    }`}));builder.onLoad({filter:/library-data\.js$/},()=>({loader:'js',contents:`
    const encoded=${JSON.stringify(encoded)};
    export async function loadCorpus(){
      if(typeof DecompressionStream==='undefined')throw Error('The full library needs a current browser with gzip support. The opening passage remains available.');
      const data=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0));
      const stream=new Blob([data]).stream().pipeThrough(new DecompressionStream('gzip'));
      return JSON.parse(await new Response(stream).text());
    }` }));}
}]});
const html=await readFile(path.join(root,'index.html'),'utf8');
const script=await readFile(path.join(root,'app.bundle.js'),'utf8');
const portableProgram=packPortableProgram(script);
const font=await readFile(path.join(root,'assets/NotoSerifHebrew.ttf'));
await writeFile(path.join(root,'assets/havarotjs-LICENSE.txt'),license);
const fontLicense=await readFile(path.join(root,'assets/OFL.txt'),'utf8');
const musicFont=await readFile(path.join(root,'assets/Bravura.otf'));
const musicFontLicense=await readFile(path.join(root,'assets/Bravura-OFL.txt'),'utf8');
const scrollFont=await readFile(path.join(root,'assets/ShlomoStam.ttf'));
const scrollFontLicense=await readFile(path.join(root,'assets/ShlomoStam-OFL.txt'),'utf8');
const layoutLicense=await readFile(path.join(root,'assets/layout/tikkun-MIT.txt'),'utf8');
const layoutEvidence=await readFile(path.join(root,'docs/SCROLL-SOURCES.json'),'utf8');
const layoutPack=await readFile(path.join(root,'assets/layout/tikkun-torah-sources.zip'));
const haftarahAudio=await readFile(path.join(root,'assets/references/Bereshit-H.mp3'));
const referenceAudio=await readFile(path.join(root,'assets/references/Bereshit-1.mp3'));
const jointEvidence=await readFile(path.join(root,'docs/JOINT-CHANT-PRONUNCIATION.json'),'utf8');
const noteCorrespondenceEvidence=await readFile(path.join(root,'docs/PRONUNCIATION-NOTE-CORRESPONDENCE.json'),'utf8');
const referenceNotice=await readFile(path.join(root,'assets/references/NOTICE.txt'),'utf8');
const includedVerseAudio=await readFile(path.join(root,'assets/voice-studies/fellman-rh-2018/RH2-22-01H.mp3'));
const voiceStudyAudio=await readFile(path.join(root,'assets/voice-studies/esther-seed.mp3'));
const underlayEvidence=await readFile(path.join(root,'docs/PRONUNCIATION-UNDERLAY.json'),'utf8');
const segmentsEvidence=await readFile(path.join(root,'docs/PRONUNCIATION-SEGMENTS.json'),'utf8');
const segmentAlignmentEvidence=await readFile(path.join(root,'docs/PRONUNCIATION-SEGMENT-ALIGNMENT.json'),'utf8');
const computationSources=await readFile(path.join(root,'assets/pronunciation/phonetic-mam-computation-sources.zip'));
const pronunciationNotice=await readFile(path.join(root,'assets/pronunciation/NOTICE.txt'),'utf8');
const pronunciationEvidence=await readFile(path.join(root,'docs/PRONUNCIATION-ALIGNMENT.json'),'utf8');
const writtenVariantEvidence=await readFile(path.join(root,'docs/PRONUNCIATION-WRITTEN-VARIANTS.json'),'utf8');
const editionEvidence=await readFile(path.join(root,'docs/PRONUNCIATION-EDITION-WORDS.json'),'utf8');
const editionPack=await readFile(path.join(root,'assets/pronunciation/mam-simple-torah-sources.zip'));
const pronunciationPack=await readFile(path.join(root,'assets/pronunciation/phonetic-mam-torah-sources.zip'));
const voiceStudyNotice=await readFile(path.join(root,'assets/voice-studies/NOTICE.txt'),'utf8');
const sourceWindowsEvidence=await readFile(path.join(root,'docs/SOURCE-WORD-WINDOWS.json'),'utf8');
const letterClusterEvidence=await readFile(path.join(root,'docs/PRONUNCIATION-LETTER-CLUSTERS.json'),'utf8');
const chantEvidence=await readFile(path.join(root,'docs/CHANT-COVERAGE.json'),'utf8');
const voiceStudyEvidence=await readFile(path.join(root,'docs/VOICE-STUDIES.json'),'utf8');
const printedScan=await readFile(path.join(root,'assets/scores/cohen-1902-genesis22.png'));
const alternateScan=await readFile(path.join(root,'assets/scores/cohen-1902-alternate-score.png'));
const scoreGroupsEvidence=await readFile(path.join(root,'docs/PRONUNCIATION-SCORE-GROUPS.json'),'utf8');
const printedEvidence=await readFile(path.join(root,'docs/PRINTED-SCORE.json'),'utf8');
const propheticalScan=await readFile(path.join(root,'assets/scores/cohen-1902-prophetical-gen22.png'));
const propheticalSecondScan=await readFile(path.join(root,'assets/scores/cohen-1902-page547.jpg'));
const propheticalEvidence=await readFile(path.join(root,'docs/COHEN-PROPHETICAL-SCORE.json'),'utf8');
const baerScan=await readFile(path.join(root,'assets/scores/baer-1894-genesis1.png'));
const highHolidayEvidence=await readFile(path.join(root,'docs/BAER-HIGH-HOLIDAY-SCORE.json'),'utf8');
const highHolidayScans=await Promise.all(JSON.parse(highHolidayEvidence).scans.map(async s=>({file:s.file,raw:await readFile(path.join(root,s.file))})));
const baerEvidence=await readFile(path.join(root,'docs/BAER-GENESIS-SCORE.json'),'utf8');
const baerLinks=await readFile(path.join(root,'docs/BAER-NOTE-CORRESPONDENCE.json'),'utf8');
const patternScan=await readFile(path.join(root,'assets/scores/cohen-1902-munah-revia.png'));
const patternRow=await readFile(path.join(root,'assets/scores/cohen-1902-pentateuch-row-a.png'));
const patternEvidence=await readFile(path.join(root,'docs/PRINTED-PATTERNS.json'),'utf8');
const calendarEvidence=await readFile(path.join(root,'docs/CALENDAR-SOURCES.json'),'utf8');
const calendarRelatedAudit=await readFile(path.join(root,'docs/CALENDAR-RELATED-AUDIT.json'),'utf8');
const numberingEvidence=await readFile(path.join(root,'docs/TORAH-NUMBERING-SOURCES.json'),'utf8');
const numberingData=await readFile(path.join(root,'data/calendar/torah-verse-numbering.json'),'utf8');
const dateEvidence=await readFile(path.join(root,'docs/HEBREW-DATE-SOURCES.json'),'utf8');
const dateSources=await readFile(path.join(root,'data/calendar/hebrew-date-sources.zip'));
const repertoireEvidence=await readFile(path.join(root,'docs/REPERTOIRE-SOURCES.json'),'utf8');
const repertoireAudit=await readFile(path.join(root,'docs/REPERTOIRE-AUDIT.json'),'utf8');
const roadmap=await readFile(path.join(root,'docs/RESEARCH.md'),'utf8');
const escape=text=>text.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const css=(await readFile(path.join(root,'style.css'),'utf8')).replace("url('./assets/NotoSerifHebrew.ttf')",`url('data:font/ttf;base64,${font.toString('base64')}')`).replace("url('./assets/Bravura.otf')",`url('data:font/otf;base64,${musicFont.toString('base64')}')`).replace("url('./assets/ShlomoStam.ttf')",`url('data:font/ttf;base64,${scrollFont.toString('base64')}')`);
let standalone=html.replace(`<link rel="stylesheet" href="./style.css?v=${version}">`,()=>`<style>${css}</style>`)
 .replace(`<script defer src="./app.bundle.js?v=${version}"></script>`,()=>`<script id="source-pitch-packets" type="application/json">${JSON.stringify(pitchPackets)}</script>${portableProgram.markup}`)
 .replaceAll('href="./docs/PRONUNCIATION-EDITION-WORDS.json"',()=>`href="data:application/json;base64,${Buffer.from(editionEvidence).toString('base64')}"`)
 .replaceAll('href="./assets/pronunciation/mam-simple-torah-sources.zip"',()=>`href="data:application/zip;base64,${editionPack.toString('base64')}"`)
 .replaceAll('href="./docs/PRONUNCIATION-SCORE-GROUPS.json"',()=>`href="data:application/json;base64,${Buffer.from(scoreGroupsEvidence).toString('base64')}"`)
 .replaceAll('href="./docs/COHEN-PROPHETICAL-SCORE.json"',()=>`href="data:application/json;base64,${Buffer.from(propheticalEvidence).toString('base64')}"`)
 .replaceAll('href="./assets/scores/cohen-1902-page547.jpg"',()=>`href="data:image/jpeg;base64,${propheticalSecondScan.toString('base64')}"`)
 .replace('src="./assets/scores/cohen-1902-prophetical-gen22.png"',()=>`src="data:image/png;base64,${propheticalScan.toString('base64')}"`)
 .replaceAll('href="./docs/SOURCE-PITCH-EVIDENCE.json"',()=>`href="data:application/json;base64,${Buffer.from(pitchEvidence).toString('base64')}"`)
 .replaceAll('href="./docs/SOURCE-PITCH-SAMPLE-AUDIT.json"',()=>`href="data:application/json;base64,${Buffer.from(pitchSampleAudit).toString('base64')}"`)
 .replaceAll('href="./assets/OFL.txt"','href="#license-notices"').replaceAll('href="./assets/havarotjs-LICENSE.txt"','href="#license-notices"')
 .replaceAll('href="./assets/Bravura-OFL.txt"','href="#license-notices"')
 .replaceAll('href="./assets/ShlomoStam-OFL.txt"','href="#license-notices"').replaceAll('href="./assets/layout/tikkun-MIT.txt"','href="#license-notices"')
 .replaceAll('href="./docs/SCROLL-SOURCES.json"',()=>`href="data:application/json;base64,${Buffer.from(layoutEvidence).toString('base64')}"`)
 .replaceAll('href="./assets/layout/tikkun-torah-sources.zip"',()=>`href="data:application/zip;base64,${layoutPack.toString('base64')}"`)
 .replace('src="./assets/references/Bereshit-H.mp3"',()=>`src="data:audio/mpeg;base64,${haftarahAudio.toString('base64')}"`)
 .replace('src="./assets/references/Bereshit-1.mp3"',()=>`src="data:audio/mpeg;base64,${referenceAudio.toString('base64')}"`)
 .replace('id="voice-studies"','id="voice-studies" data-audio-base="https://kaphtziel.com/tropetrain/"')
 .replace('data-included-verse="./assets/voice-studies/fellman-rh-2018/RH2-22-01H.mp3"',()=>`data-included-verse="data:audio/mpeg;base64,${includedVerseAudio.toString('base64')}"`)
 .replace('src="./assets/voice-studies/esther-seed.mp3"',()=>`src="data:audio/mpeg;base64,${voiceStudyAudio.toString('base64')}"`)
 .replaceAll('href="./assets/pronunciation/NOTICE.txt"','href="#pronunciation-notices"')
 .replaceAll('href="./docs/PRONUNCIATION-UNDERLAY.json"',()=>`href="data:application/json;base64,${Buffer.from(underlayEvidence).toString('base64')}"`)
 .replaceAll('href="./docs/PRONUNCIATION-SEGMENTS.json"',()=>`href="data:application/json;base64,${Buffer.from(segmentsEvidence).toString('base64')}"`)
 .replaceAll('href="./docs/PRONUNCIATION-SEGMENT-ALIGNMENT.json"',()=>`href="data:application/json;base64,${Buffer.from(segmentAlignmentEvidence).toString('base64')}"`)
 .replaceAll('href="./assets/pronunciation/phonetic-mam-computation-sources.zip"',()=>`href="data:application/zip;base64,${computationSources.toString('base64')}"`)
 .replaceAll('href="./docs/PRONUNCIATION-ALIGNMENT.json"',()=>`href="data:application/json;base64,${Buffer.from(pronunciationEvidence).toString('base64')}"`)
 .replaceAll('href="./docs/PRONUNCIATION-WRITTEN-VARIANTS.json"',()=>`href="data:application/json;base64,${Buffer.from(writtenVariantEvidence).toString('base64')}"`)
 .replaceAll('href="./assets/pronunciation/phonetic-mam-torah-sources.zip"',()=>`href="data:application/zip;base64,${pronunciationPack.toString('base64')}"`)
 .replaceAll('href="./docs/JOINT-CHANT-PRONUNCIATION.json"',()=>`href="data:application/json;base64,${Buffer.from(jointEvidence).toString('base64')}"`)
 .replaceAll('href="./docs/PRONUNCIATION-NOTE-CORRESPONDENCE.json"',()=>`href="data:application/json;base64,${Buffer.from(noteCorrespondenceEvidence).toString('base64')}"`)
 .replaceAll('href="./docs/SOURCE-WORD-WINDOWS.json"',()=>`href="data:application/json;base64,${Buffer.from(sourceWindowsEvidence).toString('base64')}"`)
 .replaceAll('href="./docs/PRONUNCIATION-LETTER-CLUSTERS.json"',()=>`href="data:application/json;base64,${Buffer.from(letterClusterEvidence).toString('base64')}"`)
 .replaceAll('href="./docs/CHANT-COVERAGE.json"',()=>`href="data:application/json;base64,${Buffer.from(chantEvidence).toString('base64')}"`)
 .replaceAll('href="./assets/voice-studies/NOTICE.txt"','href="#voice-study-notices"')
 .replaceAll('href="./docs/VOICE-STUDIES.json"',()=>`href="data:application/json;base64,${Buffer.from(voiceStudyEvidence).toString('base64')}"`)
 .replaceAll('href="./assets/references/NOTICE.txt"','href="#license-notices"')
 .replaceAll('src="./assets/scores/cohen-1902-genesis22.png"',()=>`src="data:image/png;base64,${printedScan.toString('base64')}"`)
 .replaceAll('href="./assets/scores/cohen-1902-genesis22.png"',()=>`href="data:image/png;base64,${printedScan.toString('base64')}"`)
 .replace('src="./assets/scores/cohen-1902-alternate-score.png"',()=>`src="data:image/png;base64,${alternateScan.toString('base64')}"`)
 .replace('src="./assets/scores/cohen-1902-munah-revia.png"',()=>`src="data:image/png;base64,${patternScan.toString('base64')}"`)
 .replaceAll('href="./assets/scores/cohen-1902-munah-revia.png"',()=>`href="data:image/png;base64,${patternScan.toString('base64')}"`)
 .replace('src="./assets/scores/cohen-1902-pentateuch-row-a.png"',()=>`src="data:image/png;base64,${patternRow.toString('base64')}"`)
 .replaceAll('href="./assets/scores/cohen-1902-pentateuch-row-a.png"',()=>`href="data:image/png;base64,${patternRow.toString('base64')}"`)
 .replaceAll('href="./docs/PRINTED-PATTERNS.json"',()=>`href="data:application/json;base64,${Buffer.from(patternEvidence).toString('base64')}"`)
 .replaceAll('href="./docs/PRINTED-SCORE.json"',()=>`href="data:application/json;base64,${Buffer.from(printedEvidence).toString('base64')}"`)
 .replaceAll('src="./assets/scores/baer-1894-genesis1.png"',()=>`src="data:image/png;base64,${baerScan.toString('base64')}"`)
 .replaceAll('href="./assets/scores/baer-1894-genesis1.png"',()=>`href="data:image/png;base64,${baerScan.toString('base64')}"`)
 .replaceAll('href="./docs/BAER-GENESIS-SCORE.json"',()=>`href="data:application/json;base64,${Buffer.from(baerEvidence).toString('base64')}"`)
 .replaceAll('href="./docs/BAER-NOTE-CORRESPONDENCE.json"',()=>`href="data:application/json;base64,${Buffer.from(baerLinks).toString('base64')}"`)
 .replaceAll('href="./docs/CALENDAR-SOURCES.json"',()=>`href="data:application/json;base64,${Buffer.from(calendarEvidence).toString('base64')}"`)
 .replaceAll('href="./docs/CALENDAR-RELATED-AUDIT.json"',()=>`href="data:application/json;base64,${Buffer.from(calendarRelatedAudit).toString('base64')}"`)
 .replaceAll('href="./docs/TORAH-NUMBERING-SOURCES.json"',()=>`href="data:application/json;base64,${Buffer.from(numberingEvidence).toString('base64')}"`)
 .replaceAll('href="./data/calendar/torah-verse-numbering.json"',()=>`href="data:application/json;base64,${Buffer.from(numberingData).toString('base64')}"`)
 .replaceAll('href="./docs/HEBREW-DATE-SOURCES.json"',()=>`href="data:application/json;base64,${Buffer.from(dateEvidence).toString('base64')}"`)
 .replaceAll('href="./data/calendar/hebrew-date-sources.zip"',()=>`href="data:application/zip;base64,${dateSources.toString('base64')}"`)
 .replaceAll('href="./docs/REPERTOIRE-SOURCES.json"',()=>`href="data:application/json;base64,${Buffer.from(repertoireEvidence).toString('base64')}"`)
 .replaceAll('href="./docs/REPERTOIRE-AUDIT.json"',()=>`href="data:application/json;base64,${Buffer.from(repertoireAudit).toString('base64')}"`)
 .replaceAll('href="./docs/RESEARCH.md"','href="#standalone-roadmap"')
 .replace('<footer>',()=>`<details id="pronunciation-notices"><summary>Pronunciation source attribution</summary><pre style="white-space:pre-wrap;overflow-wrap:anywhere;font:12px/1.6 monospace">${escape(pronunciationNotice)}</pre></details><details id="voice-study-notices"><summary>Voice-study recording attribution</summary><pre style="white-space:pre-wrap;overflow-wrap:anywhere;font:12px/1.6 monospace">${escape(voiceStudyNotice)}</pre></details><details id="standalone-roadmap"><summary>Evidence map & full roadmap</summary><pre style="white-space:pre-wrap;overflow-wrap:anywhere;font:13px/1.7 monospace">${escape(roadmap)}</pre></details><details id="license-notices"><summary>Font, software, recording and score sources</summary><pre style="white-space:pre-wrap;overflow-wrap:anywhere;font:12px/1.6 monospace">${escape(fontLicense)}\n\n${escape(musicFontLicense)}\n\n${escape(license)}\n\n${escape(referenceNotice)}\n\n${escape(scrollFontLicense)}\n\n${escape(layoutLicense)}\n\n${escape(layoutEvidence)}\n\n${escape(printedEvidence)}</pre></details><footer>`);
for(const scan of highHolidayScans)standalone=standalone.replaceAll(`src="./${scan.file}"`,()=>`src="data:image/png;base64,${scan.raw.toString('base64')}"`);
standalone=standalone.replaceAll('href="./docs/BAER-HIGH-HOLIDAY-SCORE.json"',()=>`href="data:application/json;base64,${Buffer.from(highHolidayEvidence).toString('base64')}"`);
for(const [relative,mime] of [['docs/IDELSOHN-NO267-SMALL-NOTE-STUDY.json','application/json'],['docs/IDELSOHN-NO266-PLAYBACK.json','application/json'],['assets/pronunciation/printed-mam-fitting-NOTICE.txt','text/plain'],['assets/scores/idelsohn-no268-NOTICE.txt','text/plain'],['docs/IDELSOHN-NO268-SCORE.json','application/json'],['assets/scores/idelsohn-1929-no268.jpg','image/jpeg'],['docs/RECORDING-GROUP-WORD-DRAFT.json','application/json'],['docs/RECORDING-TIMING-GROUPS.json','application/json'],['docs/MODERN-FINAL-CONSONANTS.json','application/json'],['docs/MODERN-FINAL-NOTE-LINKS.json','application/json'],['docs/MODERN-PHONOLOGY.json','application/json'],['docs/MODERN-PHONOLOGY-NOTE-LINKS.json','application/json'],['assets/pronunciation/phonikud-NOTICE.txt','text/plain'],['assets/pronunciation/phonikud-code-reference.zip','application/zip'],['docs/SOURCE-RECALL.json','application/json'],['docs/SOURCE-PHRASES.json','application/json'],['docs/SOURCE-PHRASE-PLAYBACK.json','application/json'],['assets/structure/NOTICE.txt','text/plain'],['docs/COHEN-PENITENTIAL-PLAYBACK.json','application/json'],['docs/COHEN-PENITENTIAL-SCORE.json','application/json'],['assets/scores/cohen-1902-penitential-gen22.png','image/png'],['assets/scores/cohen-1902-page547.jpg','image/jpeg'],['docs/PRONUNCIATION-SPAN-FOLLOW.json','application/json'],['docs/SOURCE-GROUP-TIMING.json','application/json'],['docs/SOURCE-JOINT-PLAYBACK.json','application/json'],['docs/SOURCE-READING-CHOICES.json','application/json'],['docs/SOURCE-READING-PLAYBACK.json','application/json'],['docs/PRONUNCIATION-NOTE-PROPOSALS.json','application/json'],['docs/SOURCE-SYLLABLE-PLAYBACK.json','application/json'],['docs/KHAN-TIBERIAN-GENESIS.json','application/json'],['assets/pronunciation/khan-tiberian-genesis-sources.zip','application/zip'],['docs/ASAEL-VOWEL-ANCHORS.json','application/json'],['assets/voice-studies/asael-vowel-anchor-sources.zip','application/zip'],['docs/ASAEL-PHONETIC-WORDS.json','application/json'],['assets/voice-studies/asael-phonetic-word-sources.zip','application/zip'],['docs/ASAEL-WORD-SUPPORT.json','application/json'],['assets/voice-studies/asael-word-support-sources.zip','application/zip'],['docs/ASAEL-SOURCE-CATALOG.json','application/json'],['assets/voice-studies/asael-catalog-sources.zip','application/zip'],['docs/ASAEL-CORPUS-SOURCE-INDEX.json','application/json'],['docs/ASAEL-PAIRED-CHANT.json','application/json'],['docs/PRONUNCIATION-PHONOLOGY.json','application/json'],['docs/HISTORICAL-PRONUNCIATION-PROFILES.json','application/json'],['docs/PRONUNCIATION-REPERTOIRE-UNDERLAY.json','application/json'],['docs/PRONUNCIATION-REPERTOIRE-UNDERLAY-ALIGNMENT.json','application/json'],['assets/pronunciation/phonetic-mam-repertoire-sources.zip','application/zip'],['docs/PRONUNCIATION-REPERTOIRE-ALIGNMENT.json','application/json'],['docs/HAFTARAH-PRACTICE.json','application/json'],['docs/HAFTARAH-REFERENCE-AUDIT.json','application/json'],['data/references/haftarah-sources.zip','application/zip'],['docs/SYLLABLE-TIMING-DRAFT.json','application/json'],['docs/PRONUNCIATION-IPA-COVERAGE.json','application/json'],['docs/SINGING-SOURCE-RESEARCH.json','application/json'],['docs/SOURCE-DURATION-REVIEW.json','application/json'],['docs/PRONUNCIATION-IPA-PROPOSAL.json','application/json'],['assets/pronunciation/ipa-proposal-sources.zip','application/zip'],['docs/MEASURED-TONES.json','application/json'],['docs/MEASURED-TONE-COVERAGE.json','application/json'],['docs/RECORDED-PITCH-PROCESSING.json','application/json'],['vendor/signalsmith-stretch/NOTICE.txt','text/plain'],['vendor/signalsmith-stretch/LICENSE.txt','text/plain'],['docs/PRONUNCIATION-IMPLICIT-READING.json','application/json'],['assets/pronunciation/implicit-reading-source.zip','application/zip']]){
 const bytes=await readFile(path.join(root,relative)),embedded=`data:${mime};base64,${bytes.toString('base64')}`;standalone=standalone.replaceAll(`href="./${relative}"`,()=>`href="${embedded}"`);
 if(mime.startsWith('image/'))standalone=standalone.replaceAll(`src="./${relative}"`,()=>`src="${embedded}"`);
}
const sharedImages=shareEmbeddedImages(standalone);standalone=sharedImages.html;
console.log(`Reused ${sharedImages.count} embedded original-image links, saving ${sharedImages.savedBytes} bytes without changing image data.`);
await writePortableArtifact(root,standalone);
console.log(`Portable program gzip preserves ${portableProgram.proof.programBytes} exact bytes; saves ${portableProgram.savedProgramBytes} program bytes before HTML quoting.`);
console.log('Built classic-script app.bundle.js and self-contained TropeTrain.html.');
