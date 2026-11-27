// Literal third-row source study. Unresolved routes supply no substitute music.
import {BAER_THIRD_PATTERN_ROW} from './baer-third-pattern-data.js';
import {baerPatternPlanForSource} from './baer-patterns.js';
export const BAER_THIRD_PATTERN_ID=BAER_THIRD_PATTERN_ROW.id;
export function baerThirdPatternModes(){return BAER_THIRD_PATTERN_ROW.record.figures.flatMap(f=>{
 const common={...f,sourceFigureId:f.id,cells:[f.id]};
 return f.variants?f.variants.map((v,i)=>({...common,id:i?`${f.id}:${v.id}`:f.id,name:`${f.name} · ${v.label}`+(f.status==='unmeasured-grace'?' · unmeasured grace · optional demo':''),sourceVariant:v})):[{...common,name:f.name+(f.status==='unmeasured-grace'?' · unmeasured grace · optional demo':f.status==='unresolved-route'?' · notation pending':'')}];
});}
export function baerThirdPatternSource(mode){
 const figure=baerThirdPatternModes().find(f=>f.id===mode),record=BAER_THIRD_PATTERN_ROW.record,page=figure?.page??30,scan=record.source.pages[String(page)];
 return {...BAER_THIRD_PATTERN_ROW,record:{...record,source:{...record.source,page,image:scan.image,contextImage:scan.contextImage,caption:`Printed p.${page}, third setting 3. W. ${figure?.name??record.name}. The third-row excerpt retains written notation; the immediate second-row context supplies literal dto references and its record retains their first-row lineage. Compare the separate stem paths; unmeasured grace timing remains unassigned. No Bible-word fitting, reviewed performance or complete melody grammar is asserted.`},selectedFigure:figure??null}};
}
export function baerThirdPatternPlan(mode,options={}){return baerPatternPlanForSource(baerThirdPatternSource(mode),options);}
