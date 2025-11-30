// Function to update the counts in the HTML
function updateCounts(counts) {
    const getHeadCount = counts.GET + counts.HEAD;
    const postCount = counts.POST;
    const totalCount = getHeadCount + postCount;
    
    // Update display elements
    document.getElementById('getHeadCount').textContent = getHeadCount;
    document.getElementById('postCount').textContent = postCount;
    document.getElementById('totalCount').textContent = totalCount;
}

// Function to fetch the counts from the background script
function fetchCounts() {
    // Send a message to background.js requesting the blocked counts
    browser.runtime.sendMessage({ type: "getBlockedCounts" })
        .then(response => {
            if (response) {
                updateCounts(response);
            }
        })
        .catch(error => {
            console.error("Error fetching counts:", error);
        });
}

// Event listener for the Reset button
document.getElementById('resetBtn').addEventListener('click', () => {
    // Send a message to background.js to reset the counters
    browser.runtime.sendMessage({ type: "resetCounts" })
        .then(response => {
            if (response && response.status === "reset") {
                // Update the display immediately after a successful reset
                updateCounts({ GET: 0, HEAD: 0, POST: 0 });
                console.log("Counts reset successfully.");
            }
        })
        .catch(error => {
            console.error("Error resetting counts:", error);
        });
});

// Fetch counts when the popup is opened
fetchCounts();