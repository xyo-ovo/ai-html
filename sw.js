/* ============================================================
   sw.js —— Service Worker（网络优先 + HTML 不缓存）

   关键修正：
   上一版的 fetch(req) 默认还是会走浏览器自己的 HTTP 缓存，
   等于网络优先了个寂寞——拿回来的还是旧的 index.html。

   这版对「HTML 导航请求」加 cache:'no-store'，
   强制绕过 HTTP 缓存，确保每次拿到的都是最新的 index.html。
   其他静态资源（js/css/图片）仍然走默认缓存 + SW 缓存兜底，
   不会每次都重新下载。
   ============================================================ */

const CACHE = 'jiyu-runtime-v2';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
      .catch(() => {})
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  if (req.method !== 'GET') return;

  let url;
  try { url = new URL(req.url); } catch (e) { return; }

  /* 只管同源 */
  if (url.origin !== self.location.origin) return;

  /* 跳过带 Range 的请求 */
  if (req.headers.get('range')) return;

  /* 是不是「打开页面」这类请求 */
  const isHTML = req.mode === 'navigate' ||
    ((req.headers.get('accept') || '').indexOf('text/html') >= 0);

  event.respondWith(
    fetch(req, isHTML ? { cache: 'no-store' } : {})
      .then((res) => {
        /* HTML 不进 SW 缓存，永远拿网络最新 */
        if (!isHTML && res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() =>
        caches.match(req).then((hit) => {
          if (hit) return hit;
          return new Response('离线了，而且这份内容没缓存过。', {
            status: 503,
            statusText: 'Offline',
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
          });
        })
      )
  );
});

/* 页面可以主动要求立刻接管 */
self.addEventListener('message', (event) => {
  if (event.data === 'skip-waiting') self.skipWaiting();
});
