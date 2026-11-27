// Original source transcription compiler, CC0-1.0. No word melody is inferred.
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {baerComponentRoutes} from '../baer-notation.js';
const root=new URL('../',import.meta.url),read=p=>readFileSync(new URL(p,root)),sha=b=>createHash('sha256').update(b).digest('hex');
const manualPath='data/notation/baer-no105-third-transcription.json',raw=read(manualPath),manual=JSON.parse(raw),parentPath='docs/BAER-NO105-SECOND-PATTERNS.json',parentRaw=read(parentPath),parent=JSON.parse(parentRaw);
assert.equal(manual.format,'tropetrain-baer-third-setting-transcription-v1');assert.equal(manual.parentSecondSetting.path,parentPath);assert.equal(sha(parentRaw),manual.parentSecondSetting.sha256);assert.equal(parent.revision,1);
assert.deepEqual(manual.figures.map(f=>f.id),parent.figures.slice(0,29).map(f=>f.id));
for(const k of['review','bibleWordApplication','syllables','phonemes','singingVoice'])assert.equal(manual[k],null);
const id='baer-1894-no105-third-setting',figures=[],notes=[],inputs=[{path:manualPath,sha256:sha(raw)},{path:parentPath,sha256:sha(parentRaw)},...['scripts/import-baer-third-patterns.mjs','baer-notation.js','source-grace.js','source-repeat.js'].map(path=>({path,sha256:sha(read(path))}))],pages={},images={};
const types={q:['quarter',1],e:['eighth',.5],s:['16th',.25],x:['32nd',.125],e3:['eighth',.5],s3:['16th',.25],g:['eighth',null]},pitchSteps={C:0,D:2,E:4,F:5,G:7,A:9,B:11};
const previousRevision=structuredClone(manual.previousRevision);
assert.equal(previousRevision.revision,1);
for(const [path,expected]of[[previousRevision.record,previousRevision.recordSha256],[previousRevision.sourceDelta,previousRevision.sourceDeltaSha256]]){assert.equal(sha(read(path)),expected);inputs.push({path,sha256:expected});}
function note(spec,cell,index,page){
 const [pitch,code,dots=0]=spec,[type,base]=types[code]??[];assert(type);const n={id:`baer105-3w-${cell}-${index+1}`,cell,kind:pitch==='R'?'rest':'note',quarterBeats:code==='g'?null:base*(2-2**-dots)*(code.endsWith('3')?2/3:1),rhythm:{type,dots,actual:code.endsWith('3')?3:1,normal:code.endsWith('3')?2:1},sourcePage:page,sourceLocation:`Baer [1894], p.${page}, third setting 3. W., ${cell}, realized component ${index+1}`,sourceNotation:{method:'written-third-row',sourceSetting:'3. W.'}};
 if(pitch!=='R'){const m=pitch.match(/^([A-G])([#b]?)([3-6])$/);assert(m,pitch);const alter=m[2]==='#'?1:m[2]==='b'?-1:0;n.sourcePitch={step:m[1],alter,octave:Number(m[3])};n.midi=12*(Number(m[3])+1)+pitchSteps[m[1]]+alter;if(m[2]==='#')n.accidentalEvidence='explicit_sharp_in_third_row';}
 return n;
}
for(const spec of manual.figures){
 const oldFigure=parent.figures.find(f=>f.id===spec.id),oldNotes=parent.notes.filter(n=>n.cell===spec.id),page=oldFigure.page;
 const f={id:spec.id,name:oldFigure.name,page,sourceSection:'No105 ordinary Torah table',sourceSetting:'3. W.',status:'transcribed',review:null,wordApplication:null,transcriptionMethod:spec.method,sourceReference:{manualPath,secondSettingRecord:parentPath,secondSettingSha256:sha(parentRaw)}};
 if(oldFigure.sourceCondition)f.sourceCondition=structuredClone(oldFigure.sourceCondition);
 if(spec.method==='inspection-pending'){Object.assign(f,{status:'unresolved-route',pending:spec.pending,sourceInspection:structuredClone(spec.sourceInspection??{}),realizedComponents:0,coherentMonophonicRoutes:0});figures.push(f);continue;}
 assert(['written','dto-whole','written-prefix-dto-tail'].includes(spec.method),'Unknown source transcription method');
 if(spec.sourceMeter)f.sourceMeter=spec.sourceMeter;
 if(spec.notationLimit)f.contextPending=spec.notationLimit;
 if(spec.sourceInspection)f.sourceInspection=structuredClone(spec.sourceInspection);
 let ns=[],parentIndices=[],inheritVariants=false;
 if(spec.method==='written')ns=spec.notes.map((n,i)=>note(n,f.id,i,page));
 else{
  const count=['dto-whole','written-prefix-dto-tail'].includes(spec.method)?oldNotes.length:spec.parentCount;assert(Number.isInteger(count)&&count>0&&count<=oldNotes.length);
  parentIndices=Array.from({length:count},(_,i)=>i);const ids=new Map(oldNotes.map((n,i)=>[n.id,`baer105-3w-${f.id}-${i+1}`]));
  const rewrite=value=>Array.isArray(value)?value.map(rewrite):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([k,v])=>[k,rewrite(v)])):typeof value==='string'?(ids.get(value)??value.replaceAll('baer105-2w','baer105-3w').replace(/^baer105-(?!3w)/,'baer105-3w-')):value;
  ns=oldNotes.slice(0,count).map((n,i)=>({...rewrite(structuredClone(n)),id:ids.get(n.id),sourceLocation:`Baer [1894], p.${page}, third setting 3. W., ${f.id}, realized component ${i+1}; literal dto refers to second-setting component ${n.id}`,sourceNotation:{method:'literal-dto-reference',sourceSetting:'3. W.',parentRecord:parentPath,parentSha256:sha(parentRaw),parentComponentId:n.id,transitiveSourceNotation:structuredClone(n.sourceNotation??null)}}));
  if(spec.prefix){assert.equal(spec.prefix.length,1);const written=note(spec.prefix[0],f.id,0,page);ns[0]={...ns[0],...written};}
  if(spec.method==='written-prefix-dto-tail'){
   assert.equal(spec.parentStart,1);inheritVariants=true;f.printedDitto={scope:'After the explicitly written first note, the remaining source cell is marked dto.',parentCell:f.id,parentComponents:oldNotes.slice(1).map(n=>n.id)};
  }else if(spec.method==='dto-whole'){inheritVariants=true;f.printedDitto={scope:'The whole third-row cell is marked dto.',parentCell:f.id,parentComponents:oldNotes.map(n=>n.id)};}
  else f.printedDitto={scope:spec.method==='dto-prefix-written-tail'?'The initial source passage is marked dto; the tail is separately written.':'After the written first component, dto refers to the middle passage; the final pickup and ending are separately written.',parentCell:f.id,parentComponents:ns.filter(n=>n.sourceNotation.method==='literal-dto-reference').map(n=>n.sourceNotation.parentComponentId)};
  if(inheritVariants&&oldFigure.variants)f.variants=oldFigure.variants.map(v=>({...v,componentIds:v.componentIds.map(x=>ids.get(x))}));
  if(inheritVariants&&oldFigure.sourceMeter)f.sourceMeter=oldFigure.sourceMeter;
  if(spec.notes)ns.push(...spec.notes.map((n,i)=>note(n,f.id,count+i,page)));
 }
 if(spec.variants)f.variants=spec.variants.map(v=>({id:v.id,label:v.label,componentIds:v.components.map(i=>ns[i-1]?.id)}));
 for(const [index,evidence]of Object.entries(spec.stemEvidence??{})){assert(ns[Number(index)-1]);ns[Number(index)-1].sourceNotation.stemEvidence=evidence;}
 for(const [i,input]of(spec.arcs??[]).entries()){
  const arc=Array.isArray(input)?{members:input}:input,starts=arc.starts??[arc.members[0]],stops=arc.stops??[arc.members.at(-1)];
  for(const index of arc.members){const n=ns[index-1];assert(n,`${f.id} arc${index}`);(n.slurs??=[]).push({id:`baer105-3w-${f.id}-arc-${i+1}`,phase:starts.includes(index)?'start':stops.includes(index)?'stop':'continue',placement:arc.placement??'below'});}
 }
 for(const [i,members]of(spec.tuplets??[]).entries())for(const [j,index]of members.entries()){assert.equal(ns[index-1].rhythm.actual,3);ns[index-1].tuplet={id:`baer105-3w-${f.id}-tuplet-${i+1}`,phase:j===0?'start':j===members.length-1?'stop':'continue'};}
 for(const group of spec.sharedHeads??[]){const head=`baer105-3w-${f.id}-printed-head-${group.members[0]}`;for(const index of group.members)ns[index-1].sourcePrintedHead={id:head,reason:group.reason};}
 for(const pair of spec.ties??[]){assert(pair.length===2);const id=`baer105-3w-${f.id}-tie-${pair.join('-')}`;pair.forEach((index,i)=>{assert(ns[index-1]);ns[index-1].tie={id,phase:i?'stop':'start'};});}
 for(const [index,evidence]of Object.entries(spec.accidentals??{})){assert(ns[Number(index)-1]);ns[Number(index)-1].accidentalEvidence=evidence;}
 for(const [i,g]of(spec.graceGroups??[]).entries()){
  const groupId=`baer105-3w-${f.id}-grace-${i+1}`;
  g.members.forEach((index,j)=>{const n=ns[index-1];assert(n&&n.quarterBeats===null&&n.kind==='note');n.grace={kind:'unmeasured',groupId,previousComponentId:ns[g.previous-1].id,nextComponentId:ns[g.next-1].id,order:j+1,count:g.members.length,duration:null,stealTimeFollowing:null,stealTimePrevious:null,printedSize:'small',slash:g.slash,printedBeams:1};});
 }
 const graces=ns.filter(n=>n.grace);if(graces.length){f.status='unmeasured-grace';f.unmeasuredGraceComponents=graces.length;f.unmeasuredGraceNotes=new Set(graces.map(n=>n.sourcePrintedHead?.id??n.id)).size;f.sourceMeasuredQuarterBeats=ns.filter(n=>!n.grace).reduce((s,n)=>s+n.quarterBeats,0);f.pending='This source route includes an unmeasured printed grace, directly written or preserved by a literal dto reference. Source duration and stealing ratio remain unspecified. Only the separately chosen original 80 ms instrumental timing demonstration can play it; no historical timing or word allocation is approved.';}
 const local={...parent,id,revision:2,figures:[f],notes:ns};const routes=baerComponentRoutes(local,f,{allowUnmeasuredGrace:true});
 if(graces.length&&routes.length>1){
  f.sourceMeasuredQuarterBeatsByVariant=Object.fromEntries(routes.map(r=>[r.variant.id,r.components.filter(n=>!n.grace).reduce((s,n)=>s+n.quarterBeats,0)]));
  const measured=Object.values(f.sourceMeasuredQuarterBeatsByVariant);if(measured.every(n=>Math.abs(n-measured[0])<1e-10))f.sourceMeasuredQuarterBeats=measured[0];else delete f.sourceMeasuredQuarterBeats;
 }
 if(spec.expectedVariantBeats)assert.deepEqual(Object.keys(spec.expectedVariantBeats),routes.map(r=>r.variant.id));
 for(const route of routes){const expected=spec.expectedVariantBeats?.[route.variant?.id]??spec.expectedBeats;if(expected!==undefined)assert(Math.abs(route.components.reduce((s,n)=>s+n.quarterBeats,0)-expected)<1e-10,`${f.id} ${route.variant?.id??''} beats`);}
 if(spec.expectedVariantBeats)f.literalVariantQuarterBeats=structuredClone(spec.expectedVariantBeats);
 f.realizedComponents=ns.length;f.coherentMonophonicRoutes=routes.length;if(spec.expectedBeats!==undefined)f.literalQuarterBeats=spec.expectedBeats;
 figures.push(f);notes.push(...ns);
}
assert.equal(manual.nativeSourceRasters.length,6);for(const r of manual.nativeSourceRasters){assert.deepEqual(r.size,[3868,5677]);assert(/^[a-f0-9]{64}$/.test(r.sha256)&&r.bytes>1000000);assert.equal(r.url,parent.source.pages[String(r.page)].url.replace('/3000,/','/3868,/'));}
for(const r of manual.sourceRasters){const p=parent.source.pages[r.page];assert.equal(r.sha256,p.sha256);assert.equal(r.bytes,p.bytes);assert.equal(r.url,p.url);}
for(const crop of manual.sourceCrops){
 const name='assets/scores/'+crop.file,bytes=read(name),p=parent.source.pages[String(crop.page)];assert.equal(bytes.length,crop.bytes);assert.equal(sha(bytes),crop.sha256);assert.equal(crop.rect.length,4);const context=read(p.image);assert.equal(sha(context),p.imageSha256);inputs.push({path:name,sha256:sha(bytes)},{path:p.image,sha256:sha(context)});images[name]='data:image/png;base64,'+bytes.toString('base64');
 pages[String(crop.page)]={...p,image:name,imageBytes:bytes.length,imageSha256:sha(bytes),inspectionCrop:crop.rect,derivation:crop.derivation,contextImage:{image:p.image,imageBytes:p.imageBytes,imageSha256:p.imageSha256,purpose:'Immediate preceding second-row notation for literal dto references; its canonical record retains the first-row context and complete transitive references.'}};
 if(crop.previousExcerpt){assert.equal(sha(read(crop.previousExcerpt.file)),crop.previousExcerpt.sha256);pages[String(crop.page)].previousExcerpt=structuredClone(crop.previousExcerpt);}
}
assert.equal(Object.keys(pages).length,6);const principle=structuredClone(parent.notationPrinciple);principle.application='Preserve coherent upper/lower alternatives in the third printed setting; common heads reconverge, and no alternatives are sounded as chords. Independent musical review remains pending.';
const preface=read(principle.source.file);assert.equal(sha(preface),principle.source.sha256);inputs.push({path:principle.source.file,sha256:sha(preface)});
const record={schema:'tropetrain-baer-third-setting-patterns-v1',id,revision:2,name:'Baer [1894] No105 · third printed ordinary-Torah setting',inputs,inspectionStatus:manual.status,previousRevision,nativeSourceRasters:manual.nativeSourceRasters,source:{...parent.source,pages,detailImages:{},contextImage:pages['30'].contextImage,caption:'Third printed ordinary-Torah setting3.W. All29ordinary source figures have literal draft routes; unmeasured graces require explicit original timing.',setting:'3. W.',printedPages:[30,31,32,33,34,35],imageAlt:'Unretouched excerpt of Baer No105 third printed ordinary-Torah setting; adjacent staff fragments remain context.'},sourceKey:parent.sourceKey,notationPrinciple:principle,figures,notes,matchingQueries:{},scope:'All29ordinary-table columns of the third printed setting on30–35 retain literal draft components and coherent alternatives. Two figures include unmeasured graces whose historical timing stays unassigned. The distinct No111rare-sign section on36 is not assigned to this setting. Literal instrumental source-name study, not a full contextual Torah melody grammar or Kinnor preset.',timing:'Written values at regular user quarter-note BPM; recitative timing, tuning and interpretation remain unreviewed. Any directly written or referenced unmeasured grace requires a separately chosen original timing demonstration. Unknown route membership supplies no replacement music.',pronunciation:null,syllableUnderlay:null,phonemes:null,review:null,wordApplication:null,limits:['No arbitrary Bible-word, stressed-syllable or phoneme fitting.','No reviewed performance, historical tuning, complete cantorial grammar or independent singing voice.','Literal dto references retain exact parent component IDs and input hashes; shared source notation is not an independently reviewed transcription.','Upper/lower source lines are coherent monophonic alternatives, never combined chords.','Modern-sign context queries and rare-sign third-setting correspondence remain unassigned.']};
const outputPath='docs/BAER-NO105-THIRD-PATTERNS.json',body=JSON.stringify(record,null,2)+'\n';writeFileSync(new URL(outputPath,root),body);
const row={id,label:'Baer [1894] · No105 · third printed setting · draft source study',sourceCatalog:{id,revision:2},recordPath:outputPath,unavailable:[],record};
writeFileSync(new URL('baer-third-pattern-data.js',root),'// Generated from pinned third-row notation and explicit dto references. New transcription CC0-1.0.\nexport const BAER_THIRD_PATTERN_ROW='+JSON.stringify(row)+';\nexport const BAER_THIRD_PATTERN_IMAGES='+JSON.stringify(images)+';\nexport const BAER_THIRD_PATTERN_RECORDS='+JSON.stringify({[outputPath]:'data:application/json;base64,'+Buffer.from(body).toString('base64')})+';\n');
console.log(JSON.stringify({thirdSettingFigures:figures.length,measured:figures.filter(f=>f.status==='transcribed').length,unmeasuredGrace:figures.filter(f=>f.status==='unmeasured-grace').length,unresolved:figures.filter(f=>f.status==='unresolved-route').length,realizedComponents:notes.length,coherentRoutes:figures.reduce((s,f)=>s+f.coherentMonophonicRoutes,0),wordApplication:null,review:null}));
