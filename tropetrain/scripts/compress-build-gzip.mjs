// Original build adapter, CC0-1.0. @gfx/zopfli and Google Zopfli: Apache-2.0.
// Only build-time gzip changes; browser codecs and exact expanded inputs stay fixed.
import zopfli from '@gfx/zopfli';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {readFile,mkdir,writeFile,rename} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
const sha=b=>createHash('sha256').update(b).digest('hex');
export const BUILD_GZIP_OPTIONS=Object.freeze({numiterations:5,blocksplitting:true,blocksplittingmax:15});
export const BUILD_GZIP_FINGERPRINT='@gfx/zopfli@1.0.15;iterations5;split15;zlib9-minimum;v1';
function exact(gzip,bytes){return gzip.length<=bytes.length+1024&&gunzipSync(gzip,{maxOutputLength:Math.max(1,bytes.length)}).equals(bytes);}
export async function compressBuildGzip(input,{cacheDirectory=path.join(tmpdir(),'tropetrain-build-gzip-v1')}={}){
 const bytes=Buffer.from(input),inputSha256=sha(bytes),key=sha(Buffer.from(BUILD_GZIP_FINGERPRINT+'\0'+inputSha256)),file=path.join(cacheDirectory,key+'.gz');let gzip,cacheHit=false;
 try{const cached=await readFile(file);if(exact(cached,bytes)){gzip=cached;cacheHit=true;}}catch{}
 if(!gzip){const candidate=Buffer.from(await zopfli.gzipAsync(bytes,BUILD_GZIP_OPTIONS)),standard=gzipSync(bytes,{level:9});gzip=candidate.length<standard.length?candidate:standard;if(!exact(gzip,bytes))throw Error('Build gzip did not preserve its exact input.');await mkdir(cacheDirectory,{recursive:true});const temporary=file+'.'+process.pid+'.tmp';await writeFile(temporary,gzip);await rename(temporary,file);}
 return {gzip,cacheHit,cacheKey:key,proof:{inputBytes:bytes.length,inputSha256,gzipBytes:gzip.length,gzipSha256:sha(gzip),exactRecoveredBytes:true,buildToolFingerprint:BUILD_GZIP_FINGERPRINT,options:BUILD_GZIP_OPTIONS,license:'Apache-2.0',browserCodec:'existing gzip decoder; no new browser dependency'}};
}
