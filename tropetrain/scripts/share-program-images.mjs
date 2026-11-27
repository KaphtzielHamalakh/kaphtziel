import {createHash} from 'node:crypto';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');

// The normal program already retains these complete original images. The
// portable restores their exact src values before executing that same program.
export function shareProgramImages(html,program){
 if(/\bid="portable-program-images-proof"|\bdata-portable-program-image=/.test(html))throw Error('Program images are already shared.');
 const available=new Set(program.match(/data:image\/[a-z+.-]+;base64,[A-Za-z0-9+/]+={0,2}/g)??[]),known=new Map(),records=[];
 const output=html.replace(/<img\b[^>]*>/g,tag=>tag.replace(/\bsrc="(data:image\/[a-z+.-]+;base64,[A-Za-z0-9+/]+={0,2})"/, (attribute,uri)=>{
  if(!available.has(uri))return attribute;
  let record=known.get(uri);
  if(!record){const bytes=Buffer.from(uri.slice(uri.indexOf(',')+1),'base64');record={id:String(records.length),bytes:bytes.length,sha256:sha(bytes),dataUriBytes:Buffer.byteLength(uri),dataUriSha256:sha(Buffer.from(uri)),uses:0};known.set(uri,record);records.push(record);}
  record.uses++;return `data-portable-program-image="${record.id}"`;
 }));
 if(!records.length)return {html,count:0,savedBytes:0,proof:null};
 const marker='<script id="portable-program-proof"';if(!output.includes(marker))throw Error('Shared images require the verified portable program.');
 const proof={format:'tropetrain-portable-program-images-v1',programBytes:Buffer.byteLength(program),programSha256:sha(Buffer.from(program)),imageCount:records.reduce((n,r)=>n+r.uses,0),records};
 const shared=output.replace(marker,'<script id="portable-program-images-proof" type="application/json">'+JSON.stringify(proof)+'</script>'+marker);
 return {html:shared,count:proof.imageCount,savedBytes:Buffer.byteLength(html)-Buffer.byteLength(shared),proof};
}
