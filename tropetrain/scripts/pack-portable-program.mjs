import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {startPortableProgram} from '../portable-program-loader.js';
import {restorePortableEvidence} from '../portable-evidence-loader.js';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
// Compress only the exact external program. Preserve the page, source records,
// images, notices and canonical code bytes; no identifier/syntax changes.
export function packPortableProgram(program){
 const bytes=Buffer.from(program,'utf8'),gzip=gzipSync(bytes,{level:9}),proof={format:'tropetrain-portable-program-v1',encoding:'gzip+base64',programBytes:bytes.length,programSha256:sha(bytes),gzipBytes:gzip.length,gzipSha256:sha(gzip)};
 const markup='<script id="portable-program-proof" type="application/json">'+JSON.stringify(proof)+'</script><script id="portable-program-data" type="application/octet-stream">'+gzip.toString('base64')+'</script><script id="portable-program-loader">('+startPortableProgram.toString()+')(null,{beforeStart:()=>('+restorePortableEvidence.toString()+')()});</script>';
 return {markup,proof,savedProgramBytes:bytes.length-Buffer.byteLength(markup)};
}
