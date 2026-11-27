// Independent Node decoder for assertions about the actual built artifact.
// Size limits must still inspect the physical file, never this reconstruction.
import assert from 'node:assert/strict';
import {statSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {decodePortableProgramTransport} from '../scripts/decode-portable-program.mjs';
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
 const html=raw.toString(),m=html.match(/<script id="portable-program-proof" type="application\/json">([^<]+)<\/script><script id="portable-program-data" type="application\/octet-stream">([^<]+)<\/script><script id="portable-program-loader">[\s\S]*?<\/script>/);
 assert(m,'Actual portable program envelope is present');const proof=JSON.parse(m[1]),gzip=decodePortableProgramTransport(m[2],proof);assert.equal(gzip.length,proof.gzipBytes);assert.equal(sha(gzip),proof.gzipSha256);const bytes=gunzipSync(gzip);assert.equal(bytes.length,proof.programBytes);assert.equal(sha(bytes),proof.programSha256);assert.equal(new TextDecoder('utf-8',{fatal:true}).decode(bytes),bytes.toString('utf8'));return {bytes,proof,match:m,gzip};
}
export function restoredPortableHtml(raw){
 let html=restoredPortableEvidenceHtml(raw);if(!html.includes('<script id="portable-program-proof"'))return html;
 const decoded=portableProgramBytes(html),images=html.match(/<script id="portable-program-images-proof" type="application\/json">([^<]+)<\/script>/);
 if(images){
  const proof=JSON.parse(images[1]);assert.equal(proof.format,'tropetrain-portable-program-images-v1');assert.equal(proof.programBytes,decoded.bytes.length);assert.equal(proof.programSha256,sha(decoded.bytes));
  const candidates=[...new Set(decoded.bytes.toString().match(/data:image\/[a-z+.-]+;base64,[A-Za-z0-9+/]+={0,2}/g)??[])],records=proof.records.map((r,i)=>{assert.equal(r.id,String(i));const uri=candidates.find(value=>sha(Buffer.from(value))===r.dataUriSha256);assert(uri,'Complete original image exists in the independently decoded program');const bytes=Buffer.from(uri.split(',')[1],'base64');assert.equal(bytes.length,r.bytes);assert.equal(sha(bytes),r.sha256);assert.equal(Buffer.byteLength(uri),r.dataUriBytes);return {...r,uri};}),counts=records.map(()=>0);
  html=html.replace(images[0],'').replace(/data-portable-program-image="([0-9]+)"/g,(_,id)=>{const r=records[Number(id)];assert(r&&r.id===id);counts[Number(id)]++;return 'src="'+r.uri+'"';});assert.deepEqual(counts,records.map(r=>r.uses));assert.equal(counts.reduce((n,v)=>n+v,0),proof.imageCount);
 }
 const {bytes,match}=portableProgramBytes(html);return html.slice(0,match.index)+'<script>'+bytes.toString('utf8').replaceAll('</script','<\\/script')+'</script>'+html.slice(match.index+match[0].length);
}

export function portableFileBytes(){return statSync(new URL('../TropeTrain.html',import.meta.url)).size;}
