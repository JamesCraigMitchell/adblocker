// Blocklists
const getHeadBlocklist = ["doubleclick.net", "ads.example.com"];
const postBlocklist = ["tracking.example.com"]

// Counters
let counts = { GET: 0, HEAD: 0, POST: 0 };

browser.webRequest.onBeforeRequest.addListener(
  (details) => {
    const url = details.url;
    const method = details.method

    if ((method === "GET" || method === "HEAD") &&
        getHeadBlocklist.some(domain => url.includes(domain))) {
      counts[method]++;
      console.log(`Blocked ${method}: ${url}`);
      return { cancel: true };
    }

    if (method === "POST" &&
        postBlocklist.some(domain => url.includes(domain))) {
      counts.POST++;
      console.log(`Blocked POST: ${url}`);
      return { cancel: true };
    }
  },

  { urls: ["<all_urls>"] },
  ["blocking"]
);

// Respond to popup messages
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "getBlockedCounts") {
    sendResponse(counts);
  } else if (message.type === "resetCounts") {
    counts = { GET: 0, HEAD: 0, POST: 0 };
    sendResponse({ status: "reset" });
  }
});