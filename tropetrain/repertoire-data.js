import manifest from './data/repertoire/manifest.json' with {type:'json'};
import jos from './data/repertoire/jos.json' with {type:'json'};
import jdg from './data/repertoire/jdg.json' with {type:'json'};
import sam1 from './data/repertoire/sam1.json' with {type:'json'};
import sam2 from './data/repertoire/sam2.json' with {type:'json'};
import kgs1 from './data/repertoire/kgs1.json' with {type:'json'};
import kgs2 from './data/repertoire/kgs2.json' with {type:'json'};
import isa from './data/repertoire/isa.json' with {type:'json'};
import jer from './data/repertoire/jer.json' with {type:'json'};
import ezk from './data/repertoire/ezk.json' with {type:'json'};
import hos from './data/repertoire/hos.json' with {type:'json'};
import jol from './data/repertoire/jol.json' with {type:'json'};
import amo from './data/repertoire/amo.json' with {type:'json'};
import oba from './data/repertoire/oba.json' with {type:'json'};
import jon from './data/repertoire/jon.json' with {type:'json'};
import mic from './data/repertoire/mic.json' with {type:'json'};
import nah from './data/repertoire/nah.json' with {type:'json'};
import hab from './data/repertoire/hab.json' with {type:'json'};
import zep from './data/repertoire/zep.json' with {type:'json'};
import hag from './data/repertoire/hag.json' with {type:'json'};
import zec from './data/repertoire/zec.json' with {type:'json'};
import mal from './data/repertoire/mal.json' with {type:'json'};
import rut from './data/repertoire/rut.json' with {type:'json'};
import sng from './data/repertoire/sng.json' with {type:'json'};
import ecc from './data/repertoire/ecc.json' with {type:'json'};
import lam from './data/repertoire/lam.json' with {type:'json'};
import est from './data/repertoire/est.json' with {type:'json'};

// Exact JSON inputs for Node checks; a later UI build can embed the same bytes.
export async function loadRepertoire(){return {manifest,books:[jos,jdg,sam1,sam2,kgs1,kgs2,isa,jer,ezk,hos,jol,amo,oba,jon,mic,nah,hab,zep,hag,zec,mal,rut,sng,ecc,lam,est]};}
