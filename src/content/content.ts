// Remove common ad elements
function removeAds() {
  const selectors = [
    ".ad",
    ".ads",
    ".ad-banner",
    "[id*='ad']",
    "[class*='ad']",
    "iframe[src*='ads']"
  ];

  selectors.forEach(selector => {
    document.querySelectorAll(selector).forEach(el => el.remove());
  });
}

// Run repeatedly (ads often load dynamically)
setInterval(removeAds, 2000);





// remove url containing ads
const originalFetch: typeof fetch = window.fetch;

window.fetch = function(url: RequestInfo | URL, options?: RequestInit): Promise<Response> {
  if (url instanceof URL && url.hostname.includes("ads")) {
    return Promise.resolve(new Response("{}"));
  }
  return originalFetch(url, options);
};