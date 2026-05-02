export const TRACKING_DOMAINS = {
  advertising: [
    "googlesyndication.com",
    "doubleclick.net",
    "adnxs.com",
    "googleadservices.com",
    "bidr.co",
    "bluekai.com",
    "rubiconproject.com",
    "casalemedia.com",
    "crwdcntrl.net",
    "tremorhub.com",
    "amazon-adsystem.com",
    "contextweb.com"
  ],
  analytics: [
    "google-analytics.com",
    "demdex.net",
    "clarity.ms",
    "optimizely.com",
    "clicktale.net",
    "newrelic.com"
  ],
  social_media: [
    "facebook.com",
    "twitter.com",
    "linkedin.com",
    "youtube.com",
    "pinterest.com"
  ],
  third_party: [
    "hubspot.com",
    "cloudfront.net",
    "googletagmanager.com"
  ]
};


export function isDomainPresentinCategory(domain: string, category: keyof typeof TRACKING_DOMAINS): boolean {
  return TRACKING_DOMAINS[category].some(trackingDomain => domain.includes(trackingDomain));
}