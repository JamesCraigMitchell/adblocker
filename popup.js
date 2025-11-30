const getEl = document.getElementById("get-count");
const headEl = document.getElementById("head-count");
const postEl = document.getElementById("post-count");

function updateCounts() {
  browser.runtime.sendMessage({ type: "getBlockedCounts" })
    .then(counts => {
      getEl.textContent = counts.GET;
      headEl.textContent = counts.HEAD;
      postEl.textContent = counts.POST;
    });
}

// Refresh button
document.getElementById("refresh").addEventListener("click", updateCounts);

// Reset button
document.getElementById("reset").addEventListener("click", () => {
  browser.runtime.sendMessage({ type: "resetCounts" })
    .then(() => updateCounts());
});

// Update when popup opens
updateCounts();
