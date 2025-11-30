// Counters
let counts = { GET: 0, HEAD: 0, POST: 0 };

// Blocklists
const getHeadBlocklist = ["doubleclick.net", "ads.example.com"];
const postBlocklist = []

// Load local blocklist
fetch(browser.runtime.getURL("blocklist.json"))
  .then(res => res.json())
  .then(data => {
    getHeadBlocklist = data.GET || [];
    postBlocklist = data.POST || [];
    console.log("Local blocklist loaded:", getHeadBlocklist, postBlocklist);
  })
  .catch(err => console.error("Failed to load local blocklist:", err));

browser.webRequest.onBeforeRequest.addListener(
  (details) => {
    console.log("Intercepted request:", details.method, details.url); 
    const url = details.url;
    const method = details.method

    if ((method === "GET" || method === "HEAD") &&
        getHeadBlocklist.some(domain => url.includes(domain))) {
      counts[method]++;
      console.log(`Blocked ${method}: ${url}, new count: ${counts[method]}`);
      return { cancel: true };
    }

    if (method === "POST" &&
        postBlocklist.some(domain => url.includes(domain))) {
      counts.POST++;
      console.log(`Blocked POST: ${url}, new count: ${counts.POST}`);
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