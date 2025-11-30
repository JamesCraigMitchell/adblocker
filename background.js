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
    console.log("Starting EasyList parsing with refined logic...");
    const lines = text.split('\n');
    const newBlocklist = [];

    for (const line of lines) {
        const trimmed = line.trim();
        
        // 1. Skip comments, headers, and element hiding rules
        if (!trimmed || trimmed.startsWith('!') || trimmed.startsWith('[') || trimmed.startsWith('##')) {
            continue;
        }

        let rawRule = trimmed;
        
        // --- STEP 1: STRIP OPTIONS ---
        // Most rules have options ($script, $third-party) which break simple parsers.
        // We strip them to treat all rules as general domain blocks for maximum coverage.
        if (rawRule.includes('$')) {
            rawRule = rawRule.substring(0, rawRule.indexOf('$'));
        }
        
        // 2. Focus on basic network blocking rules starting with || or |
        if (!rawRule.startsWith('||') && !rawRule.startsWith('|')) {
            continue;
        }

        // 3. Prepare the rule by removing leading markers
        let ruleBody = rawRule.replace(/^\|\|/, '').replace(/^\|/, '');
        
        // --- STEP 2: ROBUST REGEX ESCAPING ---
        
        // Escape all regex special characters in the rule body first
        let regexRule = ruleBody.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        // Convert ABP wildcard (*) and separator (^) to RegEx syntax
        
        // Convert * to RegEx .* (match zero or more characters)
        regexRule = regexRule.replace(/\\\*/g, '.*'); 
        
        // Convert separator ^ to RegEx (match non-alphanumeric character, end of string, or end of rule)
        // This is a complex but necessary part of ABP syntax compliance
        regexRule = regexRule.replace(/\\\^/g, '($|[^\\w\\d\\-_\\.%\u0080-\uFFFF])');

        // 4. Final rule construction based on the leading marker:
        const isDomainRule = rawRule.startsWith('||');

        try {
            if (isDomainRule) {
                 // ||domain.com^ -> Start of URL (http/s), optional subdomain, then the rule
                 newBlocklist.push(new RegExp(`^https?://([^/]*\\.)?${regexRule}`, 'i'));
            } else {
                 // |http://domain.com/path -> Exact start of the URL
                 newBlocklist.push(new RegExp(`^${regexRule}`, 'i'));
            }
        } catch (e) {
            console.warn('Skipping invalid RegEx:', ruleBody, e);
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