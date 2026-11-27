// Original portable packaging code, CC0-1.0. The recovered program is unchanged.
export async function startPortableProgram(proof=null,{document:doc=globalThis.document,inflate=globalThis.DecompressionStream,subtle=globalThis.crypto?.subtle,beforeStart=null}={}){
 try{
  proof??=JSON.parse(doc.getElementById('portable-program-proof')?.textContent??'');
  const legacy=proof?.format==='tropetrain-portable-program-v1'&&proof.encoding==='gzip+base64',compact=proof?.format==='tropetrain-portable-program-v2'&&proof.encoding==='gzip+html-base85';
  if((!legacy&&!compact)||!Number.isSafeInteger(proof.programBytes)||proof.programBytes<1||proof.programBytes>256*1024*1024||!Number.isSafeInteger(proof.gzipBytes)||proof.gzipBytes<1||proof.gzipBytes>128*1024*1024||!['programSha256','gzipSha256'].every(k=>/^[a-f0-9]{64}$/.test(proof[k])))throw Error('Invalid portable program record.');
  if(typeof inflate!=='function'||!subtle)throw Error('This browser cannot open the compressed program.');
  const encoded=doc.getElementById('portable-program-data')?.textContent?.trim();
  if(!encoded||encoded.length!==(legacy?Math.ceil(proof.gzipBytes/3)*4:Math.ceil(proof.gzipBytes/4)*5))throw Error('Incomplete portable program.');
  let gzip;
  if(legacy)gzip=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0));
  else{
   // The fixed alphabet excludes '<', so arbitrary payloads cannot form HTML
   // script/comment markup. Four original bytes occupy five ASCII characters.
   const alphabet='0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!#$%&()*+-;:=>?@^_`{|}~',digits=new Int16Array(128);digits.fill(-1);
   for(let i=0;i<alphabet.length;i++)digits[alphabet.charCodeAt(i)]=i;
   gzip=new Uint8Array(proof.gzipBytes);let out=0;
   for(let i=0;i<encoded.length;i+=5){
    let value=0;for(let j=0;j<5;j++){const code=encoded.charCodeAt(i+j),digit=code<128?digits[code]:-1;if(digit<0)throw Error('Invalid portable program encoding.');value=value*85+digit;}
    if(value>0xffffffff)throw Error('Portable program encoding exceeds four bytes.');
    for(const divisor of[0x1000000,0x10000,0x100,1]){const byte=Math.floor(value/divisor)%256;if(out<gzip.length)gzip[out]=byte;else if(byte!==0)throw Error('Noncanonical portable program padding.');out++;}
   }
  }
  const sha=async bytes=>Array.from(new Uint8Array(await subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
  if(gzip.length!==proof.gzipBytes||await sha(gzip)!==proof.gzipSha256)throw Error('Portable program checksum changed.');
  const reader=new Blob([gzip]).stream().pipeThrough(new inflate('gzip')).getReader(),parts=[];let length=0;
  try{for(;;){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>proof.programBytes)throw Error('Portable program exceeds its recorded length.');parts.push(value);}}finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
  if(length!==proof.programBytes)throw Error('Incomplete recovered program.');
  const bytes=new Uint8Array(length);let offset=0;for(const part of parts){bytes.set(part,offset);offset+=part.byteLength;}
  if(await sha(bytes)!==proof.programSha256)throw Error('Recovered program checksum changed.');
  const program=new TextDecoder('utf-8',{fatal:true}).decode(bytes);if(beforeStart!==null&&typeof beforeStart!=='function')throw Error('Invalid portable initialization hook.');const evidence=beforeStart?await beforeStart({program}):null,script=doc.createElement('script');script.id='portable-recovered-program';script.textContent=program;doc.body.appendChild(script);
  return {started:true,bytes:length,sha256:proof.programSha256,...(evidence?{evidence}:{})};
 }catch(error){
  const status=doc.getElementById('startup-status');
  if(status){status.hidden=false;status.setAttribute('role','alert');status.textContent='This portable copy could not start. Download a fresh copy or open the live trainer. ';const link=doc.createElement('a');link.href='https://kaphtziel.com/tropetrain/';link.textContent='Open live trainer';status.appendChild(link);}
  return {started:false,reason:error?.message??'Portable program unavailable.'};
 }
}
