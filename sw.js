// sw.js
const CACHE_NAME = 'papers-cache-v3';
const API_CACHE_NAME = 'papers-api-cache-v3';

// 需要缓存的资源（只缓存核心文件，排除CDN资源）
const STATIC_RESOURCES = ['./', './index.html'];

// 安装事件 - 缓存静态资源
self.addEventListener('install', (event) => {
  console.log('🔄 Service Worker 安装中...');
  event.waitUntil(caches.open(CACHE_NAME)
                      .then((cache) => {
                        console.log('📦 缓存静态资源:', STATIC_RESOURCES);
                        return cache.addAll(STATIC_RESOURCES);
                      })
                      .then(() => {
                        console.log('✅ 所有静态资源缓存完成');
                        return self.skipWaiting();
                      })
                      .catch(error => {
                        console.error('❌ 缓存失败:', error);
                      }));
});

// 激活事件 - 清理旧缓存
self.addEventListener('activate', (event) => {
  console.log('🔄 Service Worker 激活中...');
  event.waitUntil(caches.keys()
                      .then((cacheNames) => {
                        return Promise.all(cacheNames.map((cacheName) => {
                          if (cacheName !== CACHE_NAME &&
                              cacheName !== API_CACHE_NAME) {
                            console.log('🗑️ 删除旧缓存:', cacheName);
                            return caches.delete(cacheName);
                          }
                        }));
                      })
                      .then(() => {
                        console.log('✅ Service Worker 已激活');
                        return self.clients.claim();
                      }));
});

// 获取事件 - 缓存策略
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 对 CDN 资源完全绕过 Service Worker
  if (url.hostname.includes('cdn.tailwindcss.com') ||
      url.hostname.includes('cdnjs.cloudflare.com') ||
      url.hostname.includes('fonts.googleapis.com') ||
      url.hostname.includes('fonts.gstatic.com')) {
    console.log('🌐 CDN资源绕过Service Worker:', url.hostname);
    event.respondWith(fetch(event.request));
    return;
  }

  // 对 papers_data.json 完全绕过 Service Worker 缓存
  if (url.pathname.endsWith('papers_data.json')) {
    console.log('🚫 JSON文件绕过Service Worker缓存:', url.pathname);
    event.respondWith(fetch(event.request));
    return;
  }

  // 对HTML文件和根路径使用网络优先策略
  if (url.pathname.endsWith('.html') || url.pathname === '/') {
    event.respondWith(
        fetch(event.request)
            .then(response => {
              // 只缓存成功的响应
              if (response.status === 200) {
                const responseClone = response.clone();
                caches.open(CACHE_NAME)
                    .then(cache => cache.put(event.request, responseClone));
              }
              return response;
            })
            .catch(() => {
              // 网络失败时使用缓存
              return caches.match(event.request);
            }));
    return;
  }

  // 其他同源资源保持缓存优先策略
  if (url.origin === location.origin) {
    event.respondWith(caches.match(event.request).then((response) => {
      if (response) {
        return response;
      }
      return fetch(event.request)
          .then(response => {
            // 只缓存成功的响应
            if (response.status === 200) {
              const responseClone = response.clone();
              caches.open(CACHE_NAME)
                  .then(cache => cache.put(event.request, responseClone));
            }
            return response;
          })
          .catch(error => {
            console.error('获取资源失败:', error);
            throw error;
          });
    }));
  } else {
    // 其他跨域资源直接请求
    event.respondWith(fetch(event.request));
  }
});

// 接收来自页面的消息
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('✅ 接收跳过等待指令，立即激活');
    self.skipWaiting();
  }
});