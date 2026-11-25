// Independent Node decoder for assertions about the actual built artifact.
// Size limits must still inspect the physical file, never this reconstruction.
import assert from 'node:assert/strict';
import {statSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const sha=b=>createHash('sha256').update(b).digest('hex');
export function portableProgramBytes(raw){
 const html=raw.toString(),m=html.match(/<script id="portable-program-proof" type="application\/json">([^<]+)<\/script><script id="portable-program-data" type="application\/octet-stream">([A-Za-z0-9+/=]+)<\/script><script id="portable-program-loader">[\s\S]*?<\/script>/);
 assert(m,'Actual portable program envelope is present');const proof=JSON.parse(m[1]),gzip=Buffer.from(m[2],'base64');assert.equal(proof.format,'tropetrain-portable-program-v1');assert.equal(proof.encoding,'gzip+base64');assert.equal(gzip.length,proof.gzipBytes);assert.equal(sha(gzip),proof.gzipSha256);const bytes=gunzipSync(gzip);assert.equal(bytes.length,proof.programBytes);assert.equal(sha(bytes),proof.programSha256);assert.equal(new TextDecoder('utf-8',{fatal:true}).decode(bytes),bytes.toString('utf8'));return {bytes,proof,match:m};
}
export function restoredPortableHtml(raw){
 const html=raw.toString();if(!html.includes('<script id="portable-program-proof"'))return html;
 const {bytes,match}=portableProgramBytes(html);return html.slice(0,match.index)+'<script>'+bytes.toString('utf8').replaceAll('</script','<\\/script')+'</script>'+html.slice(match.index+match[0].length);
}

export function portableFileBytes(){return statSync(new URL('../TropeTrain.html',import.meta.url)).size;}
