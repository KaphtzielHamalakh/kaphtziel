// Original packaging code, CC0-1.0. No image is recompressed or redrawn.
export async function restorePortableProgramImages(program,{document:doc=globalThis.document,subtle=globalThis.crypto?.subtle}={}){
 const node=doc.getElementById('portable-program-images-proof'),targets=[...(doc.querySelectorAll?.('img[data-portable-program-image]')??[])];
 if(!node){if(targets.length)throw Error('Missing shared-image record.');return {restored:0};}
 const proof=JSON.parse(node.textContent),hex=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value),bounded=(n,max)=>Number.isSafeInteger(n)&&n>0&&n<=max;
 if(proof?.format!=='tropetrain-portable-program-images-v1'||!bounded(proof.programBytes,256*1024*1024)||!hex(proof.programSha256)||!bounded(proof.imageCount,256)||!Array.isArray(proof.records)||!proof.records.length||proof.records.length>128||!subtle)throw Error('Invalid shared-image record.');
 const encode=value=>new TextEncoder().encode(value),sha=async bytes=>Array.from(new Uint8Array(await subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join(''),programBytes=encode(program);
 if(programBytes.length!==proof.programBytes||await sha(programBytes)!==proof.programSha256)throw Error('Shared images do not match the recovered program.');
 let uses=0,totalBytes=0;const byLength=new Map(),counts=new Map(),restored=new Map();
 for(const [index,r]of proof.records.entries()){
  if(r.id!==String(index)||!bounded(r.bytes,32*1024*1024)||!bounded(r.dataUriBytes,48*1024*1024)||!bounded(r.uses,256)||!hex(r.sha256)||!hex(r.dataUriSha256))throw Error('Invalid shared-image identity.');
  uses+=r.uses;totalBytes+=r.bytes;counts.set(r.id,0);const list=byLength.get(r.dataUriBytes)??[];list.push(r);byLength.set(r.dataUriBytes,list);
 }
 if(uses!==proof.imageCount||targets.length!==uses||totalBytes>128*1024*1024)throw Error('Incomplete shared-image inventory.');
 for(const match of program.matchAll(/data:image\/[a-z+.-]+;base64,[A-Za-z0-9+/]+={0,2}/g)){
  const uri=match[0],candidates=byLength.get(uri.length);if(!candidates)continue;
  const digest=await sha(encode(uri));
  for(const r of candidates){if(digest!==r.dataUriSha256)continue;const bytes=Uint8Array.from(atob(uri.slice(uri.indexOf(',')+1)),c=>c.charCodeAt(0));if(bytes.length!==r.bytes||await sha(bytes)!==r.sha256)throw Error('Shared image bytes changed.');restored.set(r.id,uri);}
 }
 if(restored.size!==proof.records.length)throw Error('An original shared image is missing from the recovered program.');
 for(const image of targets){const id=image.getAttribute('data-portable-program-image');if(!counts.has(id))throw Error('Unknown shared image.');counts.set(id,counts.get(id)+1);}
 if(proof.records.some(r=>counts.get(r.id)!==r.uses))throw Error('Shared-image bindings changed.');
 const future=new Map(targets.map(image=>[image,restored.get(image.getAttribute('data-portable-program-image'))])),links=[];
 for(const link of doc.querySelectorAll('a[data-embedded-image]')){const image=doc.getElementById(link.getAttribute('data-embedded-image')),uri=future.get(image)??image?.getAttribute('src');if(!uri?.startsWith('data:image/'))throw Error('Missing original source-image link.');links.push([link,uri]);}
 // Resolve all identities before changing any src or starting the application.
 for(const image of targets)image.setAttribute('src',restored.get(image.getAttribute('data-portable-program-image')));
 for(const [link,uri]of links)link.setAttribute('href',uri);
 return {restored:targets.length,sourceBytes:totalBytes,originalBytesPreserved:true};
}
