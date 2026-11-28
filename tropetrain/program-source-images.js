// Original source-image delivery code, CC0-1.0. Musical records stay unchanged.
const stores=new WeakMap();
const references=new Map(),loaded=new Map();
export function programSourceImage(key,path,{document:doc=globalThis.document}={}){
 if(!/^[a-f0-9]{64}$/.test(key)||!/^assets\/[a-zA-Z0-9_./-]+\.(?:png|jpe?g|webp)$/.test(path)||path.split('/').includes('..'))throw Error('Invalid source-image identity.');
 if(references.has(path)&&references.get(path)!==key)throw Error('Conflicting source-image identity.');references.set(path,key);
 const proof=doc?.getElementById('portable-source-image-proof'),node=doc?.getElementById('program-source-image-store');
 if(!proof&&!node){if(doc?.getElementById('portable-program-data'))throw Error('The portable source images are missing.');return path;}
 if(!proof||!node)throw Error('The portable source images were not verified.');
 let entries=stores.get(doc);if(!entries){entries=JSON.parse(node.textContent);if(!entries||typeof entries!=='object'||Array.isArray(entries))throw Error('Invalid portable source images.');stores.set(doc,entries);}
 const entry=Object.hasOwn(entries,key)?entries[key]:null;
 if(!entry||entry.path!==path||typeof entry.dataUri!=='string'||!/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(entry.dataUri))throw Error('This portable source image is unavailable.');
 return entry.dataUri;
}
export async function loadProgramSourceImage(value,{fetch:request=globalThis.fetch,subtle=globalThis.crypto?.subtle}={}){
 if(typeof value==='string'&&/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(value))return value;
 if(!references.has(value)||typeof request!=='function'||!subtle)throw Error('The original source image is unavailable.');
 if(loaded.has(value))return loaded.get(value);
 const promise=(async()=>{
  const response=await request(value,{cache:'force-cache'});if(!response.ok||response.status!==200)throw Error('The original source image could not load.');
  const reader=response.body.getReader(),parts=[];let length=0;
  try{for(;;){const {done,value:part}=await reader.read();if(done)break;length+=part.byteLength;if(length>32*1024*1024)throw Error('Source image exceeds its bound.');parts.push(part);}}finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
  const bytes=new Uint8Array(length);let offset=0;for(const part of parts){bytes.set(part,offset);offset+=part.byteLength;}
  const chunks=[];for(let i=0;i<bytes.length;i+=32768)chunks.push(String.fromCharCode(...bytes.subarray(i,i+32768)));
  const mime=value.endsWith('.webp')?'image/webp':/\.jpe?g$/.test(value)?'image/jpeg':'image/png',uri='data:'+mime+';base64,'+btoa(chunks.join(''));
  const hash=Array.from(new Uint8Array(await subtle.digest('SHA-256',new TextEncoder().encode(uri))),b=>b.toString(16).padStart(2,'0')).join('');
  if(hash!==references.get(value))throw Error('The original source-image checksum changed.');
  return uri;
 })();loaded.set(value,promise);
 try{return await promise;}catch(error){loaded.delete(value);throw error;}
}
