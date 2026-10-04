const VERSION='v10';
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
  // Crawler files must stay the network response. Do not cache them or substitute the SPA shell.
  if(url.pathname==='/ads.txt'||url.pathname==='/sitemap.xml'||url.pathname==='/robots.txt') return;
  // Share tokens are unique URLs. Do not fill Cache Storage with them.
  // Network first, then the SPA shell so React can decode the still-current path.
  if(url.pathname.startsWith('/share/') || url.pathname==='/acquisition' || url.pathname==='/trophy'){
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

function pushDestination(raw){
  if(raw==='/#archive' || raw==='/#match-center' || raw==='/#stadiums' || raw==='/#settings') return raw;
  return '/#match-center';
}

self.addEventListener('push',event=>{
  let payload={title:'TAAMEN',body:'',url:'/#match-center',tag:'taamen'};
  try{ if(event.data) payload={...payload,...event.data.json()}; }catch{ /* keep the safe fallback */ }
  const title=String(payload.title||'TAAMEN').slice(0,80);
  const body=String(payload.body||'').slice(0,180);
  const url=pushDestination(payload.url);
  const tag=String(payload.tag||'taamen').slice(0,120);
  event.waitUntil((async()=>{
    const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    const visible=windows.some(client=>client.visibilityState==='visible');
    if(visible){
      for(const client of windows) client.postMessage({type:'taamen-push',payload:{title,body,url,tag}});
      return;
    }
    await self.registration.showNotification(title,{
      body,
      icon:'/assets/taamen-brand-mark.png',
      badge:'/assets/taamen-brand-mark.png',
      tag,
      data:{url},
    });
  })());
});

self.addEventListener('notificationclick',event=>{
  event.notification.close();
  const url=pushDestination(event.notification.data&&event.notification.data.url);
  event.waitUntil((async()=>{
    const target=new URL(url,self.location.origin).href;
    const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    for(const client of windows){
      if('navigate' in client){
        await client.focus();
        await client.navigate(target);
        return;
      }
    }
    await self.clients.openWindow(target);
  })());
});
