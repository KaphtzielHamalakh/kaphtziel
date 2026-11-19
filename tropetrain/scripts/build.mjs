import {build} from 'esbuild';
import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {gzipSync} from 'node:zlib';

const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const version=JSON.parse(await readFile(path.join(root,'package.json'),'utf8')).version;
const license=await readFile(path.join(root,'node_modules/havarotjs/LICENSE'),'utf8');
const manifest=JSON.parse(await readFile(path.join(root,'data/torah/manifest.json'),'utf8'));
const books=await Promise.all(manifest.books.map(b=>readFile(path.join(root,'data/torah',b.file),'utf8').then(JSON.parse)));
const corpus=JSON.stringify({manifest,books});
const encoded=gzipSync(corpus,{level:9}).toString('base64');
await build({absWorkingDir:root,entryPoints:['app.js'],bundle:true,format:'iife',target:['es2022'],outfile:'app.bundle.js',legalComments:'eof',charset:'utf8',banner:{js:`/*! havarotjs license:\n${license.replaceAll('*/','* /')}\n*/`},plugins:[{
  name:'embedded-corpus',setup(builder){builder.onLoad({filter:/library-data\.js$/},()=>({loader:'js',contents:`
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
const escape=text=>text.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const css=(await readFile(path.join(root,'style.css'),'utf8')).replace("url('./assets/NotoSerifHebrew.ttf')",`url('data:font/ttf;base64,${font.toString('base64')}')`).replace("url('./assets/Bravura.otf')",`url('data:font/otf;base64,${musicFont.toString('base64')}')`);
const standalone=html.replace(`<link rel="stylesheet" href="./style.css?v=${version}">`,()=>`<style>${css}</style>`)
 .replace(`<script defer src="./app.bundle.js?v=${version}"></script>`,()=>`<script>${script.replaceAll('</script','<\\/script')}</script>`)
 .replaceAll('href="./assets/OFL.txt"','href="#license-notices"').replaceAll('href="./assets/havarotjs-LICENSE.txt"','href="#license-notices"')
 .replaceAll('href="./assets/Bravura-OFL.txt"','href="#license-notices"')
 .replace('<footer>',()=>`<details id="license-notices"><summary>Font and software licenses</summary><pre style="white-space:pre-wrap;font:12px/1.6 monospace">${escape(fontLicense)}\n\n${escape(musicFontLicense)}\n\n${escape(license)}</pre></details><footer>`);
await writeFile(path.join(root,'TropeTrain.html'),standalone);
console.log('Built classic-script app.bundle.js and self-contained TropeTrain.html.');
