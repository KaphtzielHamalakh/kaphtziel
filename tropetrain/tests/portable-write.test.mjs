import test from 'node:test';import assert from 'node:assert/strict';
import{mkdtemp,writeFile,readFile,readdir,rm}from'node:fs/promises';import os from'node:os';import path from'node:path';
import{writePortableArtifact}from'../scripts/write-portable.mjs';
async function fixture(run){const root=await mkdtemp(path.join(os.tmpdir(),'tropetrain-portable-write-'));try{await writeFile(path.join(root,'TropeTrain.html'),'previous complete artifact');await run(root);}finally{await rm(root,{recursive:true,force:true});}}
test('a complete portable replacement is published only after writing succeeds',()=>fixture(async root=>{
 const result=await writePortableArtifact(root,'<p>בָּרָ֣א</p>',{reserveBytes:0});assert.equal(result.bytes,Buffer.byteLength('<p>בָּרָ֣א</p>'));assert.equal(await readFile(path.join(root,'TropeTrain.html'),'utf8'),'<p>בָּרָ֣א</p>');assert.deepEqual(await readdir(root),['TropeTrain.html']);
}));
test('a real partial-write failure preserves the prior complete artifact and removes only its owned temporary directory',()=>fixture(async root=>{
 await assert.rejects(writePortableArtifact(root,'new complete artifact',{reserveBytes:0,write:async file=>{await writeFile(file,'partial');throw Object.assign(Error('simulated disk exhaustion'),{code:'ENOSPC'});}}),{code:'ENOSPC'});
 assert.equal(await readFile(path.join(root,'TropeTrain.html'),'utf8'),'previous complete artifact');assert.deepEqual(await readdir(root),['TropeTrain.html']);
}));
test('host-limit and free-space refusals do not begin writing or replace the previous artifact',()=>fixture(async root=>{
 let writes=0;const write=async()=>{writes++;};
 await assert.rejects(writePortableArtifact(root,'12345',{maxBytes:5,reserveBytes:0,write}),/host limit/);
 await assert.rejects(writePortableArtifact(root,'12345',{reserveBytes:10,availableBytes:async()=>14,write}),/MiB free/);
 assert.equal(writes,0);assert.equal(await readFile(path.join(root,'TropeTrain.html'),'utf8'),'previous complete artifact');assert.deepEqual(await readdir(root),['TropeTrain.html']);
}));
