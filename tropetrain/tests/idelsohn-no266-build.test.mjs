import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {restoredPortableHtml,portableFileBytes} from './portable-artifact.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url)),sha=b=>createHash('sha256').update(b).digest('hex');
test('normal and portable retain exactNo266photo/evidence/audit, independent original choices and default-off controls below the host limit',()=>{
 const raw=read('docs/IDELSOHN-NO266-SCORE.json'),r=JSON.parse(raw),auditRaw=read('docs/IDELSOHN-NO266-PLAYBACK.json'),a=JSON.parse(auditRaw),normal=read('index.html').toString(),portable=restoredPortableHtml(read('TropeTrain.html')).toString(),program=read('app.bundle.js').toString();assert.equal(a.schema,'tropetrain-no266-source-word-playback-audit-v1');assert.equal(a.source.recordSha256,sha(raw));assert.equal(a.counts.pitches,131);assert.equal(a.counts.printedGroups,95);assert.equal(a.independence.existingMamUnits,94);assert.equal(a.independence.personalNo268FittingApplicable,false);assert.equal(a.independence.acceptedNo266SyllableLinks,null);assert.equal(a.originalChoices.defaultEnabled,false);for(const i of a.inputs)assert.equal(sha(read(i.path)),i.sha256,i.path);
 for(const html of [normal,portable])for(const id of ['no266-score-open','no266-score-verse','no266-score-all','no266-score-image','no266-score-evidence','no266-study-controls','no266-parenthetical-demo','no266-small-eighth-demo','printed-fit-editor','printed-small-eighth-demo','pattern-small-eighth-demo'])assert(html.includes('id="'+id+'"'),id);
 for(const html of [normal,portable]){assert.match(html,/<input id="no266-parenthetical-demo" type="checkbox">/);assert.match(html,/<input id="no266-small-eighth-demo" type="checkbox">/);assert(html.includes('id="no266-study-controls" hidden'));}
 assert(program.includes('data:image/jpeg;base64,'+read(r.source.image).toString('base64')));assert(program.includes('data:application/json;base64,'+raw.toString('base64')));assert(portable.includes('data:application/json;base64,'+auditRaw.toString('base64')));assert(normal.includes('href="./docs/IDELSOHN-NO266-PLAYBACK.json"'));assert(read('sw.js').includes('docs/IDELSOHN-NO266-PLAYBACK.json'));assert(portableFileBytes()<100*1024*1024);
});
