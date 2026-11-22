// Original policy code CC0-1.0; original PocketTorah timings retain their source licenses.
// This overlay never edits the source packet, its status, issues or null word bounds.
export function sourceTimingPolicy(recording){
 const words=recording?.words??[],withheld=()=>({kind:'withheld',eligibleWords:0,withheldWords:words.length,windows:new Map(),ambiguities:[]});
 if(recording?.status==='aligned')return {kind:'original-aligned',eligibleWords:words.length,withheldWords:0,ambiguities:[]};
 const starts=recording?.rawStarts,count=words.reduce((n,w)=>n+(w.sourceWords?.length??0),0);
 if(recording?.status!=='timing-review'||!words.length||!Array.isArray(starts)||count!==recording.sourceWordCount||starts.length!==count||starts.some(t=>!Number.isFinite(t)||t<0)||words.some(w=>!w.sourceWords?.length))return withheld();
 const faults=[];
 for(let i=0;i<starts.length-1;i++)if(starts[i]>=starts[i+1])faults.push({kind:'non-increasing',sourceIndex:i,before:starts[i],after:starts[i+1]});
 if(!faults.length||recording.issues?.length!==faults.length||faults.some((f,i)=>Object.keys(f).some(k=>f[k]!==recording.issues[i][k])))return withheld();
 const ambiguities=faults.map(f=>({...f,lowSeconds:Math.min(f.before,f.after),highSeconds:Math.max(f.before,f.after)})),windows=new Map();let offset=0;
 for(const word of words){
  const sourceStartIndex=offset;offset+=word.sourceWords.length;
  const startSeconds=starts[sourceStartIndex],endSeconds=offset<starts.length?starts[offset]:null;
  // Closed intersection also withholds both neighbors that depend on a bad endpoint.
  if((endSeconds===null||endSeconds>startSeconds)&&!ambiguities.some(a=>startSeconds<=a.highSeconds&&(endSeconds===null||endSeconds>=a.lowSeconds)))windows.set(word.id,{startSeconds,endSeconds,sourceStartIndex,sourceEndIndex:offset<starts.length?offset:null,timingPolicy:'partial-original-windows-v1'});
 }
 return {kind:'partial-original-windows',eligibleWords:windows.size,withheldWords:words.length-windows.size,windows,ambiguities};
}
export function originalWordWindow(recording,word,policy=sourceTimingPolicy(recording)){
 const canonical=recording?.words?.[word?.referenceIndex];
 if(!canonical||canonical.id!==word.id||canonical.uxlcHebrew!==word.uxlcHebrew)return null;
 if(policy.kind==='original-aligned')return {startSeconds:canonical.startSeconds,endSeconds:canonical.endSeconds};
 return policy.windows.get(canonical.id)??null;
}
