// Original opt-in instrument timing. Never assigns a historical ornament role.
export const PATTERN_SMALL_EIGHTH_STUDY=Object.freeze({id:'original-no267-small-eighth-80ms-v1',milliseconds:80,sourceDuration:null,sourceRole:null,stealingRatio:null,policy:'Add 80 ms for the unmeasured small eighth in source order; retain every measured value. Original instrumental timing, not historical performance.'});
const definitions=Object.freeze({
 'idelsohn1929-267-paseq':Object.freeze({row:3,position:5,pitches:[69,74,69]}),
 'idelsohn1929-267-jetib':Object.freeze({row:4,position:1,pitches:[74,74,69]})
});
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b),rhythm={type:'eighth',dots:0,actual:1,normal:1};
const stem=d=>`idelsohn1929-267-row${d.row}-${d.position}`;
function small(mark){return mark?.type==='eighth'&&['slash','role','sourceDuration','stealingRatio'].every(k=>mark[k]===null)&&typeof mark.limits==='string'&&Object.keys(mark).sort().join(',')==='limits,role,slash,sourceDuration,stealingRatio,type';}
export function hasPatternSmallEighthStudy(figure){
 const d=definitions[figure?.id];if(!d)return false;
 if(figure.status!=='pending'||figure.chartRow!==d.row||figure.chartPosition!==d.position||figure.printedQuarterBeats!==null||figure.components?.length!==3||figure.unresolvedTuplet||figure.unresolvedMark||['bibleWordUnderlay','syllableUnderlay','phonemes','actualTuning','sourceRecording','independentReview','modernAccentEquivalent','kinnorEquivalent'].some(k=>figure[k]!==null))throw Error('The optional small-note study no longer matches its unchanged pending source figure.');
 for(const [i,c]of figure.components.entries()){
  const pitch=d.pitches[i]===69?{step:'A',alter:0,octave:4}:{step:'D',alter:0,octave:5};
  const slurs=i===0?[]:[{id:stem(d)+'-slur-2-3',phase:i===1?'start':'end'}];
  if(c.id!==stem(d)+'-'+(i+1)||c.kind!=='note'||c.midi!==d.pitches[i]||!equal(c.sourcePitch,pitch)||!equal(c.rhythm,rhythm)||c.sourcePdfPage!==104||c.sourcePrintedPage!==101||c.tuplet||c.slur||!equal(c.slurs??[],slurs)||c.quarterBeats!==(i===2?null:.5)||!equal(c.quarterBeatFraction,i===2?null:{numerator:1,denominator:2})||(i===2?!small(c.printedSmallNote):c.printedSmallNote!==undefined))throw Error('The small-note study requires all three exact source pitches, measured eighths, slur and unassigned small-note fields.');
 }
 return true;
}
export function patternSmallEighthTiming(figure,component,{tempo,smallPatternDemo=false}={}){
 if(!component.printedSmallNote)return null;
 if(!hasPatternSmallEighthStudy(figure)||component!==figure.components[2])throw Error('This source component has no original small-note study.');
 if(smallPatternDemo!==true)throw Error('This figure is withheld until its separate optional original 80 ms small-note timing study is chosen. Source timing and ornament role remain unassigned.');
 if(!Number.isFinite(tempo)||tempo<=0)throw Error('Invalid small-note study tempo.');
 return {seconds:.08,beats:.08*tempo/60,performanceTiming:PATTERN_SMALL_EIGHTH_STUDY};
}
export function validatePatternSmallEighthEvent(e){
 const d=definitions[e.sourceCell],mark=e.sourcePatternSmallEighth,r=e.sourceRhythm;
 if(!d||e.sourceProfile!=='idelsohn-1929-vol5-no267'||e.sourceNoteId!==stem(d)+'-3'||e.id!==e.sourceNoteId||e.sourceComponentNumber!==3||e.sourceComponentCount!==3||e.sourcePage!==101||e.sourcePdfPage!==104||e.sourceQuarterBeats!==null||e.sourceQuarterBeatFraction!==null||!small(mark)||!equal(r,rhythm)||!equal(e.sourceWrittenRhythm,rhythm)||!equal(e.sourcePitch,{step:'A',alter:0,octave:4})||!Number.isInteger(e.sourceTranspose)||Math.abs(e.sourceTranspose)>36||e.midi!==69+e.sourceTranspose||['wordId','sourceWordId','syllableId','syllable','phonemes','independentReview','sourceActualTuning'].some(k=>e[k]!==null)||e.sourceGrace||e.sourceSmallNote||e.sourceSmallEighth)throw Error('The pattern small eighth must retain its exact untexted source identity, pitch, glyph and null duration/role/underlay.');
 if(!Number.isFinite(e.performanceTempo)||e.performanceTempo<=0||e.durationSeconds!==.08||Math.abs(e.beats-.08*e.performanceTempo/60)>1e-10||!equal(e.performanceTiming,PATTERN_SMALL_EIGHTH_STUDY)||!equal(e.sourceSlurs,[{id:stem(d)+'-slur-2-3',phase:'stop'}]))throw Error('Pattern small-eighth playback requires the separate exact original 80 ms timing policy and unchanged slur.');
 return e;
}
