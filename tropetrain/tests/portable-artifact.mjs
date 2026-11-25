// Independent Node decoder for assertions about the actual built artifact.
// Size limits must still inspect the physical file, never this reconstruction.
import assert from 'node:assert/strict';
import {statSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const sha=b=>createHash('sha256').update(b).digest('hex');
export function portableEvidenceBytes(raw){
 const html=raw.toString(),m=html.match(/<script id="portable-evidence-proof" type="application\/json">([^<]+)<\/script><script id="portable-evidence-data" type="application\/octet-stream">([A-Za-z0-9+/=]+)<\/script>/);
 if(!m){assert(!html.includes('data-portable-evidence='),'Packed evidence requires its actual envelope');return {proof:null,records:[],match:null};}
 const proof=JSON.parse(m[1]),gzip=Buffer.from(m[2],'base64');assert.equal(proof.format,'tropetrain-portable-evidence-v1');assert.equal(proof.encoding,'gzip+base64');assert.equal(gzip.length,proof.gzipBytes);assert.equal(gzip.toString('base64'),m[2]);assert.equal(sha(gzip),proof.gzipSha256);const packet=gunzipSync(gzip);assert.equal(packet.length,proof.packetBytes);assert.equal(sha(packet),proof.packetSha256);const values=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(packet));assert.equal(values.length,proof.records.length);const records=values.map((base64,i)=>{const r=proof.records[i],bytes=Buffer.from(base64,'base64');assert.equal(r.id,String(i));assert.equal(base64,bytes.toString('base64'));assert.equal(base64.length,r.base64Bytes);assert.equal(bytes.length,r.bytes);assert.equal(sha(bytes),r.sha256);const text=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(bytes);JSON.parse(text.charCodeAt(0)===0xfeff?text.slice(1):text);return {...r,bytes,href:'data:application/json;base64,'+base64};});assert.equal(records.reduce((n,r)=>n+r.links,0),proof.linkCount);return {proof,records,match:m};
}
export function restoredPortableEvidenceHtml(raw){
 let html=raw.toString();const {proof,records,match}=portableEvidenceBytes(html);if(!proof)return html;html=html.slice(0,match.index)+html.slice(match.index+match[0].length);const counts=Array(records.length).fill(0);html=html.replace(/href="#startup-status" data-portable-evidence="([0-9]+)"/g,(_,id)=>{const r=records[Number(id)];assert(r&&r.id===id);counts[Number(id)]++;return 'href="'+r.href+'"';});assert.deepEqual(counts,records.map(r=>r.links));assert(!html.includes('data-portable-evidence='));return html;
}
export function portableProgramBytes(raw){
 const html=raw.toString(),m=html.match(/<script id="portable-program-proof" type="application\/json">([^<]+)<\/script><script id="portable-program-data" type="application\/octet-stream">([A-Za-z0-9+/=]+)<\/script><script id="portable-program-loader">[\s\S]*?<\/script>/);
 assert(m,'Actual portable program envelope is present');const proof=JSON.parse(m[1]),gzip=Buffer.from(m[2],'base64');assert.equal(proof.format,'tropetrain-portable-program-v1');assert.equal(proof.encoding,'gzip+base64');assert.equal(gzip.length,proof.gzipBytes);assert.equal(sha(gzip),proof.gzipSha256);const bytes=gunzipSync(gzip);assert.equal(bytes.length,proof.programBytes);assert.equal(sha(bytes),proof.programSha256);assert.equal(new TextDecoder('utf-8',{fatal:true}).decode(bytes),bytes.toString('utf8'));return {bytes,proof,match:m};
}
export function restoredPortableHtml(raw){
 const html=restoredPortableEvidenceHtml(raw);if(!html.includes('<script id="portable-program-proof"'))return html;
 const {bytes,match}=portableProgramBytes(html);return html.slice(0,match.index)+'<script>'+bytes.toString('utf8').replaceAll('</script','<\\/script')+'</script>'+html.slice(match.index+match[0].length);
}

export function portableFileBytes(){return statSync(new URL('../TropeTrain.html',import.meta.url)).size;}
