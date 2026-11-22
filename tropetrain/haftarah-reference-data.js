export async function loadHaftarahData(){
 const response=await fetch(new URL('./data/references/haftarah-library.json.gz',import.meta.url));
 if(!response.ok)throw Error('The Haftarah source catalog is unavailable.');
 return JSON.parse(await new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).text());
}
