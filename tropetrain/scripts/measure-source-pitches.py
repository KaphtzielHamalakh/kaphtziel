#!/usr/bin/env python3
"""Measure original licensed source audio, never infer a cantillation grammar.

Requires Python3 + NumPy; macOS afconvert decodes offline. Use --limit for a
bounded validation, then omit it for all378 original recordings. Output is a
resumable private research cache; publish only after independent input audit.
"""
from pathlib import Path
import argparse,concurrent.futures,gzip,hashlib,json,math,os,subprocess,tempfile,time,urllib.request,wave
import numpy as np
from pitch_measurement import analyze_pcm
ROOT=Path(__file__).resolve().parent.parent
PARAMS={'sampleRate':16000,'hop':160,'frameLength':1024,'minHz':65,'maxHz':600,'threshold':.1,'rmsMin':.002,'frequencyUnitHz':.1,'periodicityUnit':.0001,'method':'fixed-window YIN-derived steps2–5; no global-minimum fallback or step6'}
IMPLEMENTATION=hashlib.sha256((Path(__file__).read_bytes()+Path(__file__).with_name('pitch_measurement.py').read_bytes())).hexdigest()
INPUT=ROOT/'data/references/torah-library.json.gz'
DATA=json.loads(gzip.decompress(INPUT.read_bytes()))

def digest(raw,kind='sha256'):return hashlib.new(kind,raw).hexdigest()
def encode(value):return (json.dumps(value,ensure_ascii=False,separators=(',',':'))+'\n').encode()

def process(args):
 record,cache=args;cache=Path(cache);target=cache/'measured'/f'{record["id"]}.json.gz'
 if target.exists():
  saved=json.loads(gzip.decompress(target.read_bytes()))
  if saved['implementationSha256']!=IMPLEMENTATION or saved['parameters']!=PARAMS or saved['sourceAudio']['sha1']!=record['audio']['sha1']:
   raise ValueError('Cached measurement uses other inputs/parameters; inspect before rebuilding: '+record['id'])
  return record['id'],saved['counts'],'cached'
 audio=record['audio'];filename=audio['filename']
 if Path(filename).name!=filename or not filename.endswith('.mp3'):raise ValueError('Unsafe source filename.')
 candidates=[cache/'audio'/filename,ROOT/'assets/references'/filename]
 source=next((p for p in candidates if p.exists()),None)
 if source is None:
  source=candidates[0];source.parent.mkdir(parents=True,exist_ok=True)
  last=None
  for attempt in range(3):
   try:
    request=urllib.request.Request(audio['url'],headers={'User-Agent':'TropeTrain-source-measurement/0.33 (licensed PocketTorah research)'})
    with urllib.request.urlopen(request,timeout=75) as response:raw=response.read(audio['bytes']+1)
    if len(raw)!=audio['bytes'] or digest(raw,'sha1')!=audio['sha1']:raise ValueError('Original source bytes/hash changed: '+record['id'])
    temporary=source.with_suffix('.mp3.part');temporary.write_bytes(raw);temporary.replace(source);break
   except Exception as exc:last=exc
  else:raise RuntimeError('Source download failed: '+record['id']+': '+str(last))
 raw=source.read_bytes()
 if len(raw)!=audio['bytes'] or digest(raw,'sha1')!=audio['sha1']:raise ValueError('Original source cache bytes/hash changed.')
 with tempfile.TemporaryDirectory(prefix='tropetrain-pitch-') as temporary:
  pcm=Path(temporary)/'decoded.wav'
  subprocess.run(['/usr/bin/afconvert','-f','WAVE','-d','LEI16@16000','-c','1',str(source),str(pcm)],check=True,capture_output=True)
  pcm_raw=pcm.read_bytes()
  with wave.open(str(pcm)) as stream:
   if stream.getnchannels()!=1 or stream.getsampwidth()!=2 or stream.getframerate()!=16000:raise ValueError('Unexpected decoded PCM format.')
   count=stream.getnframes();samples=np.frombuffer(stream.readframes(count),dtype='<i2').astype(np.float64)/32768.
  times,hz,periodicity,rms=analyze_pcm(samples,16000)
 valid=np.isfinite(hz);indices=np.flatnonzero(valid)
 frames=[[int(i),int(round(float(hz[i])*10)),int(round(float(periodicity[i])*10000))] for i in indices]
 counts={'frames':len(times),'periodicFrames':len(frames),'belowRmsFrames':int((rms<PARAMS['rmsMin']).sum()),'unassignedFrames':int((~valid).sum())}
 value={'schema':'tropetrain-source-pitch-measurement-v1','revision':1,'id':record['id'],'bookId':record['bookId'],'parameters':PARAMS,'implementationSha256':IMPLEMENTATION,'referencePacketSha256':digest(INPUT.read_bytes()),'sourceAudio':{k:audio[k] for k in ['url','filename','sha1','bytes']},'decodedPcm':{'sampleRate':16000,'channels':1,'bitsPerSample':16,'frames':count,'durationSeconds':count/16000,'sha256':digest(pcm_raw),'decoder':'Apple afconvert; offline WAVE/LEI16@16000/mono'},'counts':counts,'series':frames,'alignment':{'kind':'source-recording-time-only','wordTiming':record['status'],'syllableTimes':None,'phonemes':None,'musicalNotes':None,'traditionalGrammar':None},'rights':{'audioLicense':DATA['audioLicense'],'timingLicense':DATA['timingLicense'],'adaptationLicense':'CC-BY-SA-3.0','creator':DATA['creator'],'projectCredits':DATA['projectCredits'],'individualReader':DATA['individualReader']},'limits':'Automatically estimated F0 in original source time; not a reviewed score, note attack sequence, rhythm, phoneme/syllable alignment, tradition identity or independent singing voice. Missing frames remain unassigned. Periodicity score is not a musical-correctness probability. No source text, original audio or timestamps changed.'}
 target.parent.mkdir(parents=True,exist_ok=True);part=target.with_suffix('.gz.part');part.write_bytes(gzip.compress(encode(value),compresslevel=9,mtime=0));part.replace(target)
 return record['id'],counts,'measured'

if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--cache',required=True);p.add_argument('--limit',type=int);p.add_argument('--workers',type=int,default=2);args=p.parse_args()
 records=DATA['recordings'][:args.limit] if args.limit else DATA['recordings'];cache=Path(args.cache).resolve();cache.mkdir(parents=True,exist_ok=True);start=time.monotonic();results=[];errors=[]
 print(json.dumps({'records':len(records),'implementationSha256':IMPLEMENTATION,'parameters':PARAMS,'cache':str(cache)}),flush=True)
 with concurrent.futures.ProcessPoolExecutor(max_workers=args.workers) as pool:
  pending={pool.submit(process,(record,str(cache))):record['id'] for record in records}
  for future in concurrent.futures.as_completed(pending):
   try:
    rid,counts,status=future.result();results.append({'id':rid,**counts,'status':status});print(json.dumps({'completed':len(results),'id':rid,**counts,'status':status,'elapsedSeconds':round(time.monotonic()-start,1)}),flush=True)
   except Exception as exc:errors.append({'id':pending[future],'error':str(exc)});print(json.dumps(errors[-1]),flush=True)
 result={'schema':'tropetrain-source-pitch-run-v1','implementationSha256':IMPLEMENTATION,'parameters':PARAMS,'referencePacketSha256':digest(INPUT.read_bytes()),'requested':len(records),'completed':len(results),'errors':errors,'records':sorted(results,key=lambda r:r['id']),'elapsedSeconds':round(time.monotonic()-start,1)}
 (cache/'run.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(json.dumps({k:v for k,v in result.items() if k not in ['records','parameters']}),flush=True)
 if errors:raise SystemExit(1)
