import {isJointEvent,eventNavigationIndex} from './event-correspondence.js';
import {scoreData,untextedScoreData,escapeXml as x,beatLabel,eventPitchName,rhythmSpelling} from './score-data.js';
import {notePronunciationText} from './pronunciation-note-links.js';

export const STAFF_PAGE=12;

function restMarkup(rest,cx,height,beatsY){
 const names={whole:'\ue4e3',half:'\ue4e4',quarter:'\ue4e5',eighth:'\ue4e6','16th':'\ue4e7','32nd':'\ue4e8'},glyph=names[rest.rhythm?.type]??(Math.abs(rest.beats-.5)<1e-8?'\ue4e6':'\ue4e5');
 let result=`<g class="staff-rest" role="${rest.id?'button':'img'}"${rest.id?` tabindex="0" data-rest="${x(rest.id)}"`: ''} aria-label="Rest; ${beatLabel(rest.beats)} beats${rest.sourceLocation?'; '+x(rest.sourceLocation):''}">${rest.id?`<rect class="staff-hit" x="${cx-24}" y="8" width="48" height="${height-15}" rx="5"/>`: ''}<text class="music-symbol" x="${cx}" y="80">${glyph}</text>`;
 for(let dot=0;dot<(rest.rhythm?.dots??0);dot++)result+=`<circle class="dot rest-dot" cx="${cx+12+dot*5}" cy="76" r="1.7"/>`;
 return result+`<text class="staff-beats" x="${cx}" y="${beatsY}">${beatLabel(rest.beats)} rest</text></g>`;
}

