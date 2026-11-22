// Optional research packets; original recordings and reader words stay separate.
export async function loadWordSupportPacket(file){
  const url=new URL(file,import.meta.url);
  if(url.protocol==='file:'&&typeof process!=='undefined'&&process.versions?.node){
    const{readFile}=await import('node:fs/promises');return new Uint8Array(await readFile(url));
  }
  const response=await fetch(url);if(!response.ok)throw Error('Word-support research could not be loaded.');
  return new Uint8Array(await response.arrayBuffer());
}
