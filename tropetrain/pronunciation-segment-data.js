export async function loadPronunciationSegmentData(){
 const response=await fetch(new URL('./data/pronunciation/torah-segments.json.gz',import.meta.url));
 if(!response.ok)throw Error('Pronunciation source rules are unavailable.');
 return JSON.parse(await new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).text());
}
