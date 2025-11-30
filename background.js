// Counter for blocked ads
let blockedCount = 0;

// Hard-coded example: block requests containing "ads"
const blocklist = ["doubleclick.net", "ads.google.com"];

browser.webRequest.onBeforeRequest.addListener(
  (details) => {
    const url = details.url;
    if (blocklist.some(blocked => url.includes(blocked))) {
      blockedCount++;
      console.log("Blocked:", url);
      return { cancel: true };
    }
  },
  { urls: ["<all_urls>"] },
  ["blocking"]
);

// Respond to popup messages
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "getBlockedCount") {
    sendResponse({ count: blockedCount });
  }
});

console.log("working")