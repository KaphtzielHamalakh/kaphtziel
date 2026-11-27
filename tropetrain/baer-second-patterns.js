// Literal second-setting source study; no Bible-word melody rule is inferred.
import {BAER_SECOND_PATTERN_ROW} from './baer-second-pattern-data.js';
import {baerPatternPlanForSource} from './baer-patterns.js';
export const BAER_SECOND_PATTERN_ID=BAER_SECOND_PATTERN_ROW.id;
export function baerSecondPatternModes(){return BAER_SECOND_PATTERN_ROW.record.figures.flatMap(f=>{
 const common={...f,sourceFigureId:f.id,cells:[f.id]};
 return f.variants?f.variants.map((v,i)=>({...common,id:i?`${f.id}:${v.id}`:f.id,name:`${f.name} · ${v.label}`,sourceVariant:v})):[{...common,name:f.name+(f.status==='unmeasured-grace'?' · unmeasured grace · optional demo':'')}];
});}
export function baerSecondPatternSource(mode){
 const figure=baerSecondPatternModes().find(f=>f.id===mode),record=BAER_SECOND_PATTERN_ROW.record,page=figure?.page??30,scan=record.source.pages[String(page)];
 return {...BAER_SECOND_PATTERN_ROW,record:{...record,source:{...record.source,page,image:scan.image,contextImage:scan.contextImage,caption:`Printed p.${page}, second setting 2. W. ${figure?.name??record.name}. The second-row excerpt retains the written notes and dto marks; the context image retains the headings and first row used by those references. Coherent alternatives stay separate. No Bible-word fitting or complete melody grammar is asserted.`},selectedFigure:figure??null}};
}
export function baerSecondPatternPlan(mode,options={}){return baerPatternPlanForSource(baerSecondPatternSource(mode),options);}
