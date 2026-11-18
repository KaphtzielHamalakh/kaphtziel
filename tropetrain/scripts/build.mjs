import {build} from 'esbuild';
import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
await build({absWorkingDir:root,entryPoints:['app.js'],bundle:true,format:'iife',target:['es2022'],outfile:'app.bundle.js',legalComments:'eof',charset:'utf8'});
const html=await readFile(path.join(root,'index.html'),'utf8');
const script=await readFile(path.join(root,'app.bundle.js'),'utf8');
const font=await readFile(path.join(root,'assets/NotoSerifHebrew.ttf'));
const css=(await readFile(path.join(root,'style.css'),'utf8')).replace("url('./assets/NotoSerifHebrew.ttf')",`url('data:font/ttf;base64,${font.toString('base64')}')`);
const standalone=html.replace('<link rel="stylesheet" href="./style.css">',`<style>${css}</style>`)
 .replace('<script defer src="./app.bundle.js"></script>',`<script>${script.replaceAll('</script','<\\/script')}</script>`);
await writeFile(path.join(root,'TropeTrain.html'),standalone);
console.log('Built classic-script app.bundle.js and self-contained TropeTrain.html.');
