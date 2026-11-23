// Structural source checks only; these do not approve a musical realization.
import {validateSourceGrace} from './source-grace.js';
import {sourceRepeatBounds} from './source-repeat.js';
export function baerComponentRoutes(record,figure,{allowUnmeasuredGrace=false}={}){
 const components=record.notes.filter(n=>n.cell===figure.id),byId=new Map(components.map(n=>[n.id,n]));
 if(byId.size!==components.length)throw Error('Duplicate source component ID.');
 const variants=figure.variants??[{id:null,label:null,componentIds:components.map(n=>n.id)}];
 if(!variants.length||new Set(variants.map(v=>v.id)).size!==variants.length)throw Error('Source alternatives require unique IDs.');
 const covered=new Set();
 const routes=variants.map(variant=>{
  const ids=variant.componentIds;
  if(!Array.isArray(ids)||!ids.length||new Set(ids).size!==ids.length)throw Error('A source route must list each component once.');
  const route=ids.map(id=>{const n=byId.get(id);if(!n)throw Error('Source alternative references a missing or different source cell.');covered.add(id);return n;});
  for(const n of route){
   if(n.grace){
    if(!allowUnmeasuredGrace)throw Error('Unmeasured source components require explicit timing evidence.');
    const g=validateSourceGrace(n),members=route.filter(c=>c.grace?.groupId===g.groupId),before=route.findIndex(c=>c.id===g.previousComponentId),after=route.findIndex(c=>c.id===g.nextComponentId);
    if(members.length!==g.count||before<0||after-before!==g.count+1||route[before].grace||route[after].grace||
     members.some((c,i)=>route[before+i+1]!==c||c.grace.order!==i+1||c.grace.count!==g.count||c.grace.previousComponentId!==g.previousComponentId||c.grace.nextComponentId!==g.nextComponentId))
     throw Error('A grace group must retain every ordered component between its two measured source anchors.');
   }else if(!Number.isFinite(n.quarterBeats)||n.quarterBeats<=0)throw Error('Unmeasured source components require explicit timing evidence.');
  }
  const arcs=new Map(),ties=new Map();
  for(const [index,n] of route.entries()){
   for(const arc of [...(n.slur?[n.slur]:[]),...(n.slurs??[])]){
    if(!arc.id||!['start','continue','stop'].includes(arc.phase))throw Error('Invalid source slur phase.');
    if(arc.placement&&!['above','below'].includes(arc.placement))throw Error('Invalid source slur placement.');
    if(arc.lane!==undefined&&(!Number.isInteger(arc.lane)||arc.lane<1||arc.lane>4))throw Error('Invalid slur engraving lane.');
    if(!arcs.has(arc.id))arcs.set(arc.id,[]);arcs.get(arc.id).push({index,phase:arc.phase});
   }
   if(n.tie){if(!ties.has(n.tie.id))ties.set(n.tie.id,[]);ties.get(n.tie.id).push({index,n});}
  }
  for(const arc of arcs.values())if(arc.length<2||arc[0].phase!=='start'||arc.at(-1).phase!=='stop'||arc.slice(1,-1).some(a=>a.phase!=='continue'))throw Error('A source slur must keep both endpoints in each alternative.');
  for(const tie of ties.values())if(tie.length!==2||tie[0].n.tie.phase!=='start'||tie[1].n.tie.phase!=='stop'||tie[1].index!==tie[0].index+1||tie[0].n.kind!=='note'||tie[1].n.kind!=='note'||tie[0].n.midi!==tie[1].n.midi)throw Error('A printed tie must join adjacent equal pitches.');
  sourceRepeatBounds(route,figure.repeat);
  return {variant:figure.variants?variant:null,components:route};
 });
 if(covered.size!==components.length)throw Error('A source component was omitted from every alternative.');
 return routes;
}
