import {Text} from 'havarotjs';

export function sourceClusters(text){
  const matches=[...text.matchAll(/[א-ת][^א-ת]*/gu)];
  if(!matches.length)return [text];
  const clusters=matches.map(m=>m[0]);clusters[0]=text.slice(0,matches[0].index)+clusters[0];return clusters;
}
export function alignedSyllables(word,{fixture=null}={}){
  const clusters=sourceClusters(word.sourceHebrew);
  let lengths,stresses,romans,status,diagnostic=null;
  if(fixture){lengths=fixture[0];romans=fixture[1];stresses=lengths.map((_,i)=>i===fixture[2]);status='draft-manual';}
  else{
    try{
      // Analyze a separate representation. Neither normalization nor qamats
      // inference is ever written back into the original Hebrew string.
      const analysis=new Text(word.sourceHebrew.replace(/־$/u,''),{strict:false});
      const syllables=analysis.syllables;
      lengths=syllables.map(s=>(s.text.match(/[א-ת]/gu)||[]).length);
      stresses=syllables.map(s=>s.isAccented&&!word.sourceHebrew.endsWith('־'));
      if(!lengths.length||lengths.some(n=>n===0)||lengths.reduce((a,b)=>a+b,0)!==clusters.length)throw Error('Analyzer boundaries do not map to the source letters.');
      if(/^[יהוה]+$/u.test(word.sourceHebrew.replace(/[^א-ת]/gu,''))&&word.sourceHebrew.replace(/[^א-ת]/gu,'')==='יהוה'){
        diagnostic='Divine-name spoken form requires a separate reviewed reading rule.';status='unsegmented';
      }else status='draft-automatic';
    }catch(error){lengths=[clusters.length];stresses=[false];status='unsegmented';diagnostic=error.message;}
  }
  let offset=0;
  const result=lengths.map((length,i)=>{
    const sourceHebrew=clusters.slice(offset,offset+length).join('');offset+=length;
    return {id:`${word.id}-s${i+1}`,sourceHebrew,roman:romans?.[i]??null,stress:stresses[i],phonemes:null,
      reviewStatus:status,analyzer:fixture?'manual fixture':'havarotjs 0.25.5',...(diagnostic?{diagnostic}:{} )};
  });
  if(offset!==clusters.length||result.map(s=>s.sourceHebrew).join('')!==word.sourceHebrew)throw Error(`Source alignment failed: ${word.id}`);
  return result;
}
