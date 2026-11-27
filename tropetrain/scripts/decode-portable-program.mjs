// Independent Node-side transport audit; the browser uses its own bounded decoder.
import assert from 'node:assert/strict';
export function decodePortableProgramTransport(encoded,proof){
 assert(Number.isSafeInteger(proof.gzipBytes)&&proof.gzipBytes>0&&proof.gzipBytes<=128*1024*1024);
 if(proof.format==='tropetrain-portable-program-v1'&&proof.encoding==='gzip+base64'){
  const bytes=Buffer.from(encoded,'base64');assert.equal(bytes.length,proof.gzipBytes);assert.equal(bytes.toString('base64'),encoded);return bytes;
 }
 assert.equal(proof.format,'tropetrain-portable-program-v2');assert.equal(proof.encoding,'gzip+html-base85');
 assert.equal(encoded.length,Math.ceil(proof.gzipBytes/4)*5);
 const alphabet='0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!#$%&()*+-;:=>?@^_`{|}~',powers=[52200625,614125,7225,85,1],bytes=Buffer.alloc(encoded.length/5*4);
 for(let i=0;i<encoded.length;i+=5){
  let value=0;for(let j=0;j<5;j++){const digit=alphabet.indexOf(encoded[i+j]);assert(digit>=0,'Noncanonical portable transport character');value+=digit*powers[j];}
  assert(value<=0xffffffff,'Portable transport block overflow');bytes.writeUInt32BE(value,i/5*4);
 }
 assert(bytes.subarray(proof.gzipBytes).every(x=>x===0),'Portable transport padding changed');return bytes.subarray(0,proof.gzipBytes);
}
