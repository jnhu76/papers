const CACHE_NAME = 'papers-cache-v1';
const API_CACHE_NAME = 'papers-api-cache-v1';

// 需要缓存的资源
const STATIC_RESOURCES = ['./', './index.html', './papers_data.json'];

// 安装事件 - 缓存静态资源
self.addEventListener('install', (event) => {
  console.log('Service Worker 安装中...');
  event.waitUntil(caches.open(CACHE_NAME)
                      .then((cache) => {
                        return cache.addAll(STATIC_RESOURCES);
                      })
                      .then(() => {
                        console.log('所有资源缓存完成');
                        return self.skipWaiting();
                      }));
});

// 激活事件 - 清理旧缓存
self.addEventListener('activate', (event) => {
  console.log('Service Worker 激活中...');
  event.waitUntil(caches.keys()
                      .then((cacheNames) => {
                        return Promise.all(cacheNames.map((cacheName) => {
                          if (cacheName !== CACHE_NAME &&
                              cacheName !== API_CACHE_NAME) {
                            console.log('删除旧缓存:', cacheName);
                            return caches.delete(cacheName);
                          }
                        }));
                      })
                      .then(() => {
                        console.log('Service Worker 已激活');
                        return self.clients.claim();
                      }));
});

// 获取事件 - 缓存策略
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 对 papers_data.json 使用网络优先，然后缓存的策略
  if (url.pathname.endsWith('papers_data.json')) {
    event.respondWith(caches.open(API_CACHE_NAME).then((cache) => {
      return fetch(event.request)
          .then((response) => {
            // 克隆响应并存入缓存
            if (response.status === 200) {
              cache.put(event.request, response.clone());
            }
            return response;
          })
          .catch(() => {
            // 网络请求失败，尝试从缓存获取
            return cache.match(event.request);
          });
    }));
    return;
  }

  // 对其他资源使用缓存优先策略
  event.respondWith(caches.match(event.request).then((response) => {
    if (response) {
      return response;
    }
    return fetch(event.request).then((response) => {
      // 检查是否收到有效的响应
      if (!response || response.status !== 200 || response.type !== 'basic') {
        return response;
      }
      // 克隆响应并存入缓存
      const responseToCache = response.clone();
      caches.open(CACHE_NAME).then((cache) => {
        cache.put(event.request, responseToCache);
      });
      return response;
    });
  }));
});

// 接收来自页面的消息
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});