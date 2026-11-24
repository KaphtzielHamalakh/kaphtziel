import test from 'node:test';import assert from 'node:assert/strict';import {mkdtempSync,writeFileSync,rmSync,unlinkSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';import {pathToFileURL} from 'node:url';import {createHash} from 'node:crypto';
import {captureAuditInputs,verifyAuditInputs} from '../scripts/audit-inputs.mjs';
test('audit snapshots retain exact marked Hebrew bytes and stable file identities',()=>{
 const dir=mkdtempSync(join(tmpdir(),'tropetrain-audit-inputs-')),root=pathToFileURL(dir+'/');try{const text='אֽ͏ָהֳלוֹ֙';writeFileSync(join(dir,'source.txt'),text);const before=captureAuditInputs(root,['source.txt']);assert.equal(before[0].sha256,createHash('sha256').update(text).digest('hex'));assert.deepEqual(verifyAuditInputs(root,before),before);}finally{rmSync(dir,{recursive:true,force:true});}
});
test('changed or removed inputs cannot be certified with an earlier run’s evidence',()=>{
 const dir=mkdtempSync(join(tmpdir(),'tropetrain-audit-inputs-')),root=pathToFileURL(dir+'/');try{writeFileSync(join(dir,'source.txt'),'before');const before=captureAuditInputs(root,['source.txt']);writeFileSync(join(dir,'source.txt'),'after');assert.throws(()=>verifyAuditInputs(root,before),/changed during the run: source.txt/);unlinkSync(join(dir,'source.txt'));assert.throws(()=>verifyAuditInputs(root,before),/ENOENT/);}finally{rmSync(dir,{recursive:true,force:true});}
});
