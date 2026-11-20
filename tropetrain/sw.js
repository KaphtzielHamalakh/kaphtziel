const CACHE='tropetrain-v15.0';
const FILES=['./','./index.html','./app.bundle.js?v=0.15.0','./style.css?v=0.15.0','./assets/NotoSerifHebrew.ttf','./assets/OFL.txt','./assets/Bravura.otf','./assets/Bravura-OFL.txt','./assets/ShlomoStam.ttf','./assets/ShlomoStam-OFL.txt','./assets/layout/tikkun-MIT.txt','./assets/layout/tikkun-torah-sources.zip','./docs/SCROLL-SOURCES.json','./docs/CALENDAR-SOURCES.json','./docs/HEBREW-DATE-SOURCES.json','./data/calendar/hebrew-date-sources.zip','./docs/REPERTOIRE-SOURCES.json','./docs/REPERTOIRE-AUDIT.json','./assets/havarotjs-LICENSE.txt','./docs/RESEARCH.md','./assets/scores/cohen-1902-genesis22.png','./assets/scores/cohen-1902-alternate-score.png','./docs/PRINTED-SCORE.json','./assets/scores/cohen-1902-munah-revia.png','./assets/scores/cohen-1902-pentateuch-row-a.png','./docs/PRINTED-PATTERNS.json','./assets/references/Bereshit-1.mp3','./assets/references/NOTICE.txt'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('tropetrain-')&&k!==CACHE).map(k=>caches.delete(k))))));
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET'||new URL(event.request.url).origin!==location.origin)return;
  event.respondWith(fetch(event.request).then(response=>{if(response.ok&&response.status!==206){const copy=response.clone();caches.open(CACHE).then(c=>c.put(event.request,copy));}return response;}).catch(()=>caches.match(event.request)));
});
