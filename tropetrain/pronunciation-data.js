export async function loadPronunciationData(){
 const response=await fetch(new URL('./data/pronunciation/torah-display.json.gz',import.meta.url));
 if(!response.ok)throw Error('Pronunciation source data is unavailable.');
 return JSON.parse(await new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).text());
}
