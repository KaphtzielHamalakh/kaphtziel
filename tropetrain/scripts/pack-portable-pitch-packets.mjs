// Exact transport for the original pitch-packet JSON, not new pitch data.
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {encodePortableProgramBytes93} from './pack-portable-program.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
export function packPortablePitchPackets(original,{compressedGzip=null}={}){
 const bytes=Buffer.from(original),records=JSON.parse(bytes.toString('utf8'));
 if(!records||typeof records!=='object'||Array.isArray(records)||Object.keys(records).length<1||Object.keys(records).length>512)throw Error('Invalid pitch-packet inventory.');
 const gzip=compressedGzip===null?gzipSync(bytes,{level:9}):Buffer.from(compressedGzip);
 if(bytes.length>64*1024*1024||gzip.length>64*1024*1024||!gunzipSync(gzip,{maxOutputLength:Math.max(1,bytes.length)}).equals(bytes))throw Error('Pitch packet compression changed its original bytes or exceeded a bound.');
 const proof={format:'tropetrain-source-pitch-packets-v1',encoding:'gzip+html-base93',recordCount:Object.keys(records).length,packetBytes:bytes.length,packetSha256:sha(bytes),gzipBytes:gzip.length,gzipSha256:sha(gzip)};
 const markup='<script id="source-pitch-packets" type="application/json"></script><script id="portable-pitch-packet-proof" type="application/json">'+JSON.stringify(proof)+'</script><script id="portable-pitch-packet-data" type="application/octet-stream">'+encodePortableProgramBytes93(gzip)+'</script>';
 return {markup,proof,physicalCarrierBytes:Buffer.byteLength(markup),savedHtmlBytes:bytes.length+Buffer.byteLength('<script id="source-pitch-packets" type="application/json"></script>')-Buffer.byteLength(markup)};
}
