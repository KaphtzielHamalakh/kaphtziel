export async function loadReferenceData(){
  const response=await fetch('./data/references/torah-library.json.gz');
  if(!response.ok)throw Error('The recorded-reference library could not be loaded.');
  return JSON.parse(await new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).text());
}
