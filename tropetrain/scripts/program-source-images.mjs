import {readFile,readdir} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {encodePortableProgramBytes93} from './pack-portable-program.mjs';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const imagePattern=/(["'])(data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+)\1/g;
const preserved=['assets/scores/idelsohn-1929-no268.jpg','assets/scores/cohen-1902-munah-revia.png','assets/scores/cohen-1902-pentateuch-row-a.png'];
export async function programSourceImagePlugin(root){
 root=path.resolve(root);
 const files=new Map(),kept=new Set(),records=new Map();
 async function scan(dir){for(const entry of await readdir(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())await scan(file);else if(entry.isFile()&&/\.(png|jpe?g|webp)$/i.test(entry.name)){const bytes=await readFile(file),hash=sha(bytes),relative=path.relative(root,file).split(path.sep).join('/');if(!files.has(hash)||relative<files.get(hash))files.set(hash,relative);}}}
 await scan(path.join(root,'assets'));
 for(const relative of preserved)kept.add(sha(await readFile(path.join(root,relative))));
 function transform(source,filename){
  let used=false;
  const contents=source.replace(imagePattern,(literal,quote,dataUri)=>{
   const raw=Buffer.from(dataUri.slice(dataUri.indexOf(',')+1),'base64'),hash=sha(raw);
   if(kept.has(hash))return literal;
   const relative=files.get(hash);if(!relative)throw Error('Embedded source image has no exact canonical asset: '+filename);
   const key=sha(Buffer.from(dataUri)),existing=records.get(key);
   if(existing)existing.uses++;
   else records.set(key,{key,path:relative,mime:dataUri.slice(5,dataUri.indexOf(';')),bytes:raw.length,sha256:hash,dataUriBytes:Buffer.byteLength(dataUri),dataUriSha256:key,dataUri,uses:1});
   used=true;return '__tropetrainSourceImage('+JSON.stringify(key)+','+JSON.stringify(relative)+')';
  });
  if(!used)return null;
  if(/\b__tropetrainSourceImage\b/.test(source))throw Error('Source-image build alias collision.');
  let imported=path.relative(path.dirname(filename),path.join(root,'program-source-images.js')).split(path.sep).join('/');if(!imported.startsWith('.'))imported='./'+imported;
  return "import {programSourceImage as __tropetrainSourceImage} from "+JSON.stringify(imported)+';\n'+contents;
 }
 return {plugin:{name:'canonical-source-image-delivery',setup(builder){builder.onLoad({filter:/\.js$/},async args=>{if(!args.path.startsWith(root+path.sep)||args.path.includes(path.sep+'node_modules'+path.sep))return;const source=await readFile(args.path,'utf8');if(!source.includes('data:image/'))return;const contents=transform(source,args.path);if(contents!==null)return {loader:'js',contents};});}},records:()=>[...records.values()].sort((a,b)=>a.key.localeCompare(b.key)),transform};
}
export function sourceImagePacket(records){
 if(!Array.isArray(records)||!records.length||records.length>256)throw Error('Invalid program source-image inventory.');
 const seen=new Set();for(const r of records){if(seen.has(r.key)||r.key!==sha(Buffer.from(r.dataUri))||r.dataUriBytes!==Buffer.byteLength(r.dataUri)||r.sha256!==sha(Buffer.from(r.dataUri.split(',')[1],'base64')))throw Error('Source-image packet changed an original.');seen.add(r.key);}
 return JSON.stringify({format:'tropetrain-program-source-images-v1',records:records.map(({uses,...r})=>r)});
}
export function packSourceImagePacket(packet,{compressedGzip=null}={}){
 const bytes=Buffer.from(packet),parsed=JSON.parse(packet),gzip=compressedGzip===null?gzipSync(bytes,{level:9}):Buffer.from(compressedGzip);
 if(!gunzipSync(gzip,{maxOutputLength:Math.max(1,bytes.length)}).equals(bytes))throw Error('Source-image compression changed packet bytes.');
 const proof={format:parsed.format,encoding:'gzip+html-base93',imageCount:parsed.records.length,packetBytes:bytes.length,packetSha256:sha(bytes),gzipBytes:gzip.length,gzipSha256:sha(gzip)};
 return {proof,markup:'<script id="portable-source-image-proof" type="application/json">'+JSON.stringify(proof)+'</script><script id="portable-source-image-data" type="application/octet-stream">'+encodePortableProgramBytes93(gzip)+'</script>'};
}
