import {restorePortablePitchPackets} from '../portable-pitch-packet-loader.js';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {startPortableProgram} from '../portable-program-loader.js';
import {restorePortableEvidence} from '../portable-evidence-loader.js';
import {restorePortableProgramImages} from '../portable-program-images.js';
import {restorePortableSourceImages} from '../portable-source-image-loader.js';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
export function encodePortableProgramBytes(bytes){
 const alphabet='0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!#$%&()*+-;:=>?@^_`{|}~',parts=[];let part='';
 for(let i=0;i<bytes.length;i+=4){
  let value=(bytes[i]??0)*0x1000000+(bytes[i+1]??0)*0x10000+(bytes[i+2]??0)*0x100+(bytes[i+3]??0),block='';
  for(let j=0;j<5;j++){block=alphabet[value%85]+block;value=Math.floor(value/85);}
  part+=block;if(part.length>=40000){parts.push(part);part='';}
 }
 parts.push(part);return parts.join('');
}
export function encodePortableProgramBytes93(bytes){
 // Two printable ASCII digits carry thirteen bits, or fourteen for the
 // 457 remaining values. Excluding '<' keeps the raw script carrier inert.
 const alphabet=Array.from({length:94},(_,i)=>String.fromCharCode(i+33)).filter(c=>c!=='<').join(''),parts=[];let part='',bits=0,count=0;
 for(const byte of bytes){
  bits|=byte<<count;count+=8;
  if(count>13){let value=bits&8191;const width=value>456?13:14;if(width===14)value=bits&16383;bits>>>=width;count-=width;part+=alphabet[value%93]+alphabet[Math.floor(value/93)];if(part.length>=40000){parts.push(part);part='';}}
 }
 if(count){part+=alphabet[bits%93];if(count>7||bits>92)part+=alphabet[Math.floor(bits/93)];}
 parts.push(part);return parts.join('');
}
// Compress only the exact external program. Preserve the page, source records,
// images, notices and canonical code bytes; no identifier/syntax changes.
export function packPortableProgram(program,{compressedGzip=null,sourceImages=false,pitchPackets=false}={}){
 const bytes=Buffer.from(program,'utf8'),gzip=compressedGzip===null?gzipSync(bytes,{level:9}):Buffer.from(compressedGzip);
 if(!gunzipSync(gzip,{maxOutputLength:Math.max(1,bytes.length)}).equals(bytes))throw Error('Portable gzip changed the exact normal program.');
 const proof={format:'tropetrain-portable-program-v3',encoding:'gzip+html-base93',programBytes:bytes.length,programSha256:sha(bytes),gzipBytes:gzip.length,gzipSha256:sha(gzip)};
 const sourceInitialization=sourceImages?'const sourceImages=await ('+restorePortableSourceImages.toString()+')({required:true});':'';
 const pitchInitialization=pitchPackets?'const pitchPackets=await ('+restorePortablePitchPackets.toString()+')({required:true});':'';
 const markup='<script id="portable-program-proof" type="application/json">'+JSON.stringify(proof)+'</script><script id="portable-program-data" type="application/octet-stream">'+encodePortableProgramBytes93(gzip)+'</script><script id="portable-program-loader">('+startPortableProgram.toString()+')(null,{beforeStart:async({program})=>{'+pitchInitialization+sourceInitialization+'const images=await ('+restorePortableProgramImages.toString()+')(program);const evidence=await ('+restorePortableEvidence.toString()+')();return {...evidence,sharedImages:images'+(sourceImages?',sourceImages':'')+(pitchPackets?',pitchPackets':'')+'};}});</script>';
 return {markup,proof,savedProgramBytes:bytes.length-Buffer.byteLength(markup)};
}
