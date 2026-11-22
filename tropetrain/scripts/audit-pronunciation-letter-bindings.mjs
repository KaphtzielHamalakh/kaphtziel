import {readFileSync,writeFileSync} from 'node:fs';import {gunzipSync} from 'node:zlib';import {createHash} from 'node:crypto';import assert from 'node:assert/strict';
import {PronunciationLibrary} from '../pronunciation.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url)),unpack=p=>JSON.parse(gunzipSync(read(p))),sha=b=>createHash('sha256').update(b).digest('hex'),display=unpack('data/pronunciation/torah-display.json.gz'),lib=new PronunciationLibrary(display,{underlay:unpack('data/pronunciation/torah-underlay.json.gz'),segments:unpack('data/pronunciation/torah-segments.json.gz')}),oldHash=createHash('sha256');
const counts=()=>({units:0,variantPlans:0,categoryReferences:0,exactWrittenClusterReferences:0,sourceOnlyLetterReferences:0,categoriesWithoutLetters:0,sharedFirstReferences:0,sharedSecondReferences:0,markedClusterDifferences:0,writtenLettersExcludingSharedReferences:0,uniqueReaderClusters:0}),styles={sephardic:counts(),ashkenazic:counts()},seen={sephardic:new Set(),ashkenazic:new Set()},examples={};let groups=0;
for(const group of display.groups){
 const study=lib.study({id:group.readerIds[0],sourceHebrew:group.readerHebrew[0]},'sephardic'),restored=structuredClone(study),texts=new Map(study.readerIds.map((id,i)=>[id,study.readerHebrew[i]]));
 for(const row of restored.rows)for(const cells of Object.values(row.styles))for(const cell of cells)for(const unit of cell.units)for(const variant of unit.sourceSegments.variants)delete variant.letterClusterBindings;
 oldHash.update(JSON.stringify(restored)+'\n');
 for(const row of study.rows)for(const [style,cells] of Object.entries(row.styles))for(const cell of cells)for(const unit of cell.units){
  const c=styles[style];c.units++;
  for(const v of unit.sourceSegments.variants){
   const annotation=v.letterClusterBindings;c.variantPlans++;assert.equal(annotation.review,null);assert.equal(annotation.coordinateUnit,'UTF-16');assert.equal(annotation.scope,'source-variant');assert.equal(annotation.bindings.length,v.segments.length);let reconstructed='';
   for(const [i,b] of annotation.bindings.entries()){
    c.categoryReferences++;assert.equal(b.sourceSegmentId,v.segments[i].id);assert.equal(b.categoryId,v.segments[i].categoryId);assert.equal(b.part,v.segments[i].part);assert.equal(b.phonemes,null);assert.equal(b.individualVowelPointRange,null);assert.equal(b.audioTimes,null);
    if(b.part==='first-half-shared')c.sharedFirstReferences++;if(b.part==='second-half-shared')c.sharedSecondReferences++;
    if(b.status==='no-written-letter'){c.categoriesWithoutLetters++;assert.equal(b.sourceCluster,null);assert.equal(b.readerClusterRanges,null);assert.equal(b.writtenLetterCount,0);continue;}
    assert(b.sourceCluster.text);assert.equal(b.sourceCluster.text.length,b.sourceCluster.end-b.sourceCluster.start);
    if(b.part!=='first-half-shared'){reconstructed+=b.sourceCluster.text;c.writtenLettersExcludingSharedReferences+=b.writtenLetterCount;}else assert.equal(b.writtenLetterCount,0);
    if(b.status==='source-only'){c.sourceOnlyLetterReferences++;assert.equal(b.readerClusterRanges,null);assert.equal(b.markedClustersEqual,null);continue;}
    assert.equal(b.status,'exact-written-clusters');c.exactWrittenClusterReferences++;
    for(const r of b.readerClusterRanges){assert.equal(texts.get(r.readerWordId).slice(r.start,r.end),r.text);assert.equal([...r.text.matchAll(/[א-ת]/gu)].length,1);assert.equal(r.role,b.part==='first-half-shared'?'shared-consonant':'written');seen[style].add(JSON.stringify([r.readerWordId,r.start,r.end]));}
    if(!b.markedClustersEqual){c.markedClusterDifferences++;examples.differingMarks??={wordId:group.readerIds[0],source:b.sourceCluster,reader:b.readerClusterRanges};}
    if(b.part==='first-half-shared')examples.sharedReference??={wordId:group.readerIds[0],binding:b};
   }
   assert.equal(reconstructed,v.sourceHebrew.text);
  }
 }
 groups++;
}
const baselineSha=oldHash.digest('hex');assert.equal(baselineSha,'4d6f82686325da4d72d6808ade8519d52da0376c1f4edb85936512de26d2b172','Every original v0.51 study field must remain exact after removing only the new annotations.');
for(const style of Object.keys(styles))styles[style].uniqueReaderClusters=seen[style].size;
const paths=['data/pronunciation/torah-display.json.gz','data/pronunciation/torah-underlay.json.gz','data/pronunciation/torah-segments.json.gz','pronunciation-letter-bindings.js'];
const report={schema:'tropetrain-pronunciation-letter-clusters-v1',revision:1,sourceCommit:display.sourceCommit,sourceGroups:groups,inputs:paths.map(path=>({path,sha256:sha(read(path))})),sourceLicense:'CC-BY-SA-4.0',baseline:{commit:'e66b85c2beb386a6df3459a627673ed507aef1c8',sha256:baselineSha,method:'JSON.stringify of every original study in source group order, first reader word and selected Sephardic text; each study includes both styles; newline per study. Digest independently computed from the exact v0.51 Git tree. Remove only letterClusterBindings from source variants before comparison.'},styles,examples,review:{linguistic:null,acoustic:null,cantorial:null},phonemes:null,voice:null,limits:'Counts are category/variant references, not distinct words or letters. Whole marked letter clusters identify source categories; vowel points and acoustic phonemes remain unallocated. Shared halves point to one written consonant; first halves add no written letter. Different source spellings keep null reader bindings. Original word/unit IDs, source alternatives, Hebrew/accents, stress, ownership, IPA proposal, musical and audio data remain unchanged.'};
const target=new URL('../docs/PRONUNCIATION-LETTER-CLUSTERS.json',import.meta.url);
if(process.argv.includes('--check'))assert.deepEqual(JSON.parse(readFileSync(target)),report);else writeFileSync(target,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({sourceGroups:groups,baselineExact:true,styles}));