export function staffNotes(plan,words,from=0,count=STAFF_PAGE,{untexted=false,pronunciationLinks=null}={}){
  const slice=plan.slice(from,from+count+1),notes=(untexted?untextedScoreData(slice):scoreData(slice,words)).slice(0,count);let position=84+(from===0?55*(plan[0]?.sourceRestsBefore?.length??0):0);
  return notes.map((e,index)=>{
    const pronunciationLink=untexted||e.sourceWordOnly?null:pronunciationLinks?.get(e.id),pronunciationText=notePronunciationText(pronunciationLink);
    const width=Math.max(90,Math.min(220,Math.max([...(e.lyricText??e.syllable??'')].length*7+40,[...(pronunciationText??'')].length*8+24)));
    const gapWidth=e.gapAfterBeats?55*(e.sourceRestsAfter?.length??1):0;
    if(e.sourceRepeatStart)position+=34;
    const cx=position+width/2,y=100-(e.pitch.position-30)*5,ledgers=[];position+=width+gapWidth+(e.sourceRepeatEnd?34:0);
    if(y>=110)for(let line=110;line<=y;line+=10)ledgers.push(line);
    if(y<=50)for(let line=50;line>=y;line-=10)ledgers.push(line);
    return {...e,pronunciationLink,pronunciationText,index:from+index,x:cx,y,width,gapWidth,restX:cx+width/2+gapWidth/2,endX:position,ledgers,
      continuedFromPrevious:!untexted&&from>0&&index===0&&(e.sourceWordOnly?plan[from-1].wordId===e.wordId:plan[from-1].syllableId===e.syllableId)};
  });
}
export function staffMarkup(plan,words,from=0,count=STAFF_PAGE,{untexted=false,pronunciationLinks=null}={}){
  const wordOnly=plan.some(e=>e.sourceWordCorrespondence),annotated=!untexted&&!wordOnly&&pronunciationLinks!==null,height=annotated?280:250,beatsY=annotated?260:230;
  const notes=staffNotes(plan,words,from,count,{untexted,pronunciationLinks}),width=(notes.at(-1)?.endX??200)+30;
  let svg=`<svg xmlns="http://www.w3.org/2000/svg" class="pitch-staff" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="group" aria-label="${untexted?'Printed pattern staff notes':'Selected staff notes'}"><title>${untexted?'Printed pattern pitches and durations; no word or syllable underlay is inferred.':wordOnly?'Printed pitches with candidate whole-word correspondence; Hebrew syllable and phoneme fitting remain unassigned.':'Playback event pitches and durations; draft Hebrew underlay. Consult the selected musical source.'}${annotated?notes.some(isJointEvent)?' Joint source syllables correspond to complete groups of reader words; individual written syllable ranges and acoustic allocation remain null.':notes.some(n=>n.sourceSyllableLink?.alignmentLevel==='source-reading-word')?' Source reading syllables have word-level correspondence; displayed Hebrew is unchanged and written syllable ranges are unassigned.':' Pronunciation text is linked by exact written spans only; unlinked syllables and shared consonants need review.':''}</title>`;
  for(let y=60;y<=100;y+=10)svg+=`<line class="staff-line" x1="14" y1="${y}" x2="${width-12}" y2="${y}"/>`;
  svg+='<text class="music-symbol clef" x="24" y="90">\ue050</text>';
  if(from===0)for(const [i,rest] of (plan[0]?.sourceRestsBefore??[]).entries())svg+=restMarkup(rest,84+55*(i+.5),height,beatsY);
  for(const e of notes){
    const grace=!!(e.sourceGrace||e.sourceNo111Grace||e.sourceSmallNote||(e.sourceSmallEighth||e.sourcePatternSmallEighth||e.sourceNo266SmallEighth)),up=e.y>=80,stemX=e.x+(up?(grace?4:5):-(grace?4:5)),stemEnd=e.y+(up?-(grace?24:32):(grace?24:32)),r=e.rhythm;
    const word=untexted?null:`${e.word.reference} · ${isJointEvent(e)?'joint words '+e.correspondenceWords.map(w=>w.ordinal).join('–'):'word '+e.word.ordinal}`,name=(untexted?`Inspect ${e.sourceLabel}; ${eventPitchName(e)}; ${(e.sourceSmallEighth||e.sourcePatternSmallEighth||e.sourceNo266SmallEighth)?'unmeasured printed small eighth; original 80 ms study; source role unspecified':grace?'unmeasured printed grace; original 80 ms instrumental timing demonstration':beatLabel(e.beats)+' beats'}`:`Go to ${word}; ${eventPitchName(e)}; ${(e.sourceSmallEighth||e.sourcePatternSmallEighth||e.sourceNo266SmallEighth)?"unmeasured printed small eighth; original 80 ms study; source role unspecified":e.sourceSmallNote?"unmeasured printed small quarter; original 80 ms study":e.sourceNo111Grace?"unmeasured source grace; original 80 ms word study; Hebrew and phoneme fitting unassigned":beatLabel(e.beats)+" beats"}; ${e.lyricText??e.syllable}`)+(e.sourcePrintedSyllableId?`; ${e.sourcePrintedUnitLabel??"printed source syllable"} ${e.sourcePrintedSyllableIndex}; Hebrew and phoneme fitting unassigned`:'')+(e.sourceNo266Parenthetical?'; printed parentheses retained; original literal quarter inclusion; source performance role unassigned':'')+(e.sourceSmallNote?'; printed small quarter; original 80 ms written-pitch study; adjacent unresolved source mark not realized':'')+(annotated?`; pronunciation text: ${e.pronunciationText??'unlinked'}; ${isJointEvent(e)?'joint source reading; both reader words together; no individual word allocation':e.sourceSyllableLink?.alignmentLevel==='source-reading-word'?'source reading syllable, word correspondence only; displayed '+e.word.sourceHebrew:'written-span correspondence only'}`:'');
    svg+=`<g class="staff-note" role="button" tabindex="0" data-event="${x(e.id)}"${grace?` data-source-timing="${(e.sourceSmallEighth||e.sourcePatternSmallEighth||e.sourceNo266SmallEighth)?"unmeasured-small-eighth":e.sourceSmallNote?"unmeasured-small-quarter":"unmeasured-grace"}" data-performance-timing="${x(e.performanceTiming.id)}"`: ""}${e.sourceNo266Parenthetical?' data-source-parentheses="true"':''}${untexted?'':` data-word-index="${eventNavigationIndex(e)}"${isJointEvent(e)?` data-joint-group="${x(e.jointGroupId)}"`: ""}`}${e.sourceWordOnly?' data-syllable-alignment="unassigned" data-word-correspondence="candidate"':isJointEvent(e)?' data-syllable-alignment="source-reading-group"':e.sourceSyllableLink?.alignmentLevel==='source-reading-word'?' data-syllable-alignment="source-reading-word"':''}${annotated?` data-pronunciation-status="${x(e.pronunciationLink?.status??'unlinked')}"`:''}${e.pronunciationLink?.phonology?` data-phonology-profile="${x(e.pronunciationLink.phonology.profileId)}"`:''} aria-label="${x(name)}"><title>${x(name)}</title><rect class="staff-hit" x="${e.x-e.width/2}" y="8" width="${e.width}" height="${height-15}" rx="5"/>`;
    for(const y of e.ledgers)svg+=`<line class="ledger" x1="${e.x-10}" x2="${e.x+10}" y1="${y}" y2="${y}"/>`;
    svg+=`<text class="music-symbol accidental" x="${e.x-22}" y="${e.y}">${e.pitch.alter===1?'\ue262':e.pitch.alter===-1?'\ue260':'\ue261'}</text><ellipse class="notehead${['whole','half'].includes(r.type)?' open-notehead':''}" cx="${e.x}" cy="${e.y}" rx="${grace?3.8:5.5}" ry="${grace?2.6:3.8}" transform="rotate(-20 ${e.x} ${e.y})"/>`;
    if(e.sourceNo266Parenthetical)svg+=`<text class="source-note-parenthesis" x="${e.x-17}" y="${e.y+8}" font-size="31">(</text><text class="source-note-parenthesis" x="${e.x+10}" y="${e.y+8}" font-size="31">)</text>`;
    if(r.type!=='whole')svg+=`<line class="note-stroke" x1="${stemX}" x2="${stemX}" y1="${e.y}" y2="${stemEnd}"/>`;
    if(e.sourceGrace?.slash||e.sourceNo111Grace?.slash)svg+=`<line class="note-stroke grace-slash" aria-label="Printed grace slash" x1="${stemX-6}" x2="${stemX+9}" y1="${stemEnd+14}" y2="${stemEnd+3}"/>`;
    if(['eighth','16th','32nd'].includes(r.type)){
      const flags=r.type==='eighth'?1:r.type==='16th'?2:3,scale=grace?.7:1;
      for(let flag=0;flag<flags;flag++){const y=stemEnd+(up?flag*6*scale:-flag*6*scale),direction=up?1:-1;svg+=`<path class="flag" d="M${stemX} ${y} q${18*scale} ${10*direction*scale} ${4*scale} ${24*direction*scale} q${6*scale} ${-12*direction*scale} ${-4*scale} ${-16*direction*scale} Z"/>`;}
    }
    for(let dot=0;dot<r.dots;dot++)svg+=`<circle class="dot" cx="${e.x+13+dot*5}" cy="${e.y%10===0?e.y-5:e.y}" r="1.7"/>`;
    if(r.actual!==r.normal&&(!e.sourceTupletId||!notes.some(n=>n.sourceTupletId===e.sourceTupletId&&n.sourceTupletPhase==='start')||!notes.some(n=>n.sourceTupletId===e.sourceTupletId&&n.sourceTupletPhase==='stop')))svg+=`<text class="rhythm-ratio" x="${e.x}" y="24">${r.actual}:${r.normal}</text>`;
    if(e.sourceFermata){
      if(e.sourceFermata.shape!=='normal'||!['above','below'].includes(e.sourceFermata.placement)||e.sourceFermata.duration!=='unspecified')throw Error('Unsupported printed fermata.');
      if(e.sourceFermata.placement==='above')svg+=`<g class="staff-fermata" role="img" aria-label="Printed fermata; hold length unspecified"><path d="M${e.x-11} 36 Q${e.x} 12 ${e.x+11} 36"/><circle cx="${e.x}" cy="31" r="2.2"/></g>`;
      else{const y=Math.max(125,e.y+30);svg+=`<g class="staff-fermata below" role="img" aria-label="Printed inverted fermata below the staff; hold length unspecified"><path d="M${e.x-11} ${y} Q${e.x} ${y+24} ${e.x+11} ${y}"/><circle cx="${e.x}" cy="${y+5}" r="2.2"/></g>`;}
    }
    if(e.sourceUnresolvedMarks?.length)svg+=`<text class="source-unresolved-mark" x="${e.x}" y="20" aria-label="Unresolved source mark; see original scan; not realized">?</text>`;
    svg+=`<text class="staff-pitch" x="${e.x}" y="165">${x(eventPitchName(e))}</text>`;
    if(e.sourcePrintedLyric!==undefined){
      const previous=notes.find(n=>n.index===e.index-1),start=!previous||previous.sourcePrintedSyllableId!==e.sourcePrintedSyllableId;
      if(start)svg+=`<text class="staff-source-latin" x="${e.x}" y="181" font-size="11" text-anchor="middle" lang="und-Latn" direction="ltr" data-source-printed-unit="${x(e.sourcePrintedSyllableId)}"><title>Literal Latin source unit; Hebrew syllable and phoneme fitting unassigned</title>${x(e.sourcePrintedLyric)}</text>`;
      else svg+=`<line class="melisma-line source-latin-extension" x1="${e.x-e.width/2+5}" x2="${e.x+e.width/2-5}" y1="186" y2="186"/>`;
    }
    if(!untexted&&(!e.continuation||e.continuedFromPrevious))svg+=`<text class="staff-lyric" x="${e.x}" y="198" lang="he" xml:lang="he" direction="rtl" unicode-bidi="plaintext">${x(e.lyricText??e.syllable)}</text>`;
    if(!untexted&&(e.continuation||e.continuedFromPrevious))svg+=`<line class="melisma-line" x1="${e.x-e.width/2+5}" x2="${e.x+e.width/2-5}" y1="206" y2="206"/>`;
    if(annotated&&(!e.continuation||e.continuedFromPrevious))svg+=`<text class="staff-pronunciation${e.pronunciationText===null?' unlinked':''}${e.pronunciationLink?.units.length&&e.pronunciationLink.units.every(u=>u.sourceStress)?' source-stressed':''}" x="${e.x}" y="229" lang="${e.pronunciationLink?.phonology?'und-fonipa':'en'}" xml:lang="${e.pronunciationLink?.phonology?'und-fonipa':'en'}" direction="ltr" unicode-bidi="plaintext">${x(e.pronunciationText??'unlinked')}</text>`;
    svg+=`<text class="staff-beats" x="${e.x}" y="${beatsY}">${grace?`<tspan x="${e.x}" dy="-6">${e.sourceSmallNote||(e.sourceSmallEighth||e.sourcePatternSmallEighth||e.sourceNo266SmallEighth)?"small note":"grace"}</tspan><tspan x="${e.x}" dy="14">${e.sourceSmallNote||(e.sourceSmallEighth||e.sourcePatternSmallEighth||e.sourceNo266SmallEighth)?"study":"demo"} 80 ms</tspan>`:beatLabel(e.beats)+' beats'}</text></g>`;
    // A bracket spans several notes. Keeping it outside the first note's
    // button prevents that button's accessible bounds covering its neighbours.
    for(const [direction,repeat,cx] of [['forward',e.sourceRepeatStart,e.x-e.width/2-18],['backward',e.sourceRepeatEnd,e.x+e.width/2+16]]){
      if(!repeat)continue;
      const forward=direction==='forward',dotX=cx+(forward?12:-12);
      svg+=`<g class="source-repeat" data-repeat-direction="${direction}" data-source-repeat="${x(repeat.id)}" role="img" aria-label="Printed ${direction} repeat; numeric count unspecified"><line stroke="currentColor" stroke-width="3" x1="${cx}" x2="${cx}" y1="60" y2="100"/><line stroke="currentColor" x1="${cx+(forward?5:-5)}" x2="${cx+(forward?5:-5)}" y1="60" y2="100"/><circle fill="currentColor" cx="${dotX}" cy="75" r="2"/><circle fill="currentColor" cx="${dotX}" cy="85" r="2"/></g>`;
    }
    if(e.sourceTupletPhase==='start'){
      const end=notes.find(n=>n.sourceTupletId===e.sourceTupletId&&n.sourceTupletPhase==='stop');
      if(end)svg+=`<path class="tuplet-bracket" aria-label="Printed tuplet: ${r.actual} in the time of ${r.normal}" d="M${e.x-10} 34 v-5 H${end.x+10} v5"/><text class="rhythm-ratio" x="${(e.x+end.x)/2}" y="22">${r.actual}:${r.normal}</text>`;
    }
    if(e.gapAfterBeats){
      const rests=e.sourceRestsAfter??[{beats:e.gapAfterBeats}];
      if(Math.abs(rests.reduce((n,r)=>n+r.beats,0)-e.gapAfterBeats)>1e-8)throw Error('Printed rest values and score gap disagree.');
      rests.forEach((rest,index)=>{
       if(!rest.rhythm)rest={...rest,rhythm:rhythmSpelling(rest.beats)};
       const glyph=Math.abs(rest.beats-.5)<1e-8?'\ue4e6':'\ue4e5',cx=e.x+e.width/2+e.gapWidth*(index+.5)/rests.length;
       if(rest.rhythm?.dots||['whole','half','16th','32nd'].includes(rest.rhythm?.type)){svg+=restMarkup(rest,cx,height,beatsY);return;}
       svg+=`<g class="staff-rest" role="${rest.id?'button':'img'}"${rest.id?` tabindex="0" data-rest="${x(rest.id)}"`: ''} aria-label="Rest; ${beatLabel(rest.beats)} beats${rest.sourceLocation?'; '+x(rest.sourceLocation):''}">${rest.id?`<rect class="staff-hit" x="${cx-24}" y="8" width="48" height="${height-15}" rx="5"/>`: ''}<text class="music-symbol" x="${cx}" y="80">${glyph}</text><text class="staff-beats" x="${cx}" y="${beatsY}">${beatLabel(rest.beats)} rest</text></g>`;
      });
    }
    if(e.tieStart){
      const next=notes.find(n=>n.index===e.index+1),toX=next?next.x-8:e.endX-5,toY=next?next.y+9:e.y+9;
      svg+=`<path class="tie-arc" aria-label="Tie: hold the same pitch" d="M${e.x+8} ${e.y+9} Q${(e.x+8+toX)/2} ${e.y+24} ${toX} ${toY}"/>`;
    }
    if(e.tieStop&&e.index===from&&from>0)svg+=`<path class="tie-arc" aria-label="Tie continued from previous page" d="M${e.x-e.width/2+5} ${e.y+9} Q${e.x-20} ${e.y+24} ${e.x-8} ${e.y+9}"/>`;
    if(e.sourceSlurPhase==='start'){
      const end=notes.find(n=>n.sourceSlurId===e.sourceSlurId&&n.sourceSlurPhase==='stop'),above=e.sourceSlurPlacement==='above',direction=above?-1:1;
      if(end){const extreme=above?Math.min(...notes.filter(n=>n.index>=e.index&&n.index<=end.index).map(n=>n.y)):Math.max(e.y,end.y);
       svg+=`<path class="tie-arc source-slur" aria-label="Printed slur; notes remain distinct${above?'; above staff':''}" d="M${e.x+8} ${e.y+direction*10} Q${(e.x+end.x)/2} ${extreme+direction*32} ${end.x-8} ${end.y+direction*10}"/>`;
      }else if(e.sourceSlurPlacement||e.sourceWordOnly){
       svg+=`<path class="tie-arc source-slur source-slur-continuation" data-source-slur="${x(e.sourceSlurId)}" aria-label="Printed slur continues on next score page; notes remain distinct" d="M${e.x+8} ${e.y+direction*10} Q${(e.x+width)/2} ${e.y+direction*32} ${width-16} ${e.y+direction*10}"/>`;
      }
    }
    if(e.sourceSlurPhase==='stop'&&(e.sourceSlurPlacement||e.sourceWordOnly)&&!notes.some(n=>n.sourceSlurId===e.sourceSlurId&&n.sourceSlurPhase==='start')&&plan.slice(0,from).some(n=>n.sourceSlurId===e.sourceSlurId&&n.sourceSlurPhase==='start')){
     const direction=e.sourceSlurPlacement==='above'?-1:1;svg+=`<path class="tie-arc source-slur source-slur-continuation" data-source-slur="${x(e.sourceSlurId)}" aria-label="Printed slur continued from previous score page; notes remain distinct" d="M14 ${e.y+direction*10} Q${e.x/2} ${e.y+direction*32} ${e.x-8} ${e.y+direction*10}"/>`;
    }
    for(const slur of e.sourceSlurs??[]){
      if(slur.phase!=='start')continue;
      const end=notes.find(n=>n.sourceSlurs?.some(s=>s.id===slur.id&&s.phase==='stop'));
      if(!end)continue;
      const above=slur.placement==='above',offset=10,direction=above?-1:1;
      const covered=notes.filter(n=>n.index>=e.index&&n.index<=end.index);
      const extreme=above?Math.min(...covered.map(n=>n.y)):Math.max(...covered.map(n=>n.y));
      const outer=(slur.lane??1)>1,control=extreme+direction*(outer?44+16*((slur.lane??2)-2):32);
      // A broad outer arc needs steep ends where a shorter slur shares its
      // endpoint. A single quadratic would cross that inner arc or leave the
      // view box. The cubic shoulder preserves both endpoint relationships.
      const shoulder=Math.min(32,(end.x-e.x)/4);
      const path=outer?`C${e.x+8+shoulder} ${control} ${end.x-8-shoulder} ${control} ${end.x-8} ${end.y+direction*offset}`:`Q${(e.x+end.x)/2} ${control} ${end.x-8} ${end.y+direction*offset}`;
      svg+=`<path class="tie-arc source-slur" data-source-slur="${x(slur.id)}" aria-label="Printed slur; notes remain distinct${above?'; above staff':''}" d="M${e.x+8} ${e.y+direction*offset} ${path}"/>`;
    }
  }
  return svg+'</svg>';
}
