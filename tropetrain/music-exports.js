import {validatePlan} from './synthesis.js';
import {scoreData,rhythmSpelling,escapeXml as x} from './score-data.js';

export const DIVISIONS=10000,MIDI_PPQ=4800;
function checked(plan,words,context){
  validatePlan(plan);
  if(!Number.isFinite(context.tempo)||context.tempo<=0)throw Error('The export needs a tempo.');
  for(const e of plan)if(!Number.isFinite(e.startBeat)||e.startBeat<0||Math.abs(e.startBeat*60/context.tempo-e.startSeconds)>1e-6||Math.abs(e.beats*60/context.tempo-e.durationSeconds)>1e-6)throw Error('Beat and playback timing disagree.');
  return scoreData(plan,words);
}
function identity(notes,context){
  const selected=[...new Map(notes.map(e=>[e.word.id,e.word])).values()];
  return {...context,format:'tropetrain-score-metadata-v1',words:selected,
    events:notes.map((e,i)=>({noteId:`note-${i+1}`,eventId:e.id,wordId:e.wordId,sourceWordId:e.sourceWordId,syllableId:e.syllableId,syllable:e.syllable,midi:e.midi,startBeat:e.startBeat,beats:e.beats}))};
}
function durationNotation(beats,accidental=null){
  const r=rhythmSpelling(beats);
  return `<type>${r.type}</type>${'<dot/>'.repeat(r.dots)}${accidental?`<accidental>${accidental}</accidental>`:''}${r.actual===r.normal?'':`<time-modification><actual-notes>${r.actual}</actual-notes><normal-notes>${r.normal}</normal-notes></time-modification>`}`;
}
export function musicXml(plan,words,context){
  const notes=checked(plan,words,context),metadata=identity(notes,context);
  let xml=`<?xml version="1.0" encoding="UTF-8"?>\n<score-partwise version="4.0"><work><work-title>${x(context.title)}</work-title></work><identification><creator type="composer">TropeTrain original demonstration</creator><rights>Original demo music: CC0-1.0. Hebrew: UXLC. Syllables unreviewed; no singing or traditional realization.</rights><miscellaneous><miscellaneous-field name="tropetrain-metadata">${x(JSON.stringify(metadata))}</miscellaneous-field></miscellaneous></identification><defaults><lyric-font font-family="Noto Serif Hebrew"/></defaults><part-list><score-part id="P1"><part-name>Instrumental demonstration</part-name></score-part></part-list><part id="P1">`;
  let measure=0,verseKey=null,beat=0;
  notes.forEach((e,index)=>{
    if(e.word.verseKey!==verseKey){
      if(measure)xml+='</measure>';
      verseKey=e.word.verseKey;measure++;
      xml+=`<measure number="${measure}" implicit="yes">`;
      if(measure===1)xml+=`<attributes><divisions>${DIVISIONS}</divisions><time><senza-misura/></time><clef><sign>G</sign><line>2</line></clef></attributes><direction><direction-type><words>Original demo; no traditional attribution. Quarter-note beat. Individual 5:3 tuplets preserve 0.6/0.9-beat timings.</words></direction-type><sound tempo="${context.tempo}"/></direction>`;
      xml+=`<direction><direction-type><words>${x(e.word.reference)}</words></direction-type></direction>`;
    }
    const gap=e.startBeat-beat;
    if(gap>1e-7)xml+=`<note><rest/><duration>${Math.round(gap*DIVISIONS)}</duration>${durationNotation(gap)}</note>`;
    const p=e.pitch,accidental=p.alter===1?'sharp':p.alter===-1?'flat':'natural';
    if(p.octave<0)throw Error('MusicXML pitch octaves begin at C0.');
    xml+=`<note id="note-${index+1}"><pitch><step>${p.step}</step>${p.alter?`<alter>${p.alter}</alter>`:''}<octave>${p.octave}</octave></pitch><duration>${Math.round(e.beats*DIVISIONS)}</duration>${durationNotation(e.beats,accidental)}`;
    const extension=e.extendsNext?(e.continuation?'continue':'start'):e.continuation?'stop':null;
    xml+=`<lyric number="1">${e.continuation?'':`<syllabic>${e.syllabic}</syllabic><text xml:lang="he" dir="rtl">${x(e.syllable)}</text>`}${extension?`<extend type="${extension}"/>`:''}</lyric></note>`;
    beat=e.startBeat+e.beats;
  });
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
  for(const e of notes){
    const start=Math.round(e.startBeat*MIDI_PPQ),end=Math.round((e.startBeat+e.beats)*MIDI_PPQ);
    meta(start-tick,1,e.id);if(!e.continuation)meta(0,5,e.syllable);
    parts.push(Uint8Array.of(0,0x90,e.midi,80),vlq(end-start),Uint8Array.of(0x80,e.midi,0));tick=end;
  }
  meta(0,0x2f,new Uint8Array());const track=join(parts);
  return join([text.encode('MThd'),u32(6),Uint8Array.of(0,0,0,1,MIDI_PPQ>>>8,MIDI_PPQ&255),text.encode('MTrk'),u32(track.length),track]);
}
