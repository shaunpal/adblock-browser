console.log("✅ content.js loaded");

const adContainingIDs = ['[id*="ad" i]', '[id*="banner" i]', '[id*="sponsor" i]', '[id*="popup" i]']
const adContainingClasses = ['[class*="ad-" i]', '[class*="ads" i]', '[class*="banner" i]', '[class*="pub" i]']
const adContainingSrcs = ['[src*="doubleclick.net" i]', '[src*="adserver" i]', '[src*="track" i]', '[href*="ad" i]']

const adSelectors = [...adContainingIDs, ...adContainingClasses, ...adContainingSrcs].join(", ")


function isExtensionAlive() {
  try {
    return !!chrome.runtime?.id;
  } catch {
    return false;
  }
}

const observer = new MutationObserver(() => {
  if (!isExtensionAlive()) {
    observer.disconnect();
    return;
  }

  const adElements = document.querySelectorAll(adSelectors);
  adElements.forEach(el => {
    const src = (el as HTMLElement).getAttribute("src") || (el as HTMLElement).getAttribute("href");
    if (!src || !URL.canParse(src)) {
      (el as HTMLElement).style.display = "none";
      return;
    }

    safeSendMessage({
      type: "AD_DETECTED",
      payload: {
        src,
        tag: el.tagName
      }
    });
    (el as HTMLElement).style.display = "none";
  });
})

// Detect for change in document body
observer.observe(document.body, { childList: true, subtree: true });

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "START_BLOCKING") {
    console.log("📩 message received in content.js:", msg);
    console.log("START_BLOCKING triggered")
  }

  if (msg.type === "STOP_BLOCKING") {
    console.log("STOP_BLOCKING triggered")
  }
});

window.addEventListener("beforeunload", () => {
  observer.disconnect();
});

// --- SAFE SEND ---
function safeSendMessage(payload: any) {
  try {
    if (!chrome.runtime?.id) return;
    chrome.runtime.sendMessage(payload);
  } catch {
    observer.disconnect();
  }
}

declare global {
  interface Window {
    adsbygoogle?: any[];
    googletag?: { cmd?: any[] } & Record<string, any>;
  }
}

// Defensive tactics to ensure anti-adblock is working (Privacy mode) -- NOT IMPLEMENTED YET
export function initPrivacyMode() {
  // Override common ad-related APIs to prevent detection
  const originalFetch: typeof fetch = window.fetch;

  window.fetch = function(url: RequestInfo | URL, options?: RequestInit): Promise<Response> {
    if (url instanceof URL && url.hostname.includes("ads")) {
      return Promise.resolve(new Response("{}"));
    }
    return originalFetch(url, options);
  };

  // override toDataURL to prevent canvas fingerprinting 
  const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;

  HTMLCanvasElement.prototype.toDataURL = function() {
    const ctx = this.getContext("2d");
    ctx?.fillRect(0, 0, 1, 1); // slight noise
    return originalToDataURL.apply(this, arguments as any);
  };

  // override (spoof) navigator properties to prevent fingerprinting
  Object.defineProperty(navigator, "userAgent", {
    get: () => "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.107 Safari/537.36"
  });
  Object.defineProperty(navigator, "platform", {
    get: () => "Win32"
  });
  Object.defineProperty(navigator, "hardwareConcurrency", {
    get: () => 4
  });

  window.adsbygoogle = window.adsbygoogle || [];
  window.googletag = window.googletag || { cmd: [] };
}