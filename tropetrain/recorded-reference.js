// Recorded-reference adaptation: CC BY-SA 3.0; assets/references/NOTICE.txt.
// Recorded takes retain their own text, source timing, key and pronunciation. They are
// reference evidence, never silently substituted for a musical/phonetic profile.
export function referenceIndex(recording){
  if(recording?.format!=='tropetrain-recorded-reference-v1'||!recording.words?.length)throw Error('Unsupported recorded reference.');
  const map=new Map();
  recording.words.forEach((word,index)=>{
    if(map.has(word.id)||!Number.isFinite(word.startSeconds)||word.startSeconds<0||!word.sourceHebrew||!word.uxlcHebrew)throw Error('Invalid recorded word.');
    const next=recording.words[index+1];
    if(next&&(!(next.startSeconds>word.startSeconds)||word.endSeconds!==next.startSeconds))throw Error('Reference boundaries must be strictly ordered.');
    if(!next&&word.endSeconds!==null)throw Error('Final reference boundary must use the media duration.');
    map.set(word.id,{...word,referenceIndex:index});
  });
  return map;
}
export function referenceSelection(words,start,end,index){
  if(!Number.isInteger(start)||!Number.isInteger(end)||start<0||end<start||end>=words.length)throw Error('Choose a valid reference span.');
  return words.slice(start,end+1).map(word=>{
    const match=index.get(word.sourceWordId??word.id);
    if(!match)throw Error('This span extends beyond the recorded reference, Genesis 1:1–2:3.');
    if(match.uxlcHebrew!==word.sourceHebrew)throw Error('The source text has changed; this reference alignment needs review.');
    return {...match,occurrenceId:word.id,wordIndex:word.index};
  });
}
export function referenceSegments(selection,duration){
  if(!selection.length||!Number.isFinite(duration)||duration<=selection.at(-1).startSeconds)throw Error('Recording duration does not cover the selected words.');
  const segments=[];
  for(const word of selection){
    const end=word.endSeconds??duration;
    if(!(word.startSeconds<end&&end<=duration))throw Error('A reference boundary lies outside the recording.');
    const previous=segments.at(-1);
    if(previous&&previous.words.at(-1).referenceIndex+1===word.referenceIndex){previous.words.push(word);previous.end=end;}
    else segments.push({start:word.startSeconds,end,words:[word]});
  }
  return segments;
}
export function referenceWordAt(segment,time){
  if(!segment.words.length||time<segment.start||time>=segment.end)return null;
  let low=0,high=segment.words.length-1,answer=0;
  while(low<=high){const mid=(low+high)>>1;if(segment.words[mid].startSeconds<=time){answer=mid;low=mid+1;}else high=mid-1;}
  return segment.words[answer];
}

