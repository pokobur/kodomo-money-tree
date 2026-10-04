// マネーツリー Service Worker
// キャッシュファースト + ネットワークフォールバック

const CACHE_NAME = 'money-tree-v1';
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
];

// インストール: 静的アセットをキャッシュ
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// アクティベート: 古いキャッシュを削除
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// フェッチ: キャッシュファースト、API通信はネットワークファースト
self.addEventListener('fetch', (event) => {
  if (!event.request.url.startsWith('http')) return;
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Supabase API / 外部APIはネットワークファースト
  if (url.hostname.includes('supabase') || url.hostname.includes('googleapis')) {
    event.respondWith(
      fetch(event.request)
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // 静的アセットはキャッシュファースト
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        // レスポンスをキャッシュ
        if (response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone);
          });
        }
        return response;
      });
    })
  );
});
