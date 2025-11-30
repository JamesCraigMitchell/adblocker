const countEl = document.getElementById("count");
const refreshBtn = document.getElementById("refresh");

function updateCount() {
  browser.runtime.sendMessage({ type: "getBlockedCount" }).then(response => {
    countEl.textContent = response.count;
  });
}

// Update when popup opens
updateCount();

// Update manually via button
refreshBtn.addEventListener("click", updateCount);
