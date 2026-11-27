// Original portable packaging code, CC0-1.0. The recovered program is unchanged.
export async function startPortableProgram(proof=null,{document:doc=globalThis.document,inflate=globalThis.DecompressionStream,subtle=globalThis.crypto?.subtle,beforeStart=null}={}){
 try{
  proof??=JSON.parse(doc.getElementById('portable-program-proof')?.textContent??'');
  if(proof?.format!=='tropetrain-portable-program-v1'||proof.encoding!=='gzip+base64'||!Number.isSafeInteger(proof.programBytes)||proof.programBytes<1||proof.programBytes>256*1024*1024||!Number.isSafeInteger(proof.gzipBytes)||proof.gzipBytes<1||!['programSha256','gzipSha256'].every(k=>/^[a-f0-9]{64}$/.test(proof[k])))throw Error('Invalid portable program record.');
  if(typeof inflate!=='function'||!subtle)throw Error('This browser cannot open the compressed program.');
  const encoded=doc.getElementById('portable-program-data')?.textContent?.trim();
  if(!encoded||encoded.length!==Math.ceil(proof.gzipBytes/3)*4)throw Error('Incomplete portable program.');
  const gzip=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0)),sha=async bytes=>Array.from(new Uint8Array(await subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
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
