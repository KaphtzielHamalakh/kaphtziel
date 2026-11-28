// Original source-image transport, CC0-1.0. Never executes image packet text.
// Keep this initializer self-contained: the portable builder embeds toString().
export async function restorePortableSourceImages({document:doc=globalThis.document,inflate=globalThis.DecompressionStream,subtle=globalThis.crypto?.subtle,required=false}={}){
 const node=doc.getElementById('portable-source-image-proof'),data=doc.getElementById('portable-source-image-data');
 if(!node&&!data){if(required)throw Error('Missing portable source-image packet.');return {restored:0};}
 if(!node||!data||doc.getElementById('program-source-image-store'))throw Error('Incomplete or repeated source-image initialization.');
 const proof=JSON.parse(node.textContent),bounded=(n,max)=>Number.isSafeInteger(n)&&n>0&&n<=max,hex=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
 if(proof?.format!=='tropetrain-program-source-images-v1'||proof.encoding!=='gzip+html-base93'||!bounded(proof.packetBytes,128*1024*1024)||!bounded(proof.gzipBytes,64*1024*1024)||!bounded(proof.imageCount,256)||!hex(proof.packetSha256)||!hex(proof.gzipSha256)||typeof inflate!=='function'||!subtle)throw Error('Invalid source-image packet record.');
 const encoded=data.textContent;
 if(typeof encoded!=='string'||encoded.length<Math.ceil(proof.gzipBytes*8/14)*2-1||encoded.length>Math.ceil(proof.gzipBytes*8/13)*2)throw Error('Incomplete source-image transport.');
 // The same canonical dense alphabet as the program envelope. The independent
 // Node auditor checks this transport with its separately implemented decoder.
 const digit=code=>{if(code<33||code>126||code===60)throw Error('Invalid source-image transport character.');return code-33-(code>60?1:0);};
 const gzip=new Uint8Array(proof.gzipBytes);let bits=0,count=0,consumed=0,out=0;
 const append=byte=>{if(out>=gzip.length)throw Error('Source-image transport overflow.');gzip[out++]=byte;};
 let i=0;for(;i+1<encoded.length;i+=2){
  const value=digit(encoded.charCodeAt(i))+93*digit(encoded.charCodeAt(i+1)),remaining=proof.gzipBytes*8-consumed;
  if(remaining<14&&(i+2!==encoded.length||remaining<1||(remaining<=7&&value<=92)||value>=2**remaining))throw Error('Noncanonical source-image padding.');
  const width=(value&8191)>456?13:14;bits|=value<<count;count+=width;consumed+=width;
  while(count>=8){append(bits&255);bits>>>=8;count-=8;}
 }
 if(i<encoded.length){const value=digit(encoded.charCodeAt(i)),remaining=proof.gzipBytes*8-consumed;if(remaining<1||remaining>7||value>=2**remaining)throw Error('Noncanonical source-image padding.');bits|=value<<count;append(bits&255);bits>>>=8;}
 if(out!==gzip.length||bits!==0)throw Error('Noncanonical source-image padding.');
 const sha=async bytes=>Array.from(new Uint8Array(await subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
 if(await sha(gzip)!==proof.gzipSha256)throw Error('Source-image gzip checksum changed.');
 const reader=new Blob([gzip]).stream().pipeThrough(new inflate('gzip')).getReader(),parts=[];let length=0;
 try{for(;;){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>proof.packetBytes)throw Error('Source images exceed their recorded length.');parts.push(value);}}finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
 if(length!==proof.packetBytes)throw Error('Incomplete source-image packet.');
 const bytes=new Uint8Array(length);let offset=0;for(const part of parts){bytes.set(part,offset);offset+=part.byteLength;}
 if(await sha(bytes)!==proof.packetSha256)throw Error('Source-image packet checksum changed.');
 const packet=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
 if(packet?.format!==proof.format||!Array.isArray(packet.records)||packet.records.length!==proof.imageCount)throw Error('Incomplete source-image inventory.');
 const entries=Object.create(null);let sourceBytes=0;
 for(const r of packet.records){
  if(!r||!hex(r.key)||Object.hasOwn(entries,r.key)||typeof r.path!=='string'||!/^assets\/[a-zA-Z0-9_./-]+\.(?:png|jpe?g|webp)$/.test(r.path)||r.path.split('/').includes('..')||!['image/png','image/jpeg','image/webp'].includes(r.mime)||!bounded(r.bytes,32*1024*1024)||!bounded(r.dataUriBytes,48*1024*1024)||!hex(r.sha256)||!hex(r.dataUriSha256)||r.key!==r.dataUriSha256||typeof r.dataUri!=='string')throw Error('Invalid source-image identity.');
  const uriBytes=new TextEncoder().encode(r.dataUri),prefix='data:'+r.mime+';base64,';
  if(uriBytes.length!==r.dataUriBytes||await sha(uriBytes)!==r.dataUriSha256||!r.dataUri.startsWith(prefix))throw Error('Source-image URI checksum changed.');
  const encodedImage=r.dataUri.slice(prefix.length);
  if(!/^[A-Za-z0-9+/]+=*$/.test(encodedImage)||encodedImage.length!==Math.ceil(r.bytes/3)*4)throw Error('Invalid source-image base64.');
  const raw=atob(encodedImage);if(btoa(raw)!==encodedImage)throw Error('Noncanonical source-image base64.');
  const image=Uint8Array.from(raw,c=>c.charCodeAt(0));
  if(image.length!==r.bytes||await sha(image)!==r.sha256)throw Error('Original source-image bytes changed.');
  sourceBytes+=image.length;if(sourceBytes>96*1024*1024)throw Error('Source-image inventory exceeds its bound.');
  entries[r.key]={path:r.path,dataUri:r.dataUri};
 }
 const store=doc.createElement('script');store.id='program-source-image-store';store.type='application/json';store.textContent=JSON.stringify(entries);doc.body.appendChild(store);
 return {restored:packet.records.length,sourceBytes,packetSha256:proof.packetSha256};
}
