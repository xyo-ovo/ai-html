/* ============================================================
   sw.js —— Service Worker（网络优先 + HTML/JS/CSS 都不缓存）

   上一版只让 HTML 走 no-store，JS/CSS 还是吃浏览器 HTTP 缓存
   （GitHub Pages 给所有静态文件加了 max-age=600），
   所以改完 JS 刷新也拿不到新的 —— 这就是「只能清缓存」的根因。

   这版把 HTML / JS / CSS 全部走 cache:'no-store'，
   每次刷新都强制回源。图片等其它资源照常缓存。
   ============================================================ */

const CACHE = 'jiyu-runtime-v3';

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

  const accept = req.headers.get('accept') || '';
  const isHTML = req.mode === 'navigate' || accept.indexOf('text/html') >= 0;

  /* JS / CSS 也要强制回源：靠路径后缀判断 */
  const path = url.pathname.toLowerCase();
  const isCode = isHTML ||
    path.endsWith('.js') || path.endsWith('.mjs') ||
    path.endsWith('.css') ||
    path.endsWith('.json');

  event.respondWith(
    fetch(req, isCode ? { cache: 'no-store' } : {})
      .then((res) => {
        /* 只有「非代码类」资源才进 SW 缓存（图片、字体等） */
        if (!isCode && res && res.status === 200 && res.type === 'basic') {
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

self.addEventListener('message', (event) => {
  if (event.data === 'skip-waiting') self.skipWaiting();
});
