"""Original fixed-window YIN-derived measurement, not a musical transcription.

Based on de Cheveigne/Kawahara, JASA111(4),2002, equations6/8 and
steps4/5. Unlike the paper, no global-minimum fallback or step6: a frame
without a sufficiently periodic local minimum remains unassigned.
"""
import math

def difference_reference(frame, max_lag):
    width=len(frame)-max_lag
    return [sum((frame[j]-frame[j+lag])**2 for j in range(width)) for lag in range(max_lag+1)]

def estimate_difference(difference, sample_rate, *, min_hz=65,max_hz=600,threshold=.1):
    minimum=max(2,math.floor(sample_rate/max_hz));maximum=min(len(difference)-2,math.ceil(sample_rate/min_hz))
    cmnd=[1.]*len(difference);total=0.
    for lag in range(1,len(difference)):
        total+=max(0.,float(difference[lag]))
        cmnd[lag]=max(0.,float(difference[lag]))*lag/total if total>1e-20 else 1.
    candidates=[i for i in range(minimum,maximum+1) if cmnd[i]<threshold and cmnd[i]<=cmnd[i-1] and cmnd[i]<cmnd[i+1]]
    if not candidates:return None
    lag=candidates[0];a,b,c=map(float,difference[lag-1:lag+2]);denominator=a-2*b+c
    delta=.5*(a-c)/denominator if denominator>1e-20 else 0.
    delta=min(.5,max(-.5,delta));hz=sample_rate/(lag+delta)
    if not min_hz<=hz<=max_hz:return None
    return hz,1-cmnd[lag]

def analyze_pcm(samples,sample_rate=16000,*,hop=160,frame_length=1024,min_hz=65,max_hz=600,threshold=.1,rms_min=.002):
    import numpy as np
    samples=np.asarray(samples,dtype=np.float64)
    if samples.ndim!=1 or not np.isfinite(samples).all():raise ValueError('Finite mono PCM required.')
    max_lag=math.ceil(sample_rate/min_hz)+1;width=frame_length-max_lag
    if width<max_lag:raise ValueError('Window is too short for the lowest requested frequency.')
    padded=np.pad(samples,(frame_length//2,frame_length//2));times=np.arange(0,len(samples),hop)/sample_rate
    f0=np.full(len(times),np.nan);periodicity=np.zeros(len(times));rms=np.zeros(len(times));fft_length=2**math.ceil(math.log2(2*frame_length))
    for offset in range(0,len(times),256):
        indices=np.arange(offset,min(offset+256,len(times)))*hop
        frames=padded[indices[:,None]+np.arange(frame_length)[None,:]]
        frames-=np.mean(frames,axis=1,keepdims=True)
        rms[offset:offset+len(indices)]=np.sqrt(np.mean(frames*frames,axis=1))
        first=np.zeros_like(frames);first[:,:width]=frames[:,:width]
        correlation=np.fft.irfft(np.conj(np.fft.rfft(first,n=fft_length,axis=1))*np.fft.rfft(frames,n=fft_length,axis=1),n=fft_length,axis=1)[:,:max_lag+1]
        sums=np.pad(np.cumsum(frames*frames,axis=1),((0,0),(1,0)))
        difference=np.maximum(0,sums[:,width:width+max_lag+1]-sums[:,:max_lag+1]+sums[:,width,None]-2*correlation)
        for index,row in enumerate(difference):
            i=offset+index
            if rms[i]<rms_min:continue
            result=estimate_difference(row,sample_rate,min_hz=min_hz,max_hz=max_hz,threshold=threshold)
            if result:f0[i],periodicity[i]=result
    return times,f0,periodicity,rms
