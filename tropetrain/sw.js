const CACHE='tropetrain-v6.0';
const FILES=['./','./index.html','./app.bundle.js?v=0.6.0','./style.css?v=0.6.0','./assets/NotoSerifHebrew.ttf','./assets/OFL.txt','./assets/Bravura.otf','./assets/Bravura-OFL.txt','./assets/havarotjs-LICENSE.txt','./docs/RESEARCH.md','./assets/references/Bereshit-1.mp3','./assets/references/NOTICE.txt'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('tropetrain-')&&k!==CACHE).map(k=>caches.delete(k))))));
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET'||new URL(event.request.url).origin!==location.origin)return;
  event.respondWith(fetch(event.request).then(response=>{if(response.ok&&response.status!==206){const copy=response.clone();caches.open(CACHE).then(c=>c.put(event.request,copy));}return response;}).catch(()=>caches.match(event.request)));
});
