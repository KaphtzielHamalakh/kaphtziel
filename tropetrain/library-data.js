import manifest from './data/torah/manifest.json' with {type:'json'};
import gen from './data/torah/gen.json' with {type:'json'};
import exo from './data/torah/exo.json' with {type:'json'};
import lev from './data/torah/lev.json' with {type:'json'};
import num from './data/torah/num.json' with {type:'json'};
import deu from './data/torah/deu.json' with {type:'json'};

// The browser build replaces this module with an embedded gzip payload. Node
// tests use these original JSON files, so source and browser data stay identical.
export async function loadCorpus(){return {manifest,books:[gen,exo,lev,num,deu]};}
