// Counts
let counts = { GET: 0, HEAD: 0, POST: 0 };

// Blocklists
let getHeadBlocklist = [];
let postBlocklist = [];

// Load local blocklist
fetch(browser.runtime.getURL("blocklist.json"))
  .then(res => res.json())
  .then(data => {
    getHeadBlocklist = data.GET || [];
    postBlocklist = data.POST || [];
    console.log("Local blocklist loaded:", getHeadBlocklist, postBlocklist);
  })
  .catch(err => console.error("Failed to load local blocklist:", err));

// Listen for requests
browser.webRequest.onBeforeRequest.addListener(
  (details) => {
    const url = details.url;
    const method = details.method;

    if ((method === "GET" || method === "HEAD") &&
        getHeadBlocklist.some(domain => url.includes(domain))) {
      counts[method]++;
      console.log(`Blocked ${method}: ${url}, count: ${counts[method]}`);
      return { cancel: true };
    }

    if (method === "POST" &&
        postBlocklist.some(domain => url.includes(domain))) {
      counts.POST++;
      console.log(`Blocked POST: ${url}, count: ${counts.POST}`);
      return { cancel: true };
    }

    // Log for intercepted requests
    console.log("Intercepted:", method, url);
  },
  { urls: ["<all_urls>"] },
  ["blocking"]
);

// Popup communication
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "getBlockedCounts") {
    sendResponse(counts);
  } else if (message.type === "resetCounts") {
    counts = { GET: 0, HEAD: 0, POST: 0 };
    sendResponse({ status: "reset" });
  }
});
