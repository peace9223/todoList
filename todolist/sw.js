const CACHE_NAME = 'synctodo-v1';
// 앱을 설치하고 오프라인에서도 작동하게 만들 파일 목록입니다.
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './icon.svg'
];

// 설치 단계: 필요한 파일들을 미리 브라우저 캐시에 저장합니다.
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

// 패치(가져오기) 단계: 인터넷 연결이 끊겨도 캐시에서 파일을 꺼내와 보여줍니다.
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => {
      return response || fetch(e.request);
    })
  );
});
