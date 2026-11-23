// רשת קודם, ובלי רשת מהמטמון: עדכונים מגיעים מיד, והאפליקציה עובדת גם בלי אינטרנט.
const C = 'pd-v26';
self.addEventListener('install', e => self.skipWaiting());
// מוחקים רק מטמונים ישנים של האפליקציה הזו (pd-). באותו דומיין יש אפליקציות אחרות (petornet-) ולא נוגעים בהן
self.addEventListener('activate', e => e.waitUntil(caches.keys()
  .then(ks => Promise.all(ks.filter(k => k.startsWith('pd-') && k !== C).map(k => caches.delete(k))))
  .catch(() => { }).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || !e.request.url.startsWith(self.location.origin)) return;
  e.respondWith(fetch(e.request, { cache: 'no-cache' }).then(r => { const cp = r.clone(); caches.open(C).then(c => c.put(e.request, cp)); return r; })
    .catch(() => caches.match(e.request, { ignoreSearch: true })));
});
