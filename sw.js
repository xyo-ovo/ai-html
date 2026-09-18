/* ============================================================
   sw.js —— Service Worker（网络优先）
   目标：改完代码刷新就是最新，不用清缓存、不用等 10 分钟

   策略：
   · 所有同源 GET 请求都先走网络
   · 网络成功 → 返回最新内容，同时更新缓存（供离线用）
   · 网络失败 → 回退到缓存
   · skipWaiting + clients.claim：新版本立刻接管，不等下次
   ============================================================ */

const CACHE = 'jiyu-runtime-v1';

self.addEventListener('install', (event) => {
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

  /* 只管 GET */
  if (req.method !== 'GET') return;

  let url;
  try { url = new URL(req.url); } catch (e) { return; }

  /* 只管同源 */
  if (url.origin !== self.location.origin) return;

  /* 跳过带 Range 的请求（音视频拖动进度用） */
  if (req.headers.get('range')) return;

  event.respondWith(
    fetch(req)
      .then((res) => {
        /* 只缓存正常的同源响应 */
        if (res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE)
            .then((c) => c.put(req, copy))
            .catch(() => {});
        }
        return res;
      })
      .catch(() =>
        caches.match(req).then((hit) => {
          if (hit) return hit;
          /* 离线且没缓存：给个兜底 */
          return new Response('离线了，而且这份内容没缓存过。', {
            status: 503,
            statusText: 'Offline',
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
          });
        })
      )
  );
});

/* 允许页面主动要求「立刻更新」 */
self.addEventListener('message', (event) => {
  if (event.data === 'skip-waiting') {
    self.skipWaiting();
  }
});
