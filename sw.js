/* Service worker for the Einbürgerungstest trainer.
 *
 * Bump VERSION on every deploy that changes the shell. Old caches are dropped
 * on activate, so this is the only piece of release bookkeeping there is.
 *
 * Three strategies, chosen per asset class:
 *
 *   shell (html/css/js)  network-first  -- a reload always picks up a new deploy
 *                                          while online, and still works offline.
 *                                          Keeps HTML and JS in lockstep, which
 *                                          matters because neither is hashed.
 *   data/*.json          stale-while-revalidate -- instant, and still catches a
 *                                          BAMF catalogue revision on the next visit
 *                                          without anyone remembering to bump VERSION.
 *   font/ img/ icon/     cache-first    -- genuinely immutable; the name changes
 *                                          if the bytes do.
 *
 * The one exception to that last line is the brand kit: icon/icon-192.png and
 * friends were replaced in place when the mark was drawn. Cache-first would
 * have served the old artwork to every existing install forever -- bumping
 * VERSION is what saves it, because activate drops every cache that is not the
 * current one, icons included. Any future re-cut of the mark must bump VERSION
 * in the same commit.
 */
const VERSION = 'ebt-2026-09-18c';
const SHELL   = ['./', 'app.css', 'app.js', 'manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(VERSION)
      .then(c => c.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

async function cacheFirst(req) {
  const c   = await caches.open(VERSION);
  const hit = await c.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) c.put(req, res.clone());
  return res;
}

function staleWhileRevalidate(e, req) {
  return caches.open(VERSION).then(async c => {
    const hit = await c.match(req);
    const net = fetch(req)
      .then(res => { if (res.ok) c.put(req, res.clone()); return res; })
      .catch(() => null);
    // keep the worker alive for the background refresh even though we reply now
    if (hit) { e.waitUntil(net); return hit; }
    const res = await net;
    if (res) return res;
    throw new Error('offline and uncached: ' + req.url);
  });
}

async function networkFirst(req) {
  const c = await caches.open(VERSION);
  try {
    const res = await fetch(req);
    if (res.ok) c.put(req, res.clone());
    return res;
  } catch (err) {
    const hit = await c.match(req) || await c.match('./');
    if (hit) return hit;
    throw err;
  }
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  if (/\/(font|img|icon)\//.test(url.pathname)) return e.respondWith(cacheFirst(req));
  if (/\/data\/[^/]+\.json$/.test(url.pathname)) return e.respondWith(staleWhileRevalidate(e, req));
  e.respondWith(networkFirst(req));
});
