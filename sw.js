// 在STATIC_RESOURCES数组中，为HTML文件添加版本号或时间戳
const STATIC_RESOURCES = ['./', './index.html', './papers_data.json'];

// 修改fetch事件，对HTML文件使用网络优先策略
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 对HTML文件和根路径使用网络优先策略
  if (url.pathname.endsWith('.html') || url.pathname === '/') {
    event.respondWith(
        fetch(event.request)
            .then(response => {
              // 更新缓存
              caches.open(CACHE_NAME)
                  .then(cache => cache.put(event.request, response.clone()));
              return response;
            })
            .catch(() => {
              // 网络失败时使用缓存
              return caches.match(event.request);
            }));
    return;
  }

  // papers_data.json 保持原有策略
  if (url.pathname.endsWith('papers_data.json')) {
    event.respondWith(caches.open(API_CACHE_NAME).then((cache) => {
      return fetch(event.request)
          .then((response) => {
            if (response.status === 200) {
              cache.put(event.request, response.clone());
            }
            return response;
          })
          .catch(() => {
            return cache.match(event.request);
          });
    }));
    return;
  }

  // 其他资源保持缓存优先
  event.respondWith(caches.match(event.request).then((response) => {
    if (response) {
      return response;
    }
    return fetch(event.request);
  }));
});