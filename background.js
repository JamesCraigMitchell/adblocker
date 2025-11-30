// --- CONFIGURATION ---
const EASYLIST_URL = "https://easylist-downloads.adblockplus.org/easylist.txt";
const STORAGE_KEY = 'easylist_blocking_rules';

// --- STATE ---
let counts = { GET: 0, HEAD: 0, POST: 0 };
let blocklist = []; // This will hold the compiled RegExp objects

// --- BLOCKLIST MANAGEMENT FUNCTIONS ---

/**
 * Parses the raw EasyList text into an array of RegExp objects
 * for network request blocking.
 */
function parseEasyList(text) {
    console.log("Starting EasyList parsing...");
    const lines = text.split('\n');
    const newBlocklist = [];

    for (const line of lines) {
        const trimmed = line.trim();
        
        // 1. Skip comments, headers, and element hiding rules
        if (!trimmed || trimmed.startsWith('!') || trimmed.startsWith('[') || trimmed.startsWith('##')) {
            continue;
        }
        
        // 2. Focus on basic network blocking rules starting with || or |
        if (!trimmed.startsWith('||') && !trimmed.startsWith('|')) {
            // For simplicity, we skip path-only rules (e.g., /ads/...) for now,
            // as they require checking additional contexts (like resource type).
            continue; 
        }

        // 3. Prepare the raw rule by removing leading markers
        let rawRule = trimmed.replace(/^\|\|/, '').replace(/^\|/, '');
        
        // 4. Escape all regex special characters in the rule first
        // We use a helper function to ensure safety
        let regexRule = rawRule.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        // 5. Convert ABP wildcard (*) and separator (^) to RegEx syntax
        
        // Convert * to RegEx .* (match zero or more characters)
        regexRule = regexRule.replace(/\\\*/g, '.*'); 
        
        // Convert separator ^ to RegEx (match non-alphanumeric character, end of string, or end of rule)
        regexRule = regexRule.replace(/\\\^/g, '($|[^\\w\\d\\-_\\.%\u0080-\uFFFF])');

        // 6. Final rule construction based on the leading marker:
        if (trimmed.startsWith('||')) {
            // ||domain.com^ -> Start of URL (http/s), optional subdomain, then the rule
            // The 'i' flag makes it case-insensitive
            try {
                 newBlocklist.push(new RegExp(`^https?://([^/]*\\.)?${regexRule}`, 'i'));
            } catch (e) {
                console.warn('Skipping invalid RegEx (||):', trimmed, e);
            }
        } else if (trimmed.startsWith('|')) {
             // |http://domain.com/path -> Exact start of the URL
            try {
                 newBlocklist.push(new RegExp(`^${regexRule}`, 'i'));
            } catch (e) {
                console.warn('Skipping invalid RegEx (|):', trimmed, e);
            }
        }
    }
    
    return newBlocklist;
}

/**
 * Fetches EasyList remotely, parses it, and saves it to storage.
 */
async function fetchAndParseEasyList() {
    console.log("Attempting to fetch EasyList...");

    try {
        const response = await fetch(EASYLIST_URL);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const text = await response.text();

        const newBlocklist = parseEasyList(text);
        
        console.log(`EasyList parsed. Found ${newBlocklist.length} network blocking rules.`);
        
        // Save the RegEx sources (strings) to persistent storage
        await browser.storage.local.set({ [STORAGE_KEY]: newBlocklist.map(r => r.source) });
        blocklist = newBlocklist;
        
    } catch (error) {
        console.error("Error loading or parsing EasyList, falling back to stored list:", error);
        await loadBlocklistFromStorage(); // Fallback
    }
}

/**
 * Loads the blocklist from persistent storage and converts strings back to RegEx objects.
 */
async function loadBlocklistFromStorage() {
    const data = await browser.storage.local.get(STORAGE_KEY);
    if (data[STORAGE_KEY] && data[STORAGE_KEY].length > 0) {
        // Re-create RegExp objects from stored strings
        blocklist = data[STORAGE_KEY].map(r => new RegExp(r, 'i'));
        console.log(`Blocklist loaded from storage: ${blocklist.length} rules.`);
    } else {
        console.log("No blocklist found in storage, initiating remote fetch.");
    }
}


// --- INITIALIZATION AND SCHEDULING ---

// 1. Load from storage first for fast startup
loadBlocklistFromStorage();

// 2. Fetch/update remotely after a short delay (e.g., 5 seconds)
// In a production extension, this would typically run daily or weekly.
setTimeout(fetchAndParseEasyList, 5000); 


// --- WEB REQUEST LISTENER ---

/**
 * Listener function executed before any request is made.
 */
browser.webRequest.onBeforeRequest.addListener(
    (details) => {
        const url = details.url;
        const method = details.method;

        // Check if the URL matches any rule in the compiled blocklist
        const isBlocked = blocklist.some(rule => rule.test(url));

        if (isBlocked) {
            // Update counts for all blocked requests
            counts[method] = (counts[method] || 0) + 1;
            
            // console.log(`Blocked ${method}: ${url}, count: ${counts[method]}`);
            return { cancel: true }; // Cancel the request
        }
    },
    // Filter: intercept all URLs
    { urls: ["<all_urls>"] }, 
    // Extra Info Spec: 'blocking' is required to cancel the request
    ["blocking"]
);


// --- POPUP COMMUNICATION ---

/**
 * Handles messages sent from the popup (popup.js).
 */
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "getBlockedCounts") {
        // Send the current counts object back to the popup
        sendResponse(counts);
    } else if (message.type === "resetCounts") {
        // Reset the counts object
        counts = { GET: 0, HEAD: 0, POST: 0 };
        sendResponse({ status: "reset" });
    }
});