const CACHE='tropetrain-v5.0';
const FILES=['./','./index.html','./app.bundle.js?v=0.5.0','./style.css?v=0.5.0','./assets/NotoSerifHebrew.ttf','./assets/OFL.txt','./assets/Bravura.otf','./assets/Bravura-OFL.txt','./assets/havarotjs-LICENSE.txt','./docs/RESEARCH.md'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('tropetrain-')&&k!==CACHE).map(k=>caches.delete(k))))));
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET'||new URL(event.request.url).origin!==location.origin)return;
  event.respondWith(fetch(event.request).then(response=>{if(response.ok){const copy=response.clone();caches.open(CACHE).then(c=>c.put(event.request,copy));}return response;}).catch(()=>caches.match(event.request)));
});
