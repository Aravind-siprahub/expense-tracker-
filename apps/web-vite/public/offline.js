// Behaviour of the offline page (offline.html).
// It lives in its own file, not inline in the page, because the site's Content-Security-Policy only
// allows scripts from the site itself. The service worker saves this file with the page.

// Reload the page that was asked for as soon as the connection is back.
document.getElementById('retry').addEventListener('click', function () {
  location.reload();
});
window.addEventListener('online', function () {
  location.reload();
});
