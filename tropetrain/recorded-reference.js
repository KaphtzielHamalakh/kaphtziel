// Recorded-reference adaptation: CC BY-SA 3.0; assets/references/NOTICE.txt.
// Recorded takes retain their own text, timing, key and pronunciation. They are
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
  if(time<segment.start||time>=segment.end)return null;
  let low=0,high=segment.words.length-1,answer=0;
  while(low<=high){const mid=(low+high)>>1;if(segment.words[mid].startSeconds<=time){answer=mid;low=mid+1;}else high=mid-1;}
  return segment.words[answer];
}

export class RecordingPlayer {
  constructor(media,{onWord=()=>{},onEnd=()=>{},onError=()=>{},frame:queueFrame=callback=>requestAnimationFrame(callback),cancelFrame=handle=>cancelAnimationFrame(handle)}={}){
    this.media=media;this.onWord=onWord;this.onEnd=onEnd;this.onError=onError;this.frame=queueFrame;this.cancelFrame=cancelFrame;this.generation=0;this.running=false;this.starting=false;
    media.addEventListener('ended',()=>{if(this.running&&media.currentTime>=this.segments[this.segmentIndex].end)this.advance();});
    media.addEventListener('error',()=>{if(this.running){this.stop();onError(Error('The recording could not be decoded or loaded.'));}});
  }
  stop(){
    this.generation++;this.running=false;this.starting=false;this.pending?.abort();this.pending=null;
    this.media.pause();this.cancelFrame(this.raf);this.onWord(null);
  }
  async play(selection,repeat=false){
    this.stop();const generation=this.generation;this.starting=true;
    try{
      if(this.media.readyState<1){
        const pending=new AbortController();this.pending=pending;
        await new Promise((resolve,reject)=>{
          const cleanup=()=>{this.media.removeEventListener('loadedmetadata',ready);this.media.removeEventListener('error',failed);pending.signal.removeEventListener('abort',aborted);};
          const ready=()=>{cleanup();resolve();},failed=()=>{cleanup();reject(Error('The reference recording is unavailable.'));},aborted=()=>{cleanup();reject(new DOMException('Stopped','AbortError'));};
          this.media.addEventListener('loadedmetadata',ready,{once:true});this.media.addEventListener('error',failed,{once:true});pending.signal.addEventListener('abort',aborted,{once:true});this.media.load();
        });
      }
      if(generation!==this.generation)return;
      this.pending=null;this.segments=referenceSegments(selection,this.media.duration);this.segmentIndex=0;this.repeat=repeat;this.starting=false;this.running=true;
      await this.startSegment(generation);
    }catch(error){if(generation===this.generation){this.stop();if(error.name!=='AbortError')this.onError(error);}}
  }
  async startSegment(generation){
    this.cancelFrame(this.raf);this.media.currentTime=this.segments[this.segmentIndex].start;
    try{await this.media.play();}catch(error){if(generation===this.generation){this.stop();this.onError(error);}return;}
    if(generation!==this.generation||!this.running)return;
    const tick=()=>{
      if(generation!==this.generation||!this.running)return;
      const segment=this.segments[this.segmentIndex];
      if(this.media.currentTime>=segment.end){this.advance();return;}
      this.onWord(referenceWordAt(segment,this.media.currentTime));this.raf=this.frame(tick);
    };tick();
  }
  advance(){
    if(!this.running)return;
    this.cancelFrame(this.raf);this.media.pause();this.segmentIndex++;
    if(this.segmentIndex>=this.segments.length){
      if(this.repeat)this.segmentIndex=0;
      else{this.stop();this.onEnd();return;}
    }
    this.startSegment(this.generation);
  }
}
