import { TRACKING_DOMAINS } from "./domains";

export const RULES = [
  {
    "id": 1, // Block requests to known ads domains
    "priority": 1,
    "action": { "type": "block" },
    "condition": {
      "requestDomains": [
        TRACKING_DOMAINS.advertising,
      ].flat(),
      "resourceTypes": ["script", "image", "xmlhttprequest", "sub_frame"]
    }
  },
  {
    "id": 2, // Detect change in cookies from tracking domains
    "priority": 1,
    "action": {
      "type": "modifyHeaders",
      "requestHeaders": [{ "header": "cookie", "operation": "remove" }],
      "responseHeaders": [{ "header": "set-cookie", "operation": "remove" }]
    },
    "condition": {
      "requestDomains": [
        TRACKING_DOMAINS.advertising,
        TRACKING_DOMAINS.analytics,
        TRACKING_DOMAINS.social_media,
        TRACKING_DOMAINS.third_party
      ].flat(),
      "resourceTypes": ["main_frame", "sub_frame", "script", "xmlhttprequest"]
    }
  },
  // {
  //   "id": 3,
  //   "priority": 1,
  //   "action": { "type": "block" },
  //   "condition": {
  //     "urlFilter": "||google-analytics.com",
  //     "resourceTypes": ["script", "xmlhttprequest"]
  //   }
  // }
]
