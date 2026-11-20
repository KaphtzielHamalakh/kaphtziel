import {build} from 'esbuild';
import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {gzipSync} from 'node:zlib';
import './import-printed-score.mjs';
import './import-printed-patterns.mjs';

const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const version=JSON.parse(await readFile(path.join(root,'package.json'),'utf8')).version;
const license=await readFile(path.join(root,'node_modules/havarotjs/LICENSE'),'utf8');
const manifest=JSON.parse(await readFile(path.join(root,'data/torah/manifest.json'),'utf8'));
const books=await Promise.all(manifest.books.map(b=>readFile(path.join(root,'data/torah',b.file),'utf8').then(JSON.parse)));
const corpus=JSON.stringify({manifest,books});
const encoded=gzipSync(corpus,{level:9}).toString('base64');
const referenceEncoded=(await readFile(path.join(root,'data/references/torah-library.json.gz'))).toString('base64');
await build({absWorkingDir:root,entryPoints:['app.js'],bundle:true,format:'iife',target:['es2022'],outfile:'app.bundle.js',legalComments:'eof',charset:'utf8',banner:{js:`/*! havarotjs license:\n${license.replaceAll('*/','* /')}\n*/`},plugins:[{
  name:'embedded-corpus',setup(builder){builder.onLoad({filter:/reference-library-data\.js$/},()=>({loader:'js',contents:`
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
const font=await readFile(path.join(root,'assets/NotoSerifHebrew.ttf'));
await writeFile(path.join(root,'assets/havarotjs-LICENSE.txt'),license);
const fontLicense=await readFile(path.join(root,'assets/OFL.txt'),'utf8');
const musicFont=await readFile(path.join(root,'assets/Bravura.otf'));
const musicFontLicense=await readFile(path.join(root,'assets/Bravura-OFL.txt'),'utf8');
const referenceAudio=await readFile(path.join(root,'assets/references/Bereshit-1.mp3'));
const referenceNotice=await readFile(path.join(root,'assets/references/NOTICE.txt'),'utf8');
const printedScan=await readFile(path.join(root,'assets/scores/cohen-1902-genesis22.png'));
const alternateScan=await readFile(path.join(root,'assets/scores/cohen-1902-alternate-score.png'));
const printedEvidence=await readFile(path.join(root,'docs/PRINTED-SCORE.json'),'utf8');
const patternScan=await readFile(path.join(root,'assets/scores/cohen-1902-munah-revia.png'));
const patternRow=await readFile(path.join(root,'assets/scores/cohen-1902-pentateuch-row-a.png'));
const patternEvidence=await readFile(path.join(root,'docs/PRINTED-PATTERNS.json'),'utf8');
const roadmap=await readFile(path.join(root,'docs/RESEARCH.md'),'utf8');
const escape=text=>text.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const css=(await readFile(path.join(root,'style.css'),'utf8')).replace("url('./assets/NotoSerifHebrew.ttf')",`url('data:font/ttf;base64,${font.toString('base64')}')`).replace("url('./assets/Bravura.otf')",`url('data:font/otf;base64,${musicFont.toString('base64')}')`);
const standalone=html.replace(`<link rel="stylesheet" href="./style.css?v=${version}">`,()=>`<style>${css}</style>`)
 .replace(`<script defer src="./app.bundle.js?v=${version}"></script>`,()=>`<script>${script.replaceAll('</script','<\\/script')}</script>`)
 .replaceAll('href="./assets/OFL.txt"','href="#license-notices"').replaceAll('href="./assets/havarotjs-LICENSE.txt"','href="#license-notices"')
 .replaceAll('href="./assets/Bravura-OFL.txt"','href="#license-notices"')
 .replace('src="./assets/references/Bereshit-1.mp3"',()=>`src="data:audio/mpeg;base64,${referenceAudio.toString('base64')}"`)
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
 .replaceAll('href="./docs/RESEARCH.md"','href="#standalone-roadmap"')
 .replace('<footer>',()=>`<details id="standalone-roadmap"><summary>Evidence map & full roadmap</summary><pre style="white-space:pre-wrap;overflow-wrap:anywhere;font:13px/1.7 monospace">${escape(roadmap)}</pre></details><details id="license-notices"><summary>Font, software, recording and score sources</summary><pre style="white-space:pre-wrap;overflow-wrap:anywhere;font:12px/1.6 monospace">${escape(fontLicense)}\n\n${escape(musicFontLicense)}\n\n${escape(license)}\n\n${escape(referenceNotice)}\n\n${escape(printedEvidence)}</pre></details><footer>`);
await writeFile(path.join(root,'TropeTrain.html'),standalone);
console.log('Built classic-script app.bundle.js and self-contained TropeTrain.html.');
