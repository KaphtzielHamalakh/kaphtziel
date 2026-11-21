import {scoreData,untextedScoreData,escapeXml as x,beatLabel} from './score-data.js';
import {noteName} from './music.js';

export const STAFF_PAGE=12;
export function staffNotes(plan,words,from=0,count=STAFF_PAGE,{untexted=false}={}){
  const slice=plan.slice(from,from+count+1),notes=(untexted?untextedScoreData(slice):scoreData(slice,words)).slice(0,count);let position=84;
  return notes.map((e,index)=>{
    const width=Math.max(90,Math.min(220,[...e.syllable].length*7+40));
    const gapWidth=e.gapAfterBeats?55:0;
    const cx=position+width/2,y=100-(e.pitch.position-30)*5,ledgers=[];position+=width+gapWidth;
    if(y>=110)for(let line=110;line<=y;line+=10)ledgers.push(line);
    if(y<=50)for(let line=50;line>=y;line-=10)ledgers.push(line);
    return {...e,index:from+index,x:cx,y,width,gapWidth,restX:cx+width/2+gapWidth/2,endX:position,ledgers,
      continuedFromPrevious:!untexted&&from>0&&index===0&&plan[from-1].syllableId===e.syllableId};
  });
}
export function staffMarkup(plan,words,from=0,count=STAFF_PAGE,{untexted=false}={}){
  const notes=staffNotes(plan,words,from,count,{untexted}),width=(notes.at(-1)?.endX??200)+30;
  let svg=`<svg xmlns="http://www.w3.org/2000/svg" class="pitch-staff" width="${width}" height="250" viewBox="0 0 ${width} 250" role="group" aria-label="${untexted?'Printed pattern staff notes':'Selected staff notes'}"><title>${untexted?'Printed pattern pitches and durations; no word or syllable underlay is inferred.':'Playback event pitches and durations; draft Hebrew underlay. Consult the selected musical source.'}</title>`;
  for(let y=60;y<=100;y+=10)svg+=`<line class="staff-line" x1="14" y1="${y}" x2="${width-12}" y2="${y}"/>`;
  svg+='<text class="music-symbol clef" x="24" y="90">\ue050</text>';
  for(const e of notes){
    const up=e.y>=80,stemX=e.x+(up?5:-5),stemEnd=e.y+(up?-32:32),r=e.rhythm;
    const word=untexted?null:`${e.word.reference} · word ${e.word.ordinal}`,name=untexted?`Inspect ${e.sourceLabel}; ${noteName(e.midi)}; ${beatLabel(e.beats)} beats`:`Go to ${word}; ${noteName(e.midi)}; ${beatLabel(e.beats)} beats; ${e.syllable}`;
    svg+=`<g class="staff-note" role="button" tabindex="0" data-event="${x(e.id)}"${untexted?'':` data-word-index="${e.wordIndex}"`} aria-label="${x(name)}"><title>${x(name)}</title><rect class="staff-hit" x="${e.x-e.width/2}" y="8" width="${e.width}" height="235" rx="5"/>`;
    for(const y of e.ledgers)svg+=`<line class="ledger" x1="${e.x-10}" x2="${e.x+10}" y1="${y}" y2="${y}"/>`;
    svg+=`<text class="music-symbol accidental" x="${e.x-22}" y="${e.y}">${e.pitch.alter===1?'\ue262':e.pitch.alter===-1?'\ue260':'\ue261'}</text><ellipse class="notehead${['whole','half'].includes(r.type)?' open-notehead':''}" cx="${e.x}" cy="${e.y}" rx="5.5" ry="3.8" transform="rotate(-20 ${e.x} ${e.y})"/>`;
    if(r.type!=='whole')svg+=`<line class="note-stroke" x1="${stemX}" x2="${stemX}" y1="${e.y}" y2="${stemEnd}"/>`;
    if(['eighth','16th','32nd'].includes(r.type)){
      const flags=r.type==='eighth'?1:r.type==='16th'?2:3;
      for(let flag=0;flag<flags;flag++){const y=stemEnd+(up?flag*6:-flag*6),direction=up?1:-1;svg+=`<path class="flag" d="M${stemX} ${y} q18 ${10*direction} 4 ${24*direction} q6 ${-12*direction} -4 ${-16*direction} Z"/>`;}
    }
    for(let dot=0;dot<r.dots;dot++)svg+=`<circle class="dot" cx="${e.x+13+dot*5}" cy="${e.y%10===0?e.y-5:e.y}" r="1.7"/>`;
    if(r.actual!==r.normal&&!e.sourceTupletId)svg+=`<text class="rhythm-ratio" x="${e.x}" y="24">${r.actual}:${r.normal}</text>`;
    if(e.sourceTupletPhase==='start'){
      const end=notes.find(n=>n.sourceTupletId===e.sourceTupletId&&n.sourceTupletPhase==='stop');
      if(end)svg+=`<path class="tuplet-bracket" aria-label="Printed tuplet: ${r.actual} in the time of ${r.normal}" d="M${e.x-10} 34 v-5 H${end.x+10} v5"/><text class="rhythm-ratio" x="${(e.x+end.x)/2}" y="22">${r.actual}:${r.normal}</text>`;
    }
    svg+=`<text class="staff-pitch" x="${e.x}" y="165">${x(noteName(e.midi))}</text>`;
    if(!untexted&&(!e.continuation||e.continuedFromPrevious))svg+=`<text class="staff-lyric" x="${e.x}" y="198" lang="he" xml:lang="he" direction="rtl" unicode-bidi="plaintext">${x(e.syllable)}</text>`;
    if(!untexted&&(e.continuation||e.continuedFromPrevious))svg+=`<line class="melisma-line" x1="${e.x-e.width/2+5}" x2="${e.x+e.width/2-5}" y1="206" y2="206"/>`;
    svg+=`<text class="staff-beats" x="${e.x}" y="230">${beatLabel(e.beats)} beats</text></g>`;
    if(e.gapAfterBeats){
      const r=Math.abs(e.gapAfterBeats-.5)<1e-8?'\ue4e6':'\ue4e5';
      svg+=`<g class="staff-rest" role="img" aria-label="Rest; ${beatLabel(e.gapAfterBeats)} beats"><text class="music-symbol" x="${e.restX}" y="80">${r}</text><text class="staff-beats" x="${e.restX}" y="230">${beatLabel(e.gapAfterBeats)} rest</text></g>`;
    }
    if(e.tieStart){
      const next=notes.find(n=>n.index===e.index+1),toX=next?next.x-8:e.endX-5,toY=next?next.y+9:e.y+9;
      svg+=`<path class="tie-arc" aria-label="Tie: hold the same pitch" d="M${e.x+8} ${e.y+9} Q${(e.x+8+toX)/2} ${e.y+24} ${toX} ${toY}"/>`;
    }
    if(e.tieStop&&e.index===from&&from>0)svg+=`<path class="tie-arc" aria-label="Tie continued from previous page" d="M${e.x-e.width/2+5} ${e.y+9} Q${e.x-20} ${e.y+24} ${e.x-8} ${e.y+9}"/>`;
    if(e.sourceSlurPhase==='start'){
      const end=notes.find(n=>n.sourceSlurId===e.sourceSlurId&&n.sourceSlurPhase==='stop');
      if(end)svg+=`<path class="tie-arc source-slur" aria-label="Printed slur; notes remain distinct" d="M${e.x+8} ${e.y+10} Q${(e.x+end.x)/2} ${Math.max(e.y,end.y)+32} ${end.x-8} ${end.y+10}"/>`;
    }
  }
  return svg+'</svg>';
}
