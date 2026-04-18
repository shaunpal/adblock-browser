import { RULES } from "../utils/rules";

async function enableBlocking() {
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: RULES.map(r => r.id),
    addRules: RULES as chrome.declarativeNetRequest.Rule[]
  });

  await chrome.storage.local.set({ enabled: true });
  console.log("Ad blocking ENABLED");
}

async function disableBlocking() {
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: RULES.map(r => r.id)
  });

  await chrome.storage.local.set({ enabled: false });
  console.log("Ad blocking DISABLED");
}

// Listen for toggle from UI
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "TOGGLE") {
    if (msg.enabled) enableBlocking();
    else disableBlocking();
  }
});