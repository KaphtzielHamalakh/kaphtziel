// Original lossless portable evidence loader, CC0-1.0.
// Restore source URLs only after every packet, record and anchor has passed.
export async function restorePortableEvidence({document:doc=globalThis.document,inflate=globalThis.DecompressionStream,subtle=globalThis.crypto?.subtle}={}){
 const proofNode=doc.getElementById('portable-evidence-proof'),dataNode=doc.getElementById('portable-evidence-data'),anchors=Array.from(doc.querySelectorAll?.('a[data-portable-evidence]')??[]);
 if(!proofNode&&!dataNode&&!anchors.length)return {restored:true,records:0,links:0,bytes:0};
 const p=JSON.parse(proofNode?.textContent??''),keys=(value,expected)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).sort().join('|')===[...expected].sort().join('|'),integer=(n,min,max)=>Number.isSafeInteger(n)&&n>=min&&n<=max,hash=s=>typeof s==='string'&&/^[a-f0-9]{64}$/.test(s);
 if(!keys(p,['format','encoding','packetBytes','packetSha256','gzipBytes','gzipSha256','linkCount','records'])||p.format!=='tropetrain-portable-evidence-v1'||p.encoding!=='gzip+base64'||!integer(p.packetBytes,1,256*1024*1024)||!integer(p.gzipBytes,1,128*1024*1024)||!hash(p.packetSha256)||!hash(p.gzipSha256)||!integer(p.linkCount,1,10000)||!Array.isArray(p.records)||!integer(p.records.length,1,2048))throw Error('Invalid portable evidence record.');
 if(typeof inflate!=='function'||!subtle)throw Error('This browser cannot restore the portable evidence.');
 const ids=new Set();let links=0,total=0;
 for(const [i,r]of p.records.entries()){
  if(!keys(r,['id','bytes','sha256','base64Bytes','links'])||r.id!==String(i)||ids.has(r.id)||!integer(r.bytes,1,64*1024*1024)||!hash(r.sha256)||r.base64Bytes!==Math.ceil(r.bytes/3)*4||!integer(r.links,1,10000))throw Error('Invalid portable evidence source identity.');
  ids.add(r.id);links+=r.links;total+=r.bytes;
 }
 if(links!==p.linkCount||anchors.length!==links||total>256*1024*1024)throw Error('Portable evidence link count changed.');
 const encoded=dataNode?.textContent?.trim();
 if(typeof encoded!=='string'||encoded.length!==Math.ceil(p.gzipBytes/3)*4||!/^[A-Za-z0-9+/]*={0,2}$/.test(encoded))throw Error('Incomplete portable evidence.');
 const binary=atob(encoded);if(btoa(binary)!==encoded)throw Error('Noncanonical portable evidence packet.');
 const gzip=Uint8Array.from(binary,c=>c.charCodeAt(0)),sha=async b=>Array.from(new Uint8Array(await subtle.digest('SHA-256',b)),x=>x.toString(16).padStart(2,'0')).join('');
 if(gzip.length!==p.gzipBytes||await sha(gzip)!==p.gzipSha256)throw Error('Portable evidence packet checksum changed.');
 const reader=new Blob([gzip]).stream().pipeThrough(new inflate('gzip')).getReader(),parts=[];let length=0;
 try{for(;;){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>p.packetBytes)throw Error('Portable evidence exceeds its recorded length.');parts.push(value);}}finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
 if(length!==p.packetBytes)throw Error('Incomplete recovered portable evidence.');
 const bytes=new Uint8Array(length);let offset=0;for(const part of parts){bytes.set(part,offset);offset+=part.byteLength;}
 if(await sha(bytes)!==p.packetSha256)throw Error('Recovered portable evidence checksum changed.');
 const entries=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
 if(!Array.isArray(entries)||entries.length!==p.records.length)throw Error('Portable evidence source count changed.');
 const urls=new Map(),counts=new Map(p.records.map(r=>[r.id,0]));
 for(const [i,r]of p.records.entries()){
  const value=entries[i];if(typeof value!=='string'||value.length!==r.base64Bytes||!/^[A-Za-z0-9+/]*={0,2}$/.test(value))throw Error('Incomplete portable evidence source.');
  const raw=atob(value);if(btoa(raw)!==value)throw Error('Noncanonical portable evidence source.');
  const b=Uint8Array.from(raw,c=>c.charCodeAt(0));if(b.length!==r.bytes||await sha(b)!==r.sha256)throw Error('Portable evidence source checksum changed.');
  const text=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(b);JSON.parse(text.charCodeAt(0)===0xfeff?text.slice(1):text);
  urls.set(r.id,'data:application/json;base64,'+value);
 }
 const pending=[];
 for(const anchor of anchors){const id=anchor.getAttribute('data-portable-evidence'),url=urls.get(id),href=anchor.getAttribute('href');if(!url||(href!=='#startup-status'&&href!==url))throw Error('Portable evidence anchor changed.');counts.set(id,counts.get(id)+1);pending.push([anchor,url]);}
 if(p.records.some(r=>counts.get(r.id)!==r.links))throw Error('Portable evidence source links changed.');
 for(const [anchor,url]of pending)anchor.setAttribute('href',url);
 return {restored:true,records:p.records.length,links,bytes:total,packetSha256:p.packetSha256};
}
