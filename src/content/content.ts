console.log("✅ content.js loaded");

chrome.runtime.onMessage.addListener((msg) => {
  console.log("📩 message received in content.js:", msg);
});

const adContainingIDs = ['[id*="ad" i]', '[id*="banner" i]', '[id*="sponsor" i]', '[id*="popup" i]']
const adContainingClasses = ['[class*="ad-" i]', '[class*="ads" i]', '[class*="banner" i]', '[class*="pub" i]']
const adContainingSrcs = ['[src*="doubleclick.net" i]', '[src*="adserver" i]', '[src*="track" i]', '[href*="ad" i]']

const adSelectors = [...adContainingIDs, ...adContainingClasses, ...adContainingSrcs].join(", ")

const observer = new MutationObserver(() => {
  document.querySelectorAll(adSelectors).forEach(el => {
    const src = (el as HTMLElement).getAttribute("src") || (el as HTMLElement).getAttribute("href");
    if (!src) return;

    console.log("Element source detected: "+src)
    chrome.runtime.sendMessage({
      type: "AD_DETECTED",
      payload: {
        src,
        tag: el.tagName
      }
    });
  });
})

// Detect for change in document body
observer.observe(document.body, { childList: true, subtree: true });

// remove url containing ads
const originalFetch: typeof fetch = window.fetch;

window.fetch = function(url: RequestInfo | URL, options?: RequestInit): Promise<Response> {
  if (url instanceof URL && url.hostname.includes("ads")) {
    return Promise.resolve(new Response("{}"));
  }
  return originalFetch(url, options);
};

let intervalId: number | null = null;

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "START_BLOCKING") {
    console.log("START_BLOCKING triggered")
  }

  if (msg.type === "STOP_BLOCKING") {
    console.log("STOP_BLOCKING triggered")
  }
});