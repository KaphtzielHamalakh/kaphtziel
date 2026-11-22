import {readFileSync,writeFileSync} from 'node:fs';import {gunzipSync} from 'node:zlib';import {createHash} from 'node:crypto';import {fileURLToPath} from 'node:url';
import {originalWordWindow} from '../source-word-windows.js';
import {pitchManifest,validatePitchRecord} from '../source-pitch.js';import {contourGeometry} from '../source-contour.js';import {ReferenceLibrary} from '../reference-library.js';
const read=f=>readFileSync(new URL('../'+f,import.meta.url)),sha=b=>createHash('sha256').update(b).digest('hex'),packet=read('data/references/torah-library.json.gz'),lib=new ReferenceLibrary(JSON.parse(gunzipSync(packet)));
if(sha(packet)!==pitchManifest.referencePacketSha256)throw Error('Reference source packet changed.');
const result={schema:'tropetrain-measured-tone-coverage-v1',revision:2,inputs:{referencePacketSha256:sha(packet),pitchManifestSha256:sha(read('data/pitch/manifest.json')),measurementImplementationSha256:pitchManifest.implementationSha256},recordings:0,sourceTimedRecordings:0,partiallyTimedRecordings:0,withheldRecordings:0,takesWithTimingGaps:0,sourceTimedWords:0,measuredTimeWords:0,durationReviewWords:[],wordsWithMeasuredFrameOnsets:0,wordsWithoutMeasuredFrameOnsets:0,sourceTimedMeasuredFrames:0,sourceTimedUnassignedFrames:0,withheldWords:0,maxDurationSeconds:0,review:{acoustic:null,musical:null,phonological:null},limits:'Exact source structure only. Five defective equal-count takes expose original intervals outside closed ambiguity ranges; three count-mismatch takes stay wholly withheld. Source-timed frame totals count whole measurement packets for the375eligible takes, including their withheld regions; word counts exclude those regions. Per-word counts count frame onsets; a held10ms cell can overlap a word boundary. Missing measurements are muted, not identified rests/silence. No phoneme/syllable times, traditional grammar, reviewed musical notes or singing voice.'};
for(const e of pitchManifest.records){
 const raw=read('data/pitch/'+e.file);if(raw.length!==e.bytes||sha(raw)!==e.sha256)throw Error('Measurement checksum changed: '+e.id);
 const d=validatePitchRecord(JSON.parse(gunzipSync(raw)),e),geometry=contourGeometry(d),record=lib.byId.get(e.id);
 if(record.audio.sha1!==e.sourceAudio.sha1||record.audio.bytes!==e.sourceAudio.bytes||geometry.frames!==d.decodedPcm.frames)throw Error('Source mismatch: '+e.id);
 result.recordings++;result.maxDurationSeconds=Math.max(result.maxDurationSeconds,e.durationSeconds);
 const policy=lib.timingPolicy(record);if(policy.withheldWords)result.takesWithTimingGaps++;
 result.withheldWords+=policy.withheldWords;
 if(!policy.eligibleWords){result.withheldRecordings++;continue;}
 if(policy.kind==='partial-original-windows')result.partiallyTimedRecordings++;
 if(e.wordTiming!==record.status)throw Error('Measurement timing status changed.');
 result.sourceTimedRecordings++;result.sourceTimedMeasuredFrames+=d.counts.periodicFrames;result.sourceTimedUnassignedFrames+=d.counts.unassignedFrames;
 const lower=frame=>{let lo=0,hi=d.series.length;while(lo<hi){const mid=(lo+hi)>>1;if(d.series[mid][0]<frame)lo=mid+1;else hi=mid;}return lo;};
 for(const rawWord of record.words){
  const window=originalWordWindow(record,rawWord,policy);if(!window)continue;const word={...rawWord,...window};
  const end=word.endSeconds??d.decodedPcm.durationSeconds;
  result.sourceTimedWords++;
  if(!Number.isFinite(word.startSeconds)||!Number.isFinite(end)||word.startSeconds<0||word.startSeconds>=end||end>d.decodedPcm.durationSeconds){result.durationReviewWords.push({recordingId:record.id,wordId:word.id,hebrew:word.uxlcHebrew,startSeconds:word.startSeconds,endSeconds:word.endSeconds,measurementDurationSeconds:d.decodedPcm.durationSeconds});continue;}
  result.measuredTimeWords++;
  const count=lower(Math.ceil(end/.01))-lower(Math.ceil(word.startSeconds/.01));if(count)result.wordsWithMeasuredFrameOnsets++;else result.wordsWithoutMeasuredFrameOnsets++;
 }
}
if(result.recordings!==378||result.sourceTimedRecordings!==375||result.partiallyTimedRecordings!==5||result.withheldRecordings!==3||result.takesWithTimingGaps!==8||result.sourceTimedWords!==79194||result.withheldWords!==791)throw Error('Source contour coverage needs review.');
const dest=new URL('../docs/MEASURED-TONE-COVERAGE.json',import.meta.url);writeFileSync(dest,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
