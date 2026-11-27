// Independent Node-side transport audit; the browser uses its own bounded decoder.
import assert from 'node:assert/strict';
export function decodePortableProgramTransport(encoded,proof){
 assert(Number.isSafeInteger(proof.gzipBytes)&&proof.gzipBytes>0&&proof.gzipBytes<=128*1024*1024);
 if(proof.format==='tropetrain-portable-program-v1'&&proof.encoding==='gzip+base64'){
  const bytes=Buffer.from(encoded,'base64');assert.equal(bytes.length,proof.gzipBytes);assert.equal(bytes.toString('base64'),encoded);return bytes;
 }
 if(proof.format==='tropetrain-portable-program-v3'&&proof.encoding==='gzip+html-base93'){
  assert(encoded.length>=Math.ceil(proof.gzipBytes*8/14)*2-1&&encoded.length<=Math.ceil(proof.gzipBytes*8/13)*2);
  const alphabet=Array.from({length:94},(_,i)=>String.fromCharCode(33+i)).filter(x=>x!=='<').join(''),bytes=Buffer.alloc(proof.gzipBytes);let carry=0,available=0,sourceBits=0,written=0,index=0;
  const put=value=>{assert(written<bytes.length,'Portable transport overflow');bytes[written++]=value;};
  for(;index+1<encoded.length;index+=2){
   const a=alphabet.indexOf(encoded[index]),b=alphabet.indexOf(encoded[index+1]);assert(a>=0&&b>=0,'Noncanonical portable transport character');const value=a+b*93,left=bytes.length*8-sourceBits;
   if(left<14){assert(index+2===encoded.length&&left>0);assert(left>7||value>92);assert(value<2**left,'Portable transport padding changed');}
   const width=value%8192>456?13:14;carry+=value*2**available;available+=width;sourceBits+=width;
   while(available>=8){put(carry%256);carry=Math.floor(carry/256);available-=8;}
  }
  if(index<encoded.length){const value=alphabet.indexOf(encoded[index]),left=bytes.length*8-sourceBits;assert(value>=0&&left>=1&&left<=7&&value<2**left,'Portable transport padding changed');carry+=value*2**available;put(carry%256);carry=Math.floor(carry/256);}
  assert.equal(written,bytes.length);assert.equal(carry,0,'Portable transport padding changed');return bytes;
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
