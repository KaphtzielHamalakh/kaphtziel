// Optional structural observations; no audio, source text or draft mutation.
export async function loadVowelAnchorPacket(file){
 const url=new URL(file,import.meta.url);
 if(url.protocol==='file:'&&typeof process!=='undefined'&&process.versions?.node){const{readFile}=await import('node:fs/promises');return new Uint8Array(await readFile(url));}
 const response=await fetch(url);if(!response.ok)throw Error('Vowel observations could not be loaded.');return new Uint8Array(await response.arrayBuffer());
}
