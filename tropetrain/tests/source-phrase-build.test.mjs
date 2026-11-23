import test from'node:test';import assert from'node:assert/strict';import{readFileSync}from'node:fs';import{createHash}from'node:crypto';import{gunzipSync}from'node:zlib';
const read=p=>readFileSync(new URL('../'+p,import.meta.url));
test('normal and portable distributions retain the exact licensed source packet, audits, explicit gaps and controls below the host byte limit',()=>{
 const html=read('TropeTrain.html').toString(),bundle=read('app.bundle.js').toString(),packet=read('data/structure/torah-phrases.json.gz'),data=JSON.parse(gunzipSync(packet)),audit=JSON.parse(read('docs/SOURCE-PHRASE-PLAYBACK.json'));
 assert(bundle.includes(packet.toString('base64')));assert(html.includes(packet.toString('base64')));
 for(const path of['docs/SOURCE-PHRASES.json','docs/SOURCE-PHRASE-PLAYBACK.json','assets/structure/NOTICE.txt'])assert(html.includes('data:'+(path.endsWith('.txt')?'text/plain':'application/json')+';base64,'+read(path).toString('base64')));
 for(const row of audit.inputs)assert.equal(createHash('sha256').update(read(row.path)).digest('hex'),row.sha256,row.path);
 assert.equal(data.source.license,'CC-BY-4.0');assert.equal(data.source.review,null);assert.equal(audit.singingVoice,null);assert.equal(audit.historicalMusicalRealization,null);assert.equal(audit.counts.availableWords,58802);assert.equal(audit.counts.withheldWords,21183);assert.equal(audit.counts.splitMaqafRanges,0);
 for(const id of['source-phrase-choice','source-phrase-select','source-phrase-status'])assert(html.includes('id="'+id+'"'));
 assert(read('TropeTrain.html').length<100*1024*1024);assert(!html.includes('href="./assets/structure/NOTICE.txt"'));assert(!html.includes('href="./docs/SOURCE-PHRASES.json"'));
});
