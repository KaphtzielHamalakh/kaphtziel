export async function loadPronunciationUnderlayData(){
 const response=await fetch(new URL('./data/pronunciation/torah-underlay.json.gz',import.meta.url));
 if(!response.ok)throw Error('Pronunciation Hebrew underlay is unavailable.');
 return JSON.parse(await new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).text());
}
