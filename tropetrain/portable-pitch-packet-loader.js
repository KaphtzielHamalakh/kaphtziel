// Original pitch-packet transport, CC0-1.0. Never executes packet text.
// Keep this initializer self-contained: the portable builder embeds toString().
export async function restorePortablePitchPackets({document:doc=globalThis.document,inflate=globalThis.DecompressionStream,subtle=globalThis.crypto?.subtle,required=false}={}){
 const node=doc.getElementById('portable-pitch-packet-proof'),data=doc.getElementById('portable-pitch-packet-data'),target=doc.getElementById('source-pitch-packets');
 if(!node&&!data){if(required)throw Error('Missing portable pitch-data packet.');return {restored:0};}
 if(!node||!data||!target||target.tagName!=='SCRIPT'||target.type!=='application/json'||target.textContent!=='')throw Error('Incomplete or repeated pitch-packet initialization.');
 const proof=JSON.parse(node.textContent),bounded=(n,max)=>Number.isSafeInteger(n)&&n>0&&n<=max,hex=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
 if(proof?.format!=='tropetrain-source-pitch-packets-v1'||proof.encoding!=='gzip+html-base93'||!bounded(proof.packetBytes,64*1024*1024)||!bounded(proof.gzipBytes,64*1024*1024)||!bounded(proof.recordCount,512)||!hex(proof.packetSha256)||!hex(proof.gzipSha256)||typeof inflate!=='function'||!subtle)throw Error('Invalid pitch-data packet record.');
 const encoded=data.textContent;
 if(typeof encoded!=='string'||encoded.length<Math.ceil(proof.gzipBytes*8/14)*2-1||encoded.length>Math.ceil(proof.gzipBytes*8/13)*2)throw Error('Incomplete pitch-packet transport.');
 // The same canonical dense alphabet as the program envelope. The independent
 // Node auditor checks this transport with its separately implemented decoder.
 const digit=code=>{if(code<33||code>126||code===60)throw Error('Invalid pitch-packet transport character.');return code-33-(code>60?1:0);};
 const gzip=new Uint8Array(proof.gzipBytes);let bits=0,count=0,consumed=0,out=0;
 const append=byte=>{if(out>=gzip.length)throw Error('Pitch-packet transport overflow.');gzip[out++]=byte;};
 let i=0;for(;i+1<encoded.length;i+=2){
  const value=digit(encoded.charCodeAt(i))+93*digit(encoded.charCodeAt(i+1)),remaining=proof.gzipBytes*8-consumed;
  if(remaining<14&&(i+2!==encoded.length||remaining<1||(remaining<=7&&value<=92)||value>=2**remaining))throw Error('Noncanonical pitch-packet padding.');
  const width=(value&8191)>456?13:14;bits|=value<<count;count+=width;consumed+=width;
  while(count>=8){append(bits&255);bits>>>=8;count-=8;}
 }
 if(i<encoded.length){const value=digit(encoded.charCodeAt(i)),remaining=proof.gzipBytes*8-consumed;if(remaining<1||remaining>7||value>=2**remaining)throw Error('Noncanonical pitch-packet padding.');bits|=value<<count;append(bits&255);bits>>>=8;}
 if(out!==gzip.length||bits!==0)throw Error('Noncanonical pitch-packet padding.');
 const sha=async bytes=>Array.from(new Uint8Array(await subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
 if(await sha(gzip)!==proof.gzipSha256)throw Error('Pitch-packet gzip checksum changed.');
 const reader=new Blob([gzip]).stream().pipeThrough(new inflate('gzip')).getReader(),parts=[];let length=0;
 try{for(;;){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>proof.packetBytes)throw Error('Pitch packets exceed their recorded length.');parts.push(value);}}finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
 if(length!==proof.packetBytes)throw Error('Incomplete pitch-data packet.');
 const bytes=new Uint8Array(length);let offset=0;for(const part of parts){bytes.set(part,offset);offset+=part.byteLength;}
 if(await sha(bytes)!==proof.packetSha256)throw Error('Pitch-data packet checksum changed.');
 const original=new TextDecoder('utf-8',{fatal:true}).decode(bytes),packet=JSON.parse(original);
 if(!packet||typeof packet!=='object'||Array.isArray(packet)||Object.keys(packet).length!==proof.recordCount)throw Error('Incomplete source pitch-packet inventory.');
 for(const [id,value]of Object.entries(packet)){
  if(!/^pt-portion-[0-9]{2}-[1-7]$/.test(id)||typeof value!=='string'||value.length===0||value.length>8*1024*1024||value.length%4!==0||!/^[A-Za-z0-9+/]+={0,2}$/.test(value))throw Error('Invalid original source pitch-packet identity.');
  const raw=atob(value);if(btoa(raw)!==value)throw Error('Noncanonical original pitch-packet base64.');
 }
 // Commit only complete, bounded, hash-verified data. The application sees
 // the exact original JSON text and keeps its own original packet validators.
 target.textContent=original;
 return {restored:proof.recordCount,packetSha256:proof.packetSha256,packetBytes:bytes.length};
}
