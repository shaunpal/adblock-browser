import { RULES } from "../utils/rules";

type Ad = {
  src: string;
  tag: string;
};

type TabAds = {
  [tabId: number]: Ad[];
};

const tabAds: TabAds = {};

async function sendToActiveTab(message: any) {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];

  if (!tab?.id) {
    console.error("No active tab found");
    return;
  }

  // ✅ Inject content script to execute on active tab
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ["content.js"]
  });

  if (tab?.id) {
    chrome.tabs.sendMessage(tab.id, message);
  }
}

async function enableBlocking() {
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: RULES.map(r => r.id),
    addRules: RULES as chrome.declarativeNetRequest.Rule[]
  });

  await chrome.storage.local.set({ enabled: true });
  console.log("Ad blocking ENABLED");

  await sendToActiveTab({ type: "START_BLOCKING" });
}

async function disableBlocking() {
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: RULES.map(r => r.id)
  });

  await chrome.storage.local.set({ enabled: false });
  console.log("Ad blocking DISABLED");

  await sendToActiveTab({ type: "STOP_BLOCKING" });
}

// Listen for toggle from UI
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "TOGGLE") {
    if (msg.enabled) {
      console.log("State changed:", msg.enabled);
      enableBlocking();
    } else {
      disableBlocking();
    }
  }
  return true;
});

chrome.runtime.onMessage.addListener((message, sender) => {
  if (message.type === "AD_DETECTED") {
    const tabId = (sender as chrome.runtime.MessageSender).tab?.id;

    if (tabId) {
      if (!tabAds[tabId]) {
        tabAds[tabId] = [];
      }

      // remove duplicates
      if (!tabAds[tabId].some(ad => ad.src === message.payload.src)) {
        tabAds[tabId].push(message.payload);
      }
    }
  }
});

// listens from popup.tsx
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "GET_ADS") {
    sendResponse(tabAds);
  }
});