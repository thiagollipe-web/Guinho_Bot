const CACHE="guinho-shell-v7";
const ASSETS=[
  "./",
  "./index.html",
  "./app.js",
  "./style.css",
  "./manifest.webmanifest",
  "./icon.svg",
  "./knowledge/base.json",
  "./knowledge/training.json",
  "./knowledge/rules.json",
  "./core/nlp.js",
  "./core/eliza.js",
  "./core/memory.js",
  "./core/knowledge.js",
  "./core/router.js",
  "./core/calculator.js"
];

self.addEventListener("install",(event)=>{
  event.waitUntil(
    caches.open(CACHE)
      .then((cache)=>cache.addAll(ASSETS))
      .then(()=>self.skipWaiting())
  );
});

self.addEventListener("activate",(event)=>{
  event.waitUntil(
    caches.keys()
      .then((keys)=>Promise.all(
        keys.filter((key)=>key!==CACHE).map((key)=>caches.delete(key))
      ))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener("fetch",(event)=>{
  if(event.request.method!=="GET") return;
  event.respondWith(
    caches.match(event.request)
      .then((cached)=>cached || fetch(event.request))
  );
});
