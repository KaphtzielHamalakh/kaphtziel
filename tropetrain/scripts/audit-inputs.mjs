import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
export function captureAuditInputs(root,paths){
 return [...new Set(paths)].sort().map(path=>{
  if(typeof path!=='string'||path.startsWith('/')||path.split('/').includes('..'))throw Error('Audit inputs must be project-relative paths.');
  return {path,sha256:createHash('sha256').update(readFileSync(new URL(path,root))).digest('hex')};
 });
}
export function verifyAuditInputs(root,before){
 const after=captureAuditInputs(root,before.map(r=>r.path));
 for(const [i,row]of before.entries())if(row.path!==after[i].path||row.sha256!==after[i].sha256)
  throw Error('Audit input changed during the run: '+row.path+'. No new evidence was accepted.');
 return before;
}
