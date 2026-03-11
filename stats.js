// stats.js - Modern Analytics
const totalEl = document.getElementById("total");
const breaksEl = document.getElementById("breaks");
const streakEl = document.getElementById("streak");
const wellnessBar = document.getElementById("wellnessBar");
const wellnessText = document.getElementById("wellnessText");

function updateStats() {
  chrome.storage.sync.get(["totalReminders", "breaksTaken", "streakCount"], data => {
    const total = data.totalReminders || 0;
    const breaks = data.breaksTaken || 0;
    const streaks = data.streakCount || 0;
    
    totalEl.textContent = total;
    breaksEl.textContent = breaks;
    streakEl.textContent = streaks;

    // Simple Wellness Score calculation
    let score = 0;
    if (total > 0) {
      score = Math.min(100, Math.round((breaks / total) * 100));
    } else if (breaks > 0) {
      score = 100;
    }
    
    wellnessBar.style.width = score + "%";
    wellnessText.textContent = `${score}% Consistency Score`;
  });
}

setInterval(updateStats, 2000);
updateStats();
