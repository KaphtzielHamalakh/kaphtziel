import {mkdtemp,writeFile,rename,rm,statfs} from 'node:fs/promises';
import path from 'node:path';

const MiB=1024*1024;
// Keep the previous artifact intact until a complete replacement is on disk.
export async function writePortableArtifact(root,html,{maxBytes=100*MiB,reserveBytes=128*MiB,write=writeFile,availableBytes=async()=>{const s=await statfs(root);return s.bavail*s.bsize;}}={}){
 const bytes=Buffer.byteLength(html);
 if(bytes>=maxBytes)throw Error(`Portable HTML is ${bytes} bytes; the host limit is ${maxBytes} bytes.`);
 const free=await availableBytes(),needed=bytes+reserveBytes;
 if(free<needed)throw Error(`Portable build needs ${Math.ceil(needed/MiB)} MiB free, including a ${Math.ceil(reserveBytes/MiB)} MiB reserve; ${Math.floor(free/MiB)} MiB is available.`);
 const temporary=await mkdtemp(path.join(root,'.portable-build-'));
 try{
  const file=path.join(temporary,'TropeTrain.html');
  await write(file,html);
  await rename(file,path.join(root,'TropeTrain.html'));
 }finally{await rm(temporary,{recursive:true,force:true});}
 return {bytes};
}
