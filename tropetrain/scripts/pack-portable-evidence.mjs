import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const sha=b=>createHash('sha256').update(b).digest('hex');
// Pack only complete JSON hrefs. The original href, link text, IDs, download
// attributes and source bytes are independently recoverable without networking.
function collectPortableEvidence(html){
 if(/\bid="portable-evidence-(?:proof|data)"|\bdata-portable-evidence=/.test(html))throw Error('Portable evidence is already packed.');
 const records=[],values=[],known=new Map();let linkCount=0;
 const output=html.replace(/<a\b[^>]*>/g,tag=>tag.replace(/(\s)href="(data:application\/json;base64,([A-Za-z0-9+/]*={0,2}))"/,(_,space,url,value)=>{
  const b=Buffer.from(value,'base64');if(b.length>64*1024*1024)throw Error('Evidence source exceeds the loader limit.');if(!b.length||b.toString('base64')!==value)throw Error('Invalid evidence base64.');const text=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(b);JSON.parse(text.charCodeAt(0)===0xfeff?text.slice(1):text);
  let index=known.get(value);if(index===undefined){index=records.length;known.set(value,index);values.push(value);records.push({id:String(index),bytes:b.length,sha256:sha(b),base64Bytes:value.length,links:0});}
  records[index].links++;linkCount++;return `${space}href="#startup-status" data-portable-evidence="${index}"`;
 }));
 if(!records.length)return {empty:{html,count:0,links:0,savedBytes:0,proof:null}};
 const marker='<script id="portable-program-proof"';if(!output.includes(marker))throw Error('Portable evidence must restore before the app starts.');
 if(records.length>2048||linkCount>10000||records.reduce((n,r)=>n+r.bytes,0)>256*1024*1024)throw Error('Evidence inventory exceeds the loader limit.');
 return {html,output,marker,records,linkCount,bytes:Buffer.from(JSON.stringify(values))};
}
function finishPortableEvidence(p,gzip){
 const {html,output,marker,records,linkCount,bytes}=p;gzip=Buffer.from(gzip);
 if(bytes.length>256*1024*1024||gzip.length>128*1024*1024)throw Error('Evidence packet exceeds the loader limit.');
 if(!gunzipSync(gzip,{maxOutputLength:Math.max(1,bytes.length)}).equals(bytes))throw Error('Portable evidence gzip changed the complete source packet.');
 const proof={format:'tropetrain-portable-evidence-v1',encoding:'gzip+base64',packetBytes:bytes.length,packetSha256:sha(bytes),gzipBytes:gzip.length,gzipSha256:sha(gzip),linkCount,records};
 const markup='<script id="portable-evidence-proof" type="application/json">'+JSON.stringify(proof)+'</script><script id="portable-evidence-data" type="application/octet-stream">'+gzip.toString('base64')+'</script>';
 const packed=output.replace(marker,markup+marker);return {html:packed,count:records.length,links:linkCount,savedBytes:Buffer.byteLength(html)-Buffer.byteLength(packed),proof};
}

export function packPortableEvidence(html){const p=collectPortableEvidence(html);return p.empty??finishPortableEvidence(p,gzipSync(p.bytes,{level:9}));}
export async function packPortableEvidenceWithCompression(html,compress){const p=collectPortableEvidence(html);if(p.empty)return p.empty;return finishPortableEvidence(p,await compress(p.bytes));}
