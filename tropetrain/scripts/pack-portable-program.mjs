import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {startPortableProgram} from '../portable-program-loader.js';
import {restorePortableEvidence} from '../portable-evidence-loader.js';
import {restorePortableProgramImages} from '../portable-program-images.js';
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
// Compress only the exact external program. Preserve the page, source records,
// images, notices and canonical code bytes; no identifier/syntax changes.
export function packPortableProgram(program){
 const bytes=Buffer.from(program,'utf8'),gzip=gzipSync(bytes,{level:9}),proof={format:'tropetrain-portable-program-v2',encoding:'gzip+html-base85',programBytes:bytes.length,programSha256:sha(bytes),gzipBytes:gzip.length,gzipSha256:sha(gzip)};
 const markup='<script id="portable-program-proof" type="application/json">'+JSON.stringify(proof)+'</script><script id="portable-program-data" type="application/octet-stream">'+encodePortableProgramBytes(gzip)+'</script><script id="portable-program-loader">('+startPortableProgram.toString()+')(null,{beforeStart:async({program})=>{const images=await ('+restorePortableProgramImages.toString()+')(program);const evidence=await ('+restorePortableEvidence.toString()+')();return {...evidence,sharedImages:images};}});</script>';
 return {markup,proof,savedProgramBytes:bytes.length-Buffer.byteLength(markup)};
}
