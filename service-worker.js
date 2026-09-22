const CACHE="guinho-bot-v20";
const ASSETS=["./","./index.html","./styles.css","./app.js","./knowledge.js","./retrieval.js","./memory.js","./context.js","./probabilistic.js","./prompt-library.js","./game-library.js","./generator.js","./analyzer.js","./fixer.js","./manifest.json","./icon.svg"];
const sameOrigin=url=>new URL(url).origin===self.location.origin;
self.addEventListener("install",event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener("activate",event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",event=>{
  if(event.request.method!=="GET"||!sameOrigin(event.request.url))return;
  event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>{
    if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));}
    return response;
  }).catch(()=>caches.match("./index.html"))));
});