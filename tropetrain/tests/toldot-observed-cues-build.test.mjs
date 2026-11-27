import test from'node:test';import assert from'node:assert/strict';import{readFileSync}from'node:fs';import{createHash}from'node:crypto';import{TOLDOT_OBSERVED_CUES as report}from'../toldot-observed-cues-summary.js';import{VOICE_SOURCE_RECORDINGS}from'../voice-studies.js';import{restoredPortableHtml,portableProgramBytes,portableFileBytes}from'./portable-artifact.mjs';
import {previousCompanionRecord} from './previous-companion-record.mjs';
const read=n=>readFileSync(new URL('../'+n,import.meta.url));
test('the accepted pre-Toldot source registry fingerprint is preserved after separating documented reader annotations',()=>{
 const original=VOICE_SOURCE_RECORDINGS.map(previousCompanionRecord).map(r=>{if(r.id!==report.recordId)return r;const{linkedSourcePassageEvidence,coverageLabel,coverageStatus,...raw}=r;return raw;});assert.equal(original.length,1183);assert.equal(createHash('sha256').update(JSON.stringify(original)).digest('hex'),'62cbbac06f720d148113ef9990c0f8c53c99300f56cb0a8d1ddac7b7058e6581');
});
test('normal and portable editions expose sparse cue controls, pinned evidence and opt-in original audio with no model weights',()=>{
 const physical=read('TropeTrain.html'),normal=read('index.html').toString(),portable=restoredPortableHtml(physical).toString(),program=portableProgramBytes(physical).bytes;assert.deepEqual(program,read('app.bundle.js'));
 for(const html of[normal,portable]){for(const id of['toldot-word-study','toldot-word-study-open','observed-cues-panel','observed-cues-load','observed-cues-word','observed-cues-audition','observed-cues-status'])assert(html.includes('id="'+id+'"'));assert(html.includes('355 have no agreed cue'));assert(html.includes('failed control is retained'));}
 for(const [file,mime]of[['docs/TOLDOT-OBSERVED-CUES.json','application/json'],[report.sourcePack.file,'application/zip'],['assets/voice-studies/toldot-observed-cues-NOTICE.txt','text/plain']]){assert(normal.includes('href="./'+file+'"'));assert(portable.includes('data:'+mime+';base64,'+read(file).toString('base64')));assert(read('sw.js').includes(Buffer.from('./'+file)));}
 assert(program.includes(Buffer.from(read(report.packet.file).toString('base64'))));assert(!read('sw.js').includes(Buffer.from('upload.wikimedia.org')));assert(!program.includes(Buffer.from('model.safetensors;base64')));assert(100*1024*1024-portableFileBytes(physical)>4*1024*1024);
});
