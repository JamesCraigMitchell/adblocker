const getEl = document.getElementById("getCount");
const headEl = document.getElementById("headCount");
const postEl = document.getElementById("postCount");
const resetBtn = document.getElementById("resetBtn");

function updateCounts() {
  browser.runtime.sendMessage({ type: "getBlockedCounts" })
    .then(counts => {
      getEl.textContent = counts.GET;
      headEl.textContent = counts.HEAD;
      postEl.textContent = counts.POST;
    });
}

// Update every second
setInterval(updateCounts, 1000);

// Reset button
resetBtn.addEventListener("click", () => {
  browser.runtime.sendMessage({ type: "resetCounts" })
    .then(() => updateCounts());
});

// Initial update
updateCounts();
