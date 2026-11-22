// On-demand originals are checked before playback and stored under their hash.
const aborted=signal=>{if(signal?.aborted)throw new DOMException('Cancelled','AbortError');};
export class DeviceRecordingCache {
  constructor(){this.dbPromise=null;}
  db(){return this.dbPromise??=new Promise((resolve,reject)=>{
    if(!globalThis.indexedDB){reject(Error('Device storage is unavailable.'));return;}
    const request=indexedDB.open('tropetrain-reference-audio-v1',1);
    request.onupgradeneeded=()=>request.result.createObjectStore('recordings');
    request.onerror=()=>reject(request.error);request.onsuccess=()=>{request.result.onversionchange=()=>request.result.close();resolve(request.result);};
  });}
  async keys(){const db=await this.db();return new Promise((resolve,reject)=>{const r=db.transaction('recordings').objectStore('recordings').getAllKeys();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
  async get(key){const db=await this.db();return new Promise((resolve,reject)=>{const r=db.transaction('recordings').objectStore('recordings').get(key);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
  async put(key,value){const db=await this.db();return new Promise((resolve,reject)=>{const tx=db.transaction('recordings','readwrite');tx.objectStore('recordings').put(value,key);tx.oncomplete=()=>resolve();tx.onabort=()=>reject(tx.error??Error('Could not save recording.'));tx.onerror=()=>reject(tx.error);});}
  async delete(key){const db=await this.db();return new Promise((resolve,reject)=>{const tx=db.transaction('recordings','readwrite');tx.objectStore('recordings').delete(key);tx.oncomplete=()=>resolve();tx.onabort=()=>reject(tx.error);});}
}
export class ReferenceAudioStore {
  constructor({openingUrl,includedUrls={},cache=new DeviceRecordingCache(),fetchFile=(...args)=>fetch(...args),digest=(...args)=>crypto.subtle.digest(...args),makeUrl=blob=>URL.createObjectURL(blob),revokeUrl=url=>URL.revokeObjectURL(url)}={}){
    this.includedUrls=new Map(Object.entries(includedUrls));
    this.openingUrl=openingUrl;this.cache=cache;this.fetchFile=fetchFile;this.digest=digest;this.makeUrl=makeUrl;this.revokeUrl=revokeUrl;this.urls=new Map();this.memory=new Map();this.saved=new Set();this.storageAvailable=true;
    this.ready=cache.keys().then(keys=>{this.saved=new Set(keys);}).catch(()=>{this.storageAvailable=false;});
  }
  key(record){return record.audio.sha1;}
  included(record){return this.includedUrls.get(this.key(record))||(record.audio.localFile?this.openingUrl:null);}
  async has(record){await this.ready;return !!this.included(record)||this.saved.has(this.key(record))||this.memory.has(this.key(record))||this.urls.has(this.key(record));}
  async verify(record,blob){
    if(!(blob instanceof Blob)||blob.size!==record.audio.bytes)throw Error(`Recording size differs from the source: ${record.title}.`);
    const hash=Array.from(new Uint8Array(await this.digest('SHA-1',await blob.arrayBuffer())),b=>b.toString(16).padStart(2,'0')).join('');
    if(hash!==record.audio.sha1)throw Error(`Recording checksum differs from the source: ${record.title}.`);
  }
  urlFor(key,blob){
    if(this.urls.has(key))return this.urls.get(key);
    const url=this.makeUrl(blob);this.urls.set(key,url);
    while(this.urls.size>3){const oldest=this.urls.keys().next().value;this.revokeUrl(this.urls.get(oldest));this.urls.delete(oldest);}
    return url;
  }
  async url(record,{signal}={}){
    await this.ready;aborted(signal);if(this.included(record))return this.included(record);
    const key=this.key(record);if(this.urls.has(key))return this.urls.get(key);
    const blob=this.memory.get(key)??(await this.cache.get(key).catch(()=>null))?.blob;aborted(signal);
    if(!blob)throw Error(`${record.title} is not loaded. Use Load recordings first.`);
    try{await this.verify(record,blob);}catch(error){this.saved.delete(key);this.memory.delete(key);await this.cache.delete(key).catch(()=>{});throw error;}
    aborted(signal);return this.urlFor(key,blob);
  }
  async load(record,{signal}={}){
    await this.ready;aborted(signal);if(await this.has(record))return {saved:this.saved.has(this.key(record)),existing:true};
    const response=await this.fetchFile(record.audio.url,{signal,mode:'cors'});
    if(!response.ok)throw Error(`Recording download failed (${response.status}).`);
    const blob=new Blob([await response.arrayBuffer()],{type:record.audio.mimeType??'audio/mpeg'});aborted(signal);await this.verify(record,blob);aborted(signal);
    const key=this.key(record);let saved=false;
    try{await this.cache.put(key,{blob,filename:record.audio.filename,verifiedSha1:key,bytes:blob.size});this.saved.add(key);saved=true;}
    catch{this.storageAvailable=false;this.memory.set(key,blob);while(this.memory.size>3)this.memory.delete(this.memory.keys().next().value);}
    return {saved,existing:false};
  }
  async remove(record){
    await this.ready;const key=this.key(record);await this.cache.delete(key).catch(()=>{});this.saved.delete(key);this.memory.delete(key);
    if(this.urls.has(key)){this.revokeUrl(this.urls.get(key));this.urls.delete(key);}
  }
}
