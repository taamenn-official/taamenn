const VERSION='v8';
const SHELL=`taamen-shell-${VERSION}`;
const RUNTIME=`taamen-runtime-${VERSION}`;
const CORE=['/','/manifest.webmanifest','/assets/taamen-brand-mark.png'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(SHELL).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>!k.includes(VERSION)).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting()});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET') return;
  const url=new URL(event.request.url);
  // Never cache or serve API traffic: responses are per-session and private.
  // Other origins (analytics, fonts, future ad hosts) are never cached or required.
  // Do not put future commercial config into CORE or this runtime cache.
  if(url.origin!==location.origin || url.pathname.startsWith('/api/')) return;
  // Share tokens are unique URLs. Do not fill Cache Storage with them.
  // Network first, then the SPA shell so React can decode the still-current path.
  if(url.pathname.startsWith('/share/') || url.pathname==='/acquisition'){
    event.respondWith((async()=>{
      try{
        return await fetch(event.request);
      }catch{
        return await caches.match('/') || new Response('TAAMEN offline',{status:503,headers:{'Content-Type':'text/plain'}});
      }
    })());
    return;
  }
  event.respondWith((async()=>{
    const cached=await caches.match(event.request);
    try{
      const response=await fetch(event.request);
      if(response.ok){const copy=response.clone();caches.open(RUNTIME).then(c=>c.put(event.request,copy)).catch(()=>{});}
      return response;
    }catch{return cached || caches.match('/') || new Response('TAAMEN offline',{status:503,headers:{'Content-Type':'text/plain'}})}
  })());
});
