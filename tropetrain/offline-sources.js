// Original offline readiness UI, CC0-1.0. A ready label requires the current
// controlling worker to confirm that all included files are actually saved.
export function requestOfflineReadiness(worker,version,{MessageChannel:Channel=globalThis.MessageChannel,timeoutMs=5000,portable=false}={}){
 if(!worker||typeof Channel!=='function')return Promise.resolve(false);
 return new Promise(resolve=>{
  const channel=new Channel();let finished=false;
  const finish=ready=>{if(finished)return;finished=true;clearTimeout(timer);channel.port1.close();channel.port2.close();resolve(ready);};
  const timer=setTimeout(()=>finish(false),timeoutMs);
  channel.port1.onmessage=event=>finish(event.data?.type==='tropetrain-offline-status-result'&&event.data.version===version&&event.data.ready===true);
  try{worker.postMessage({type:portable?'tropetrain-save-portable':'tropetrain-offline-status'},[channel.port2]);}catch{finish(false);}
 });
}
export async function startOfflineSources({document:doc=globalThis.document,navigator:nav=globalThis.navigator,location:loc=globalThis.location,MessageChannel:Channel=globalThis.MessageChannel}={}){
 const label=doc.getElementById('offline-status');if(!label)return;
 const portable=Boolean(doc.getElementById('portable-program-proof'));
 if(portable&&loc.protocol==='file:'){label.textContent='Included reading text & score sources · available offline in this portable copy';return;}
 if(loc.protocol==='file:'){label.textContent='Local folder · included reading text and score sources';return;}
 if(!nav||!('serviceWorker'in nav)||typeof Channel!=='function'){label.textContent='Local instrument practice · offline saving is unavailable in this browser';return;}
 const version=doc.getElementById('build-version').textContent.replace(/^v/,''),pending=portable?'Saving this portable page for offline reopening…':'Saving included reading text & score sources for offline practice…';
 label.textContent=pending;let sequence=0;
 const check=async()=>{const current=++sequence,ready=await requestOfflineReadiness(nav.serviceWorker.controller,version,{MessageChannel:Channel,portable,timeoutMs:portable?300000:5000});if(current!==sequence)return;label.textContent=ready?(portable?'Portable page · saved for offline reopening':'Included reading text & score sources · saved for offline practice'):pending;};
 nav.serviceWorker.addEventListener('controllerchange',check);
 try{const registration=await nav.serviceWorker.register('./sw.js');registration.addEventListener('updatefound',()=>{registration.installing?.addEventListener('statechange',check);});await check();}catch{sequence++;label.textContent='Offline sources are not saved yet. Reopen this page while connected to finish saving them.';}
}