export function splitReferenceSegments(selection){
  if(!selection.length)throw Error('Choose a nonempty reference span.');
  const segments=[];
  for(const word of selection){
    if(!Number.isFinite(word.startSeconds)||word.startSeconds<0||!(word.endSeconds===null||word.endSeconds>word.startSeconds))throw Error('Reference word timing requires review.');
    const previous=segments.at(-1),recordingId=word.recordingId??null;
    if(previous&&previous.recordingId===recordingId&&previous.words.at(-1).referenceIndex+1===word.referenceIndex){previous.words.push(word);previous.end=word.endSeconds;}
    else segments.push({recordingId,start:word.startSeconds,end:word.endSeconds,words:[word]});
  }
  return segments;
}
// A recording has no inferred BPM. Rate scales elapsed source seconds only.
export function recordingRate(value){
  if(typeof value!=='number'||!Number.isFinite(value)||value<.5||value>1.5)throw Error('Choose a chant speed between 50% and 150%.');
  return value;
}
export class RecordingPlayer {
  constructor(media,{onWord=()=>{},onGroup=()=>{},onEnd=()=>{},onError=()=>{},onLoading=()=>{},onRecording=()=>{},resolveSource=null,clock=()=>performance.now()/1000,frame:queueFrame=callback=>requestAnimationFrame(callback),cancelFrame=handle=>cancelAnimationFrame(handle)}={}){
    this.media=media;this.onWord=onWord;this.onEnd=onEnd;this.onError=onError;this.onLoading=onLoading;this.onRecording=onRecording;this.resolveSource=resolveSource;this.frame=queueFrame;this.cancelFrame=cancelFrame;this.generation=0;this.running=false;this.starting=false;
    this.clock=clock;this.rate=1;this.volume=Number.isFinite(media.volume)?media.volume:1;this.onGroup=onGroup;this.activeGroup=null;
    media.addEventListener('ended',()=>{if(this.running&&this.mode==='audio'&&media.currentTime>=this.currentSegment.end)this.advance();});
    media.addEventListener('error',()=>{if(this.running){this.stop();onError(Error('The recording could not be decoded or loaded.'));}});
  }
  stop(){
    this.generation++;this.running=false;this.starting=false;this.pending?.abort();this.pending=null;
    this.enabling=null;this.media.pause();this.cancelFrame(this.raf);this.activeGroup=null;this.onWord(null);this.onGroup(null);
  }
  get canPreservePitch(){return 'preservesPitch' in this.media;}
  now(){return this.mode==='muted'?this.anchorPosition+Math.max(0,this.clock()-this.anchorClock)*this.rate:this.media.currentTime;}
  setRate(value){
    const rate=recordingRate(value);
    if(rate!==1&&!this.canPreservePitch)throw Error('This browser cannot preserve recorded pitch at a different chant speed. Use 100%.');
    const position=this.running&&this.mode==='muted'?this.now():null;
    if(this.canPreservePitch){this.media.preservesPitch=true;if(rate!==1&&this.media.preservesPitch!==true)throw Error('Pitch preservation is unavailable. Use 100%.');}
    this.media.playbackRate=rate;this.rate=rate;
    if(position!==null){this.anchorPosition=position;this.anchorClock=this.clock();}
  }
  async setVolume(value){
    this.volume=Number.isFinite(value)?Math.min(1,Math.max(0,value)):0;this.media.volume=this.volume;
    if(!this.running)return;
    if(this.volume===0&&this.mode==='audio'){
      this.anchorPosition=this.media.currentTime;this.anchorClock=this.clock();this.mode='muted';this.media.pause();
    }else if(this.volume>0&&this.mode==='muted'&&!this.enabling){
      const generation=this.generation,transition={generation};this.media.currentTime=this.now();this.mode='audio';this.enabling=transition;
      try{await this.media.play();if(generation===this.generation&&this.running&&this.volume===0){this.anchorPosition=this.media.currentTime;this.anchorClock=this.clock();this.mode='muted';this.media.pause();}}
      catch(error){if(generation===this.generation){this.stop();this.onError(error);}}
      finally{if(this.enabling===transition)this.enabling=null;}
    }
  }
  async play(selection,repeat=false){
    let segments;try{segments=splitReferenceSegments(selection);}catch(error){this.stop();this.onError(error);return;}
    return this.playSegments(segments,repeat);
  }
  async playWhole(recordingId,repeat=false){return this.playSegments([{recordingId,start:0,end:null,words:[]}],repeat);}
  async playSegments(segments,repeat=false){
    this.stop();this.segments=segments;this.segmentIndex=0;this.repeat=repeat;
    return this.startSegment(this.generation);
  }
  async metadata(signal){
    if(this.media.readyState>=1)return;
    await new Promise((resolve,reject)=>{
      const cleanup=()=>{this.media.removeEventListener('loadedmetadata',ready);this.media.removeEventListener('error',failed);signal.removeEventListener('abort',aborted);};
      const ready=()=>{cleanup();resolve();},failed=()=>{cleanup();reject(Error('The reference recording is unavailable.'));},aborted=()=>{cleanup();reject(new DOMException('Stopped','AbortError'));};
      this.media.addEventListener('loadedmetadata',ready,{once:true});this.media.addEventListener('error',failed,{once:true});signal.addEventListener('abort',aborted,{once:true});this.media.load();
    });
  }
  async startSegment(generation){
    this.running=false;this.starting=true;this.cancelFrame(this.raf);this.pending?.abort();const pending=new AbortController();this.pending=pending;
    try{
      const definition=this.segments[this.segmentIndex];this.onLoading(definition.recordingId);
      if(this.resolveSource&&definition.recordingId){
        const url=await this.resolveSource(definition.recordingId,{signal:pending.signal});
        if(generation!==this.generation)return;
        if(this.media.getAttribute?.('src')!==url)this.media.src=url;
      }
      if(this.media.readyState<1)await this.metadata(pending.signal);if(generation!==this.generation)return;
      const duration=this.media.duration,end=definition.end??duration;
      if(!Number.isFinite(duration)||definition.start<0||definition.start>=end||end>duration)throw Error('A reference boundary lies outside the decoded recording.');
      this.currentSegment={...definition,end};this.media.currentTime=definition.start;this.setRate(this.rate);this.media.volume=this.volume;
      this.mode=this.volume===0?'muted':'audio';this.anchorPosition=definition.start;this.anchorClock=this.clock();this.onRecording(definition.recordingId);
      this.starting=false;this.running=true;if(this.mode==='audio')await this.media.play();if(generation!==this.generation||!this.running)return;
      const tick=()=>{
        if(generation!==this.generation||!this.running)return;
        const time=this.now();if(time>=this.currentSegment.end){this.advance();return;}
        const group=this.currentSegment.timingGroup;
        if(group){
          if(this.activeGroup!==group){this.onWord(null);this.activeGroup=group;}
          this.onGroup(group,{seconds:time,progress:(time-this.currentSegment.start)/(this.currentSegment.end-this.currentSegment.start)});
        }else{
          if(this.activeGroup){this.activeGroup=null;this.onGroup(null);}
          this.onWord(referenceWordAt(this.currentSegment,time));
        }
        this.raf=this.frame(tick);
      };tick();
    }catch(error){if(generation===this.generation){this.stop();if(error.name!=='AbortError')this.onError(error);}}
  }
  advance(){
    if(!this.running)return;
    this.cancelFrame(this.raf);this.media.pause();this.running=false;this.segmentIndex++;
    if(this.segmentIndex>=this.segments.length){if(this.repeat)this.segmentIndex=0;else{this.stop();this.onEnd();return;}}
    this.enabling=null;this.startSegment(++this.generation);
  }
}
