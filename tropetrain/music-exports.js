import {validatePlan,soundingNotes} from './synthesis.js';
import {scoreData,rhythmSpelling,escapeXml as x} from './score-data.js';
import {isPrintedScore} from './printed-score-registry.js';

export const DIVISIONS=4800,MIDI_PPQ=4800;
function checked(plan,words,context){
  validatePlan(plan);
  if(!Number.isFinite(context.tempo)||context.tempo<=0)throw Error('The export needs a tempo.');
  for(const e of plan)if(!Number.isFinite(e.startBeat)||e.startBeat<0||Math.abs(e.startBeat*60/context.tempo-e.startSeconds)>1e-6||Math.abs(e.beats*60/context.tempo-e.durationSeconds)>1e-6)throw Error('Beat and playback timing disagree.');
  return scoreData(plan,words);
}
function identity(notes,context){
  const selected=[...new Map(notes.flatMap(e=>(e.correspondenceWords??[e.word]).map(w=>[w.id,w]))).values()];
  return {...context,format:'tropetrain-score-metadata-v1',words:selected,
    events:notes.map((e,i)=>({noteId:`note-${i+1}`,eventId:e.id,wordId:e.wordId,sourceWordId:e.sourceWordId,syllableId:e.syllableId,syllable:e.syllable,...(e.jointGroupId?{wordIndex:null,wordIds:e.wordIds,sourceWordIds:e.sourceWordIds,wordIndices:e.wordIndices,jointGroupId:e.jointGroupId,navigationWordIndex:e.navigationWordIndex,navigationWordId:e.navigationWordId,sourceSyllableLink:e.sourceSyllableLink}:{}),midi:e.midi,startBeat:e.startBeat,beats:e.beats,
      ...(e.sourceProfile?{sourceProfile:e.sourceProfile,sourceLocation:e.sourceLocation,sourceBar:e.sourceBar,sourceLyric:e.sourceLyric,sourceRhythm:e.sourceRhythm,
        sourceRestAfterBeats:e.sourceRestAfterBeats,tieId:e.tieId,tieStart:e.tieStart,tieStop:e.tieStop,
        ...(e.sourceRestAfterBar!==undefined?{sourceRestAfterBar:e.sourceRestAfterBar}:{}),...(e.endingRestSeconds!==undefined?{endingRestSeconds:e.endingRestSeconds}:{})}:{}),
      ...(e.sourceWordOnly?{sourceWordOnly:true,lyricText:e.lyricText,lyricLevel:e.lyricLevel,phonemes:null,sourceWordCorrespondence:e.sourceWordCorrespondence,sourcePrintedSyllableIndex:e.sourcePrintedSyllableIndex,sourceWrittenRhythm:e.sourceWrittenRhythm,sourceQuarterBeats:e.sourceQuarterBeats,sourceQuarterBeatFraction:e.sourceQuarterBeatFraction,sourceRestsBefore:e.sourceRestsBefore??[],sourceRestsAfter:e.sourceRestsAfter??[],performanceTempo:e.performanceTempo,...(e.sourceSmallEighth?{sourceSmallEighth:e.sourceSmallEighth,performanceTiming:e.performanceTiming}:{})}:{}),
      ...(e.sourceSmallNote?{sourceQuarterBeats:e.sourceQuarterBeats,sourceSmallNote:e.sourceSmallNote,sourceUnresolvedMarks:e.sourceUnresolvedMarks,performanceTiming:e.performanceTiming}:{}),
      ...(e.sourceSlurPlacement?{sourceSlurPlacement:e.sourceSlurPlacement}:{}),
      ...(e.sourcePitch?{sourcePitch:e.sourcePitch,sourceTranspose:e.sourceTranspose,sourceNoteId:e.sourceNoteId,sourceSystem:e.sourceSystem,sourceFermata:e.sourceFermata,sourceSlurId:e.sourceSlurId,sourceSlurPhase:e.sourceSlurPhase,sourceTupletId:e.sourceTupletId,sourceTupletPhase:e.sourceTupletPhase}:{})}))};
}
function durationNotation(beats,accidental=null,r=rhythmSpelling(beats)){
  return `<type>${r.type}</type>${'<dot/>'.repeat(r.dots)}${accidental?`<accidental>${accidental}</accidental>`:''}${r.actual===r.normal?'':`<time-modification><actual-notes>${r.actual}</actual-notes><normal-notes>${r.normal}</normal-notes></time-modification>`}`;
}
function sourceSlurNumbers(notes){
 const assigned=new Map(),active=new Map();
 for(const e of notes){
  if(!e.sourceSlurId||!['start','stop'].includes(e.sourceSlurPhase))continue;
  if(!assigned.has(e.sourceSlurId)){
   const used=new Set(active.values());let number=1;while(used.has(number))number++;
   if(number>16)throw Error('MusicXML supports at most16simultaneous slur numbers.');
   assigned.set(e.sourceSlurId,number);
  }
  if(e.sourceSlurPhase==='start')active.set(e.sourceSlurId,assigned.get(e.sourceSlurId));else active.delete(e.sourceSlurId);
 }
 return assigned;
}
export function musicXml(plan,words,context){
  const notes=checked(plan,words,context),metadata=identity(notes,context);
  const slurNumbers=sourceSlurNumbers(notes);
  const cohen=context.melody?.id==='cohen-1902-gen22-ending',baer=context.melody?.id==='baer-1894-gen1-1-5',printed=isPrintedScore(context.melody?.id);
  const creator=printed?context.melody.creator:'TropeTrain original demonstration';
  const rights=printed?'Printed source: public domain. New transcription: CC0-1.0. Hebrew: UXLC. Underlay and musical review pending; regularized timing; no singing or inferred coda.':'Original demo music: CC0-1.0. Hebrew: UXLC. Syllables unreviewed; no singing or traditional realization.';
  const direction=context.melody?.exportNote??(baer?context.melody.creator+'. '+context.melody.performanceNote:printed?'Cohen 1902, p. 539, Genesis 22:1 complete printed verse. Ties sustain without re-attack; source rests preserved. Printed durations regularized; source requests flexible tempo. No added coda.':'Original demo; no traditional attribution. Quarter-note beat. Individual 5:3 tuplets preserve 0.6/0.9-beat timings.');
  let xml=`<?xml version="1.0" encoding="UTF-8"?>\n<score-partwise version="4.0"><work><work-title>${x(context.title)}</work-title></work><identification><creator type="composer">${x(creator)}</creator><rights>${x(rights)}</rights><miscellaneous><miscellaneous-field name="tropetrain-metadata">${x(JSON.stringify(metadata))}</miscellaneous-field></miscellaneous></identification><defaults><lyric-font font-family="Noto Serif Hebrew"/></defaults><part-list><score-part id="P1"><part-name>Instrumental study</part-name></score-part></part-list><part id="P1">`;
  let measure=0,verseKey=null,beat=0,previousMeter=null;
  notes.forEach((e,index)=>{
    const key=e.sourceBar===undefined?e.word.verseKey:`${e.word.verseKey}:bar-${e.sourceBar}`;
    if(key!==verseKey){
      if(measure)xml+='</measure>';
      verseKey=key;measure++;
      xml+=`<measure number="${measure}" implicit="yes">`;
      const meter=context.melody?.meterByBar?.[e.sourceBar]??(cohen?(e.sourceBar>=3&&e.sourceBar<=10?3:4):null);
      if(measure===1||meter!==previousMeter)xml+=`<attributes>${measure===1?`<divisions>${DIVISIONS}</divisions>`:''}<time>${meter?`<beats>${meter}</beats><beat-type>4</beat-type>`:'<senza-misura/>'}</time>${measure===1?'<clef><sign>G</sign><line>2</line></clef>':''}</attributes>`;
      previousMeter=meter;
      if(measure===1)xml+=`<direction><direction-type><words>${x(direction)}</words></direction-type><sound tempo="${context.tempo}"/></direction>`;
      xml+=`<direction><direction-type><words>${x(e.word.reference)}</words></direction-type></direction>`;
    }
    const gap=e.startBeat-beat;
    if(gap>1e-7){
      const written=e.sourceWordOnly?(index===0?e.sourceRestsBefore:notes[index-1].sourceRestsAfter)??[]:[];
      if(e.sourceWordOnly&&Math.abs(written.reduce((n,r)=>n+r.beats,0)-gap)>1e-8)throw Error('Source-word export lost its individual printed rests.');
      for(const rest of written.length?written:[{beats:gap}])xml+=`<note><rest/><duration>${Math.round(rest.beats*DIVISIONS)}</duration>${durationNotation(rest.beats,null,rest.rhythm)}</note>`;
    }
    const p=e.pitch,accidental=p.alter===1?'sharp':p.alter===-1?'flat':'natural';
    if(p.octave<0)throw Error('MusicXML pitch octaves begin at C0.');
    xml+=`<note id="note-${index+1}">${e.sourceSmallNote?'<grace slash="no"/>':''}<pitch><step>${p.step}</step>${p.alter?`<alter>${p.alter}</alter>`:''}<octave>${p.octave}</octave></pitch>${e.sourceSmallNote?'':`<duration>${Math.round(e.beats*DIVISIONS)}</duration>`}${e.tieStop?'<tie type="stop"/>':''}${e.tieStart?'<tie type="start"/>':''}${durationNotation(e.beats,accidental,e.sourceSmallEighth?rhythmSpelling(e.beats):e.rhythm)}`;
    const marks=(e.tieStop?'<tied type="stop"/>':'')+(e.tieStart?'<tied type="start"/>':'')+(e.sourceFermata?'<fermata type="upright">normal</fermata>':'')+(['start','stop'].includes(e.sourceSlurPhase)?`<slur type="${e.sourceSlurPhase}" number="${slurNumbers.get(e.sourceSlurId)}"${e.sourceSlurPlacement?` placement="${x(e.sourceSlurPlacement)}"`:""}/>`:'')+(['start','stop'].includes(e.sourceTupletPhase)?`<tuplet type="${e.sourceTupletPhase}" number="1"/>`:'');
    if(marks||e.sourceSmallEighth||e.sourceUnresolvedMarks?.length)xml+=`<notations>${marks}${e.sourceSmallEighth?'<other-notation type="single">Printed small eighth; source role and duration unassigned. Exported duration is the optional original 80 ms instrumental study.</other-notation>':''}${(e.sourceUnresolvedMarks??[]).map(mark=>`<other-notation type="single">${x(mark.id+": unresolved source mark; no realization assigned")}</other-notation>`).join('')}</notations>`;
    const extension=e.extendsNext?(e.continuation?'continue':'start'):e.continuation?'stop':null;
    xml+=`<lyric number="1">${e.continuation?'':`<syllabic>${e.syllabic}</syllabic><text xml:lang="he" dir="rtl">${x(e.lyricText??e.syllable)}</text>`}${extension?`<extend type="${extension}"/>`:''}</lyric></note>`;
    beat=e.startBeat+e.beats;
  });
  const endingRest=notes.at(-1).gapAfterBeats;
  if(endingRest>0)for(const rest of notes.at(-1).sourceWordOnly?notes.at(-1).sourceRestsAfter:[{beats:endingRest}])xml+=`<note><rest/><duration>${Math.round(rest.beats*DIVISIONS)}</duration>${durationNotation(rest.beats,null,rest.rhythm)}</note>`;
  return xml+'<barline location="right"><bar-style>light-heavy</bar-style></barline></measure></part></score-partwise>\n';
}
function join(parts){const result=new Uint8Array(parts.reduce((n,p)=>n+p.length,0));let offset=0;for(const p of parts){result.set(p,offset);offset+=p.length;}return result;}
function u32(n){return Uint8Array.of(n>>>24,(n>>>16)&255,(n>>>8)&255,n&255);}
function vlq(n){if(!Number.isInteger(n)||n<0||n>0x0fffffff)throw Error('MIDI time exceeds the supported range.');const bytes=[n&127];while(n>>=7)bytes.unshift((n&127)|128);return Uint8Array.from(bytes);}
export function midiFile(plan,words,context){
  const notes=checked(plan,words,context),text=new TextEncoder(),parts=[];
  const meta=(delta,type,value)=>{const bytes=typeof value==='string'?text.encode(value):value;parts.push(vlq(delta),Uint8Array.of(255,type),vlq(bytes.length),bytes);};
  const micros=Math.round(60000000/context.tempo);if(micros>0xffffff)throw Error('Tempo exceeds the MIDI format range.');
  meta(0,3,context.title);meta(0,1,JSON.stringify(identity(notes,context)));meta(0,0x51,Uint8Array.of(micros>>>16,(micros>>>8)&255,micros&255));
  parts.push(Uint8Array.of(0,0xb0,7,Math.round(Math.min(100,Math.max(0,context.volume??70))*1.27)));
  // General MIDI triangle/synth timbres vary by player. MIDI contains notes,
  // not the application's instrument or a recording of its sound.
  let tick=0;
  for(const e of soundingNotes(notes)){
    const start=Math.round(e.startBeat*MIDI_PPQ),end=Math.round((e.startBeat+e.beats)*MIDI_PPQ);
    meta(start-tick,1,e.id);if(!e.continuation)meta(0,5,e.lyricText??e.syllable);
    parts.push(Uint8Array.of(0,0x90,e.midi,80),vlq(end-start),Uint8Array.of(0x80,e.midi,0));tick=end;
  }
  const end=Math.round(validatePlan(plan)*context.tempo/60*MIDI_PPQ);
  meta(Math.max(0,end-tick),0x2f,new Uint8Array());const track=join(parts);
  return join([text.encode('MThd'),u32(6),Uint8Array.of(0,0,0,1,MIDI_PPQ>>>8,MIDI_PPQ&255),text.encode('MTrk'),u32(track.length),track]);
}
