import { RULES } from "../utils/rules";

type Ad = {
  src: string;
  tag: string;
};

type TabAds = {
  [tabId: number]: Ad[];
};

type BlockedAdRule = {
  ruleId: number;
  rule: chrome.declarativeNetRequest.MatchedRule;
  requests: Set<string>; // Using Set to avoid duplicates (store hostnames)
  count: number;
}

const tabAds: TabAds = {};
const blockedRules: BlockedAdRule[] = []

chrome.declarativeNetRequest.onRuleMatchedDebug.addListener((info) => {
  console.log("Request blocked/matched:", info.request.url);
  console.log("Matched Rule ID:", info.rule.ruleId);
  if (blockedRules.some(r => r.ruleId === info.rule.ruleId)) {
    const existingRule = blockedRules.find(r => r.ruleId === info.rule.ruleId);
    if (existingRule && URL.canParse(info.request.url)) {
      // get the hostname from the URL and add to the set of requests for this rule
      const url = new URL(info.request.url).hostname;
      existingRule.requests.add(url);
      existingRule.count = existingRule.requests.size;
    }
  } else if (URL.canParse(info.request.url)) {
    blockedRules.push({
      ruleId: info.rule.ruleId,
      rule: info.rule,
      requests: new Set([new URL(info.request.url).hostname]),
      count: 1
    });
  }
});

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

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // listens from popup.tsx and sends detected ads for active tab
  if (message.type === "GET_ADS") {
    sendResponse(tabAds);
  }

  // listens from popup.tsx and sends blocked rules
  if (message.type === "GET_BLOCKED_ADS_RULES") {
    sendResponse(blockedRules);
  }
});
