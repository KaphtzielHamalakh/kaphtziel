#!/usr/bin/env python3
"""Recheck original bytes/decoded PCM and deterministic actual source frames.

Numerical derivation audit only, never acoustic/cantorial approval. Offline
afconvert needs access to Apple AudioToolbox but does not open audio output.
"""
from pathlib import Path
import argparse,concurrent.futures,gzip,hashlib,json,math,subprocess,tempfile,wave
import numpy as np
from pitch_measurement import estimate_difference
ROOT=Path(__file__).resolve().parent.parent
def sha(raw,kind='sha256'):return hashlib.new(kind,raw).hexdigest()
def audit(args):
 entry,cache=args;data=json.loads(gzip.decompress((cache/'measured'/entry['file']).read_bytes()));source=cache/'audio'/entry['sourceAudio']['filename']
 if not source.exists():source=ROOT/'assets/references'/entry['sourceAudio']['filename']
 raw=source.read_bytes()
 if len(raw)!=entry['sourceAudio']['bytes'] or sha(raw,'sha1')!=entry['sourceAudio']['sha1']:raise ValueError('Original audio mismatch: '+entry['id'])
 with tempfile.TemporaryDirectory(prefix='tropetrain-pitch-audit-') as folder:
  target=Path(folder)/'source.wav';subprocess.run(['/usr/bin/afconvert','-f','WAVE','-d','LEI16@16000','-c','1',str(source),str(target)],check=True,capture_output=True)
  if sha(target.read_bytes())!=entry['pcmSha256']:raise ValueError('Decoded PCM mismatch: '+entry['id'])
  with wave.open(str(target)) as stream:samples=np.frombuffer(stream.readframes(stream.getnframes()),dtype='<i2').astype(float)/32768.
 p=data['parameters'];length=p['frameLength'];maxlag=math.ceil(p['sampleRate']/p['minHz'])+1;width=length-maxlag;padded=np.pad(samples,(length//2,length//2));stored={row[0]:row for row in data['series']};count=data['counts']['frames'];indices={0,count//4,count//2,3*count//4,count-1}
 if data['series']:indices.update(data['series'][i][0] for i in [0,len(data['series'])//2,-1])
 assigned=0;unassigned=0
 for i in sorted(indices):
  frame=padded[i*p['hop']:i*p['hop']+length].copy();frame-=frame.mean();rms=np.sqrt(np.mean(frame*frame));expected=None
  if rms>=p['rmsMin']:
   # Direct squared differences, independent of the production FFT correlation.
   differences=np.sum((frame[:width,None]-frame[np.arange(width)[:,None]+np.arange(maxlag+1)])**2,axis=0)
   result=estimate_difference(differences,p['sampleRate'],min_hz=p['minHz'],max_hz=p['maxHz'],threshold=p['threshold'])
   if result:expected=[i,int(round(result[0]*10)),int(round(result[1]*10000))]
  actual=stored.get(i)
  if actual!=expected:raise ValueError('Direct source-frame mismatch: '+entry['id']+' '+str(i)+' '+str((actual,expected)))
  if expected:assigned+=1
  else:unassigned+=1
 return {'id':entry['id'],'originalAudioSha1':entry['sourceAudio']['sha1'],'pcmSha256':entry['pcmSha256'],'sampleFrames':sorted(indices),'assigned':assigned,'unassigned':unassigned,'status':'direct-difference agreement'}
if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--cache',required=True);parser.add_argument('--output',required=True);args=parser.parse_args();cache=Path(args.cache).resolve();manifest=json.loads((ROOT/'data/pitch/manifest.json').read_text())
 with concurrent.futures.ProcessPoolExecutor(max_workers=2) as pool:rows=list(pool.map(audit,[(entry,cache) for entry in manifest['records']]))
 result={'schema':'tropetrain-pitch-source-sample-audit-v1','revision':1,'manifestSha256':sha((ROOT/'data/pitch/manifest.json').read_bytes()),'implementationSha256':manifest['implementationSha256'],'recordings':len(rows),'sampleFrames':sum(len(row['sampleFrames']) for row in rows),'assignedFrames':sum(row['assigned'] for row in rows),'unassignedFrames':sum(row['unassigned'] for row in rows),'status':'all original source byte counts/SHA1, repeated decoded PCM SHA256 and deterministic direct-difference measurements agree','limits':'This checks numerical derivation from pinned original source audio, not pitch accuracy, note identities, syllable times, phonemes or cantorial/linguistic approval. Independent acoustic and musical review is pending.','records':rows}
 Path(args.output).write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({key:value for key,value in result.items() if key!='records'}))
