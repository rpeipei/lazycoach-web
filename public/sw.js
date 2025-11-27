// public/sw.js

// 安裝時立即啟用新版 SW
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

// 啟用後立刻接管所有 client
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// 不實作 fetch，全部交給瀏覽器預設的網路行為
// 這樣就不會快取 _next 的 chunk，不會再有版本衝突
