import test from'node:test';import assert from'node:assert/strict';import{readFileSync}from'node:fs';import{shareEmbeddedImages}from'../scripts/share-embedded-images.mjs';
import {restoredPortableHtml}from'./portable-artifact.mjs';

test('portable image sharing preserves exact original bytes and unrelated links with initialization before the app',()=>{
 const uri='data:image/png;base64,AQIDBA==',other='data:image/png;base64,BAUG',source=`<a href="${uri}">scan</a><img id="scan-1" src="${uri}"><a href="${other}">other</a><a href="./docs/record.json">evidence</a><script id="source-pitch-packets" type="application/json">{}</script><script>app()</script>`;
 const result=shareEmbeddedImages(source);assert.equal(result.count,1);assert(result.html.includes(`id="scan-1" src="${uri}"`));assert(result.html.includes('href="#scan-1" data-embedded-image="scan-1"'));assert(result.html.includes(`href="${other}"`));assert(result.html.includes('href="./docs/record.json"'));assert.equal(result.html.split(uri).length-1,1);assert(result.html.indexOf('id="standalone-image-links"')<result.html.indexOf('id="source-pitch-packets"'));assert.equal(shareEmbeddedImages(result.html).count,0);
});

test('every shared full-resolution source link has its complete embedded image and the portable keeps all four original scans',()=>{
 const html=restoredPortableHtml(readFileSync(new URL('../TropeTrain.html',import.meta.url),'utf8')),links=[...html.matchAll(/href="#([^"]+)" data-embedded-image="\1"/g)];assert.equal(links.length,6);
 const files={'cohen-penitential-second-scan':'cohen-1902-page547.jpg','printed-score-scan':'cohen-1902-genesis22.png','baer-score-scan':'baer-1894-genesis1.png','pattern-source-scan':'cohen-1902-munah-revia.png','pattern-context-scan':'cohen-1902-pentateuch-row-a.png'};
 for(const [,id]of links){const raw=readFileSync(new URL('../assets/scores/'+files[id],import.meta.url));assert(html.includes('data:image/'+(files[id].endsWith('.jpg')?'jpeg':'png')+';base64,'+raw.toString('base64')));assert(html.includes(`id="${id}"`));}
});
