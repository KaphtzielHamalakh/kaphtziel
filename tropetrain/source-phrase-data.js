// Browser builds replace this module with the same pinned gzip packet.
let promise;
export function loadSourcePhrasePacket(){return promise??=(async()=>{
 const {readFile}=await import('node:fs/promises'),{gunzipSync}=await import('node:zlib');
 return JSON.parse(gunzipSync(await readFile(new URL('./data/structure/torah-phrases.json.gz',import.meta.url))));
})();}
