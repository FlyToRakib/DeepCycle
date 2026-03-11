// popup.js - Modern UI Logic
const timerEl = document.getElementById("timer");
const timerLabelEl = document.getElementById("timerLabel");
const pomodoroCard = document.getElementById("pomodoroCard");
const streakEl = document.getElementById("streak");
const phaseEl = document.getElementById("phase");

const pauseBtn = document.getElementById("pauseBtn");
const pauseBtnText = document.getElementById("pauseBtnText");
const optionsBtn = document.getElementById("optionsBtn");
const statsBtn = document.getElementById("statsBtn");

let paused = false;
let pausedRemainingMs = null;

function refreshPausedState(callback) {
  chrome.runtime.sendMessage({ action: "getPaused" }, (resp) => {
    if (resp && typeof resp.pausedRemainingMs !== "undefined" && resp.pausedRemainingMs !== null) {
      pausedRemainingMs = resp.pausedRemainingMs;
      paused = true;
      pauseBtnText.textContent = "Resume";
      pauseBtn.classList.add("secondary");
    } else {
      pausedRemainingMs = null;
      paused = false;
      pauseBtnText.textContent = "Pause";
      pauseBtn.classList.remove("secondary");
    }
    if (callback) callback();
  });
}

function updateTimer() {
  if (paused) {
    if (pausedRemainingMs !== null) {
      const minutes = Math.floor(pausedRemainingMs / 60000);
      const seconds = Math.floor((pausedRemainingMs % 60000) / 1000);
      timerEl.textContent = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
      timerLabelEl.textContent = "Paused";
      // Decrement locally for UI smoothness
      pausedRemainingMs = Math.max(0, pausedRemainingMs - 1000);
    }
  } else {
    chrome.alarms.get("breakReminder", (alarm) => {
      if (alarm && alarm.scheduledTime) {
        const remaining = Math.max(0, alarm.scheduledTime - Date.now());
        const minutes = Math.floor(remaining / 60000);
        const seconds = Math.floor((remaining % 60000) / 1000);
        timerEl.textContent = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
        
        chrome.storage.sync.get(["mode"], (data) => {
          if (data.mode === "pomodoro") {
            chrome.runtime.sendMessage({ action: "getPhase" }, (resp) => {
              timerLabelEl.textContent = `${resp.phase || "Work"} Phase`;
            });
          } else {
            timerLabelEl.textContent = "Next Break";
          }
        });
      } else {
        timerEl.textContent = "--:--";
        timerLabelEl.textContent = "IDLE";
      }
    });
  }

  // Update Pomodoro Stats Card
  chrome.storage.sync.get(["mode", "streakCount"], (data) => {
    if (data.mode === "pomodoro") {
      pomodoroCard.classList.remove("hidden");
      streakEl.textContent = data.streakCount || 0;
      chrome.runtime.sendMessage({ action: "getPhase" }, (resp) => {
        phaseEl.textContent = resp.phase || "--";
      });
    } else {
      pomodoroCard.classList.add("hidden");
    }
  });
}

// Pause/Resume Logic
pauseBtn.addEventListener("click", () => {
  if (!paused) {
    chrome.runtime.sendMessage({ action: "pause" }, (resp) => {
      paused = true;
      pausedRemainingMs = resp.pausedRemainingMs;
      pauseBtnText.textContent = "Resume";
      pauseBtn.classList.add("secondary");
      updateTimer();
    });
  } else {
    chrome.runtime.sendMessage({ action: "resume" }, () => {
      paused = false;
      pausedRemainingMs = null;
      pauseBtnText.textContent = "Pause";
      pauseBtn.classList.remove("secondary");
      setTimeout(updateTimer, 300);
    });
  }
});

optionsBtn.addEventListener("click", () => chrome.runtime.openOptionsPage());
statsBtn.addEventListener("click", () => chrome.tabs.create({ url: "stats.html" }));

// Start
refreshPausedState(updateTimer);
setInterval(updateTimer, 1000);
