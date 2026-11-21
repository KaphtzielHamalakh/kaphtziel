import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {transcriptionStructure} from '../pronunciation-structure.js';
const bytes=readFileSync(new URL('../data/pronunciation/torah-display.json.gz',import.meta.url));
const data=JSON.parse(gunzipSync(bytes)),digest=createHash('sha256');
const styles={};
for(const style of ['sephardic','ashkenazic']){
 const count=styles[style]={cells:0,present:0,missing:0,unavailable:0,empty:0,units:0,primaryStressUnits:0,acuteMarks:0,breveMarks:0,superscriptE:0,readingSpans:0,singleWordUnits:0,sharedGroupUnits:0};
 for(const group of data.groups)for(const row of group.rows)for(const [column,cell] of row.transcriptions[style].entries()){
  const structure=transcriptionStructure(cell);count.cells++;count[structure.status]++;count.units+=structure.units.length;
  count.primaryStressUnits+=structure.units.filter(u=>u.sourceStress).length;
  count.acuteMarks+=structure.units.reduce((n,u)=>n+u.acutePositions.length,0);
  count.breveMarks+=structure.units.reduce((n,u)=>n+u.brevePositions.length,0);
  count.superscriptE+=structure.marks.filter(m=>m.kind==='superscript-e').length;
  count.readingSpans+=structure.marks.filter(m=>m.kind==='reading').length;
  count[group.readerIds.length===1?'singleWordUnits':'sharedGroupUnits']+=structure.units.length;
  digest.update(JSON.stringify([style,group.id,row.number,column+1,structure])+'\n');
 }
}
const audit={schema:'tropetrain-pronunciation-structure-audit-v1',revision:1,sourceCommit:data.sourceCommit,license:'CC-BY-SA-4.0',
 input:'data/pronunciation/torah-display.json.gz',inputSha256:createHash('sha256').update(bytes).digest('hex'),
 structureSha256:digest.digest('hex'),groups:data.groups.length,mappedReaderWords:data.groups.reduce((n,g)=>n+g.readerIds.length,0),styles,
 method:'Original source AST traversal; exact text, explicit stressed/reading/superscript-e spans and UTF-16 half-open offsets retained. Units end only at literal middle dots, hyphens or whitespace; each boundary remains explicit. Acute and breve positions remain separate from explicit stress markup. Single-reader-word groups link units to that word ID; shared groups retain all reader IDs with no per-word syllable allocation.',
 limits:'Source display structure only. Linguistic/correspondence review pending; no phoneme grammar, Hebrew-cluster spans, note IDs, audio times, voice or equivalence to six Kinnor Accent profiles.'};
writeFileSync(new URL('../docs/PRONUNCIATION-STRUCTURE.json',import.meta.url),JSON.stringify(audit,null,2)+'\n');
console.log(JSON.stringify({pronunciationStructure:audit.styles,groups:audit.groups}));
