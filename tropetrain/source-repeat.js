// Literal repeat markers and an explicit ORIGINAL instrumental policy.
// A printed repeat sign does not establish a historical numeric count.
export const REPEAT_DEMO=Object.freeze({id:'original-two-pass-repeat-v1',passes:2,sourceCount:null,review:null,status:'original-instrumental-demonstration',label:'Original two-pass repeat demonstration'});
export function sourceRepeatBounds(components,repeat){
 if(!repeat)return null;
 const start=components.findIndex(c=>c.id===repeat.startComponentId),end=components.findIndex(c=>c.id===repeat.endComponentId);
 if(!repeat.id||repeat.startDirection!=='forward'||repeat.endDirection!=='backward'||repeat.sourceCount!==null||repeat.review!==null||start<0||end<=start||components[start].grace||components[end].grace||components[start].kind!=='note'||components[end].kind!=='note')throw Error('A source repeat must preserve both measured boundaries and its unspecified count.');
 for(const c of components.filter(c=>c.grace)){
  const g=c.grace,positions=[c.id,g.previousComponentId,g.nextComponentId].map(id=>components.findIndex(c=>c.id===id)),inside=positions.map(i=>i>=start&&i<=end);
  if(inside.some(Boolean)&&!inside.every(Boolean))throw Error('A source repeat cannot split a grace group.');
 }
 return {start,end};
}
export function repeatOccurrences(components,repeat,{repeatDemo=false,written=false}={}){
 const bounds=sourceRepeatBounds(components,repeat);
 if(!bounds)return components.map((component,index)=>({component,index}));
 if(!written&&repeatDemo!==true)throw Error('Choose the original two-pass repeat demonstration; the printed repeat count remains unspecified.');
 const {start,end}=bounds;
 const literal=Object.freeze({...repeat});
 if(written)return components.map((component,index)=>({component,index,...(index===start?{sourceRepeatStart:literal}:{}),...(index===end?{sourceRepeatEnd:literal}:{})}));
 const section=components.slice(start,end+1);
 return [...components.slice(0,start).map((component,index)=>({component,index})),...[1,2].flatMap(pass=>section.map((component,i)=>({component,index:start+i,repeatPass:pass,sourceRepeat:literal,performanceRepeat:REPEAT_DEMO}))),...components.slice(end+1).map((component,i)=>({component,index:end+1+i}))];
}
