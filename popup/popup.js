// popup.js - v3.1 Compact Popup with Hydration
const timerEl = document.getElementById("timer");
const timerLabelEl = document.getElementById("timerLabel");
const ambientSelect = document.getElementById("ambientSelect");
const phaseDisplay = document.getElementById("phaseDisplay");
const waterCount = document.getElementById("waterCount");
const addWaterBtn = document.getElementById("addWaterBtn");

const startPauseBtn = document.getElementById("startPauseBtn");
const startPauseBtnText = document.getElementById("startPauseBtnText");
const startPauseIcon = document.getElementById("startPauseIcon");
const resetBtn = document.getElementById("resetBtn");
const optionsBtn = document.getElementById("optionsBtn");
const optionsBtnHeader = document.getElementById("optionsBtnHeader");
const statsBtn = document.getElementById("statsBtn");
const timerBtn = document.getElementById("timerBtn");
const timerProgress = document.getElementById("timerProgress");
const timerCircle = document.getElementById("timerCircle");

// Focus Mode toggle
const focusModeToggle = document.getElementById("focusModeToggle");
const focusToggleTrack = document.getElementById("focusToggleTrack");
const focusToggleThumb = document.getElementById("focusToggleThumb");

const CIRCLE_CIRCUMFERENCE = 502.65;

let sessionState = "idle";
let pausedRemainingMs = null;
let lastPhase = null;

function updateFocusToggleVisual(enabled) {
  if (!focusToggleTrack || !focusToggleThumb) return;
  if (enabled) {
    focusToggleTrack.style.background = "var(--brand-lime)";
    focusToggleTrack.style.borderColor = "var(--brand-lime)";
    focusToggleThumb.style.left = "19px";
    focusToggleThumb.style.background = "#002719";
  } else {
    focusToggleTrack.style.background = "var(--surface)";
    focusToggleTrack.style.borderColor = "var(--border)";
    focusToggleThumb.style.left = "3px";
    focusToggleThumb.style.background = "var(--text-muted)";
  }
}

// Focus Mode toggle handler
if (focusModeToggle) {
  chrome.storage.sync.get(["focusModeEnabled"], data => {
    focusModeToggle.checked = !!data.focusModeEnabled;
    updateFocusToggleVisual(!!data.focusModeEnabled);
  });
  focusModeToggle.addEventListener("change", () => {
    const enabled = focusModeToggle.checked;
    updateFocusToggleVisual(enabled);
    chrome.storage.sync.set({ focusModeEnabled: enabled }, () => {
      chrome.runtime.sendMessage({ action: "updateSettings" }).catch(() => {});
    });
  });
}

// Water button
if (addWaterBtn) {
  addWaterBtn.addEventListener("click", () => {
    chrome.runtime.sendMessage({ action: "addWater" }, (resp) => {
      if (resp && waterCount) waterCount.textContent = resp.waterIntake;
    });
  });
  // Hover effect
  addWaterBtn.addEventListener("mouseenter", () => {
    addWaterBtn.style.background = "var(--brand-lime)";
    addWaterBtn.style.color = "#002719";
    addWaterBtn.style.borderColor = "var(--brand-lime)";
  });
  addWaterBtn.addEventListener("mouseleave", () => {
    addWaterBtn.style.background = "var(--surface)";
    addWaterBtn.style.color = "var(--text)";
    addWaterBtn.style.borderColor = "var(--border)";
  });
}

// Load custom ambient sounds into popup dropdown
function loadCustomAmbientSounds() {
  chrome.storage.local.get(["customSounds"], data => {
    const sounds = data.customSounds || {};
    // Remove existing custom options
    if (ambientSelect) {
      ambientSelect.querySelectorAll("option[data-custom]").forEach(o => o.remove());
      Object.entries(sounds).forEach(([name, info]) => {
        const category = (typeof info === "object" && info.category) ? info.category : "alert";
        if (category === "ambient") {
          const opt = document.createElement("option");
          opt.value = `custom:${name}`;
          opt.textContent = name.length > 20 ? name.substring(0, 20) + "..." : name;
          opt.setAttribute("data-custom", "true");
          ambientSelect.appendChild(opt);
        }
      });
    }
  });
}

function loadFolderSounds(folderName, selectId) {
  const selectEl = document.getElementById(selectId);
  if (!selectEl) return;
  
  if (chrome.runtime.getPackageDirectoryEntry) {
    chrome.runtime.getPackageDirectoryEntry((root) => {
      root.getDirectory("sounds/" + folderName, {create: false}, (dirEntry) => {
        const dirReader = dirEntry.createReader();
        let entries = [];
        const readEntries = () => {
          dirReader.readEntries((results) => {
            if (!results.length) {
              Array.from(selectEl.options).forEach(opt => {
                if(opt.value !== "none" && !opt.hasAttribute("data-custom")) opt.remove();
              });
              entries.filter(e => e.isFile && (e.name.endsWith(".mp3") || e.name.endsWith(".wav"))).forEach(file => {
                const name = file.name.replace(/\.[^.]+$/, "");
                const opt = document.createElement("option");
                opt.value = `${folderName}/${name}`;
                let displayName = name.length > 20 ? name.substring(0, 20) + "..." : name;
                opt.textContent = displayName;
                const firstCustom = selectEl.querySelector('option[data-custom]');
                if (firstCustom) selectEl.insertBefore(opt, firstCustom);
                else selectEl.appendChild(opt);
              });
              chrome.storage.sync.get(["ambientNoise"], data => {
                requestAnimationFrame(() => {
                  let mappedVal = null;
                  if (selectId === "ambientSelect") {
                    mappedVal = data.ambientNoise || "none";
                    if (mappedVal === "lofi") mappedVal = "ambient/lofi";
                    if (mappedVal === "rain") mappedVal = "ambient/rain";
                    if (mappedVal === "cafe") mappedVal = "ambient/cafe";
                  }
                  if (mappedVal) selectEl.value = mappedVal;
                  
                  if (selectEl.selectedIndex === -1 && selectEl.options.length > 0) {
                     selectEl.selectedIndex = 0;
                  }
                });
              });
            } else {
              entries = entries.concat(Array.from(results));
              readEntries();
            }
          }, () => {});
        };
        readEntries();
      }, () => {});
    });
  }
}

function refreshSessionState(callback) {
  chrome.runtime.sendMessage({ action: "getSessionState" }, (resp) => {
    if (chrome.runtime.lastError || !resp) {
      chrome.runtime.sendMessage({ action: "getPaused" }, (presp) => {
        if (presp && presp.pausedRemainingMs !== null && presp.pausedRemainingMs !== undefined) {
          sessionState = "paused";
          pausedRemainingMs = presp.pausedRemainingMs;
        } else {
          chrome.alarms.get("breakReminder", (alarm) => {
            sessionState = alarm ? "running" : "idle";
            updateButtonState();
            if (callback) callback();
          });
          return;
        }
        updateButtonState();
        if (callback) callback();
      });
      return;
    }
    sessionState = resp.state || "idle";
    pausedRemainingMs = resp.pausedRemainingMs || null;
    updateButtonState();
    if (callback) callback();
  });
}

function updateButtonState() {
  if (sessionState === "idle") {
    startPauseBtnText.textContent = "Start";
    startPauseIcon.textContent = "play_arrow";
    startPauseBtn.classList.remove("secondary");
    if (resetBtn) resetBtn.style.display = "none";
  } else if (sessionState === "running") {
    startPauseBtnText.textContent = "Pause";
    startPauseIcon.textContent = "pause";
    startPauseBtn.classList.remove("secondary");
    if (resetBtn) resetBtn.style.display = "";
  } else if (sessionState === "paused") {
    startPauseBtnText.textContent = "Resume";
    startPauseIcon.textContent = "play_arrow";
    startPauseBtn.classList.add("secondary");
    if (resetBtn) resetBtn.style.display = "";
  }
}

function updateUI() {
  chrome.storage.sync.get(["mode", "focusModeEnabled", "ambientNoise", "soundsEnabled", "pomodoroWork", "waterIntake"], (data) => {
    // Water count
    if (waterCount) waterCount.textContent = data.waterIntake || 0;

    // Timer
    if (sessionState === "paused") {
      if (pausedRemainingMs !== null) {
        const minutes = Math.floor(pausedRemainingMs / 60000);
        const seconds = Math.floor((pausedRemainingMs % 60000) / 1000);
        timerEl.textContent = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
        timerLabelEl.textContent = "Paused";
        if (phaseDisplay) phaseDisplay.textContent = "⏸ Paused";
        chrome.storage.local.get(["lastAlarmDurationMin"], ldata => {
          const total = (ldata.lastAlarmDurationMin || 25) * 60000;
          const filled = 1 - pausedRemainingMs / total;
          timerProgress.style.strokeDashoffset = CIRCLE_CIRCUMFERENCE * (1 - filled);
        });
        if (timerCircle) timerCircle.classList.add("timer-pulsing");
      }
    } else if (sessionState === "idle") {
      timerEl.textContent = "--:--";
      timerLabelEl.textContent = "Ready to focus";
      if (phaseDisplay) phaseDisplay.textContent = "";
      timerProgress.style.strokeDashoffset = CIRCLE_CIRCUMFERENCE;
      if (timerCircle) timerCircle.classList.remove("timer-pulsing");
    } else {
      if (timerCircle) timerCircle.classList.remove("timer-pulsing");
      chrome.alarms.get("breakReminder", (alarm) => {
        if (alarm && alarm.scheduledTime) {
          const remaining = Math.max(0, alarm.scheduledTime - Date.now());
          const minutes = Math.floor(remaining / 60000);
          const seconds = Math.floor((remaining % 60000) / 1000);
          timerEl.textContent = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

          chrome.storage.local.get(["lastAlarmDurationMin"], ldata => {
            const total = (ldata.lastAlarmDurationMin || 25) * 60000;
            const filled = 1 - remaining / total;
            timerProgress.style.strokeDashoffset = CIRCLE_CIRCUMFERENCE * (1 - filled);
          });

          if (remaining < 60000 && timerCircle) {
            timerCircle.classList.add("timer-pulsing");
          }

          chrome.runtime.sendMessage({ action: "getPhase" }, (resp) => {
            const phase = resp ? resp.phase : "Work";
            timerLabelEl.textContent = phase === "Work" ? "Deep Work" : "Break";
            if (phaseDisplay) phaseDisplay.textContent = phase === "Work" ? "Deep Work Phase" : "Break Phase";
            if (phase !== lastPhase) {
              lastPhase = phase;
              if (phase === "Break") {
                document.body.classList.add("break-phase");
              } else {
                document.body.classList.remove("break-phase");
              }
            }
          });
        } else {
          sessionState = "idle";
          updateButtonState();
          timerEl.textContent = "--:--";
          timerLabelEl.textContent = "Ready to focus";
          if (phaseDisplay) phaseDisplay.textContent = "";
          timerProgress.style.strokeDashoffset = CIRCLE_CIRCUMFERENCE;
        }
      });
    }

    // Sound card
    const soundsEnabled = data.soundsEnabled !== false;
    const soundCard = document.getElementById("soundCard");
    if (soundCard) soundCard.classList.toggle("hidden", !soundsEnabled);
    if (ambientSelect) ambientSelect.value = data.ambientNoise || "none";
  });
}

// Start / Pause / Resume
startPauseBtn.addEventListener("click", () => {
  if (sessionState === "idle") {
    chrome.runtime.sendMessage({ action: "startSession" }, () => {
      sessionState = "running";
      updateButtonState();
      setTimeout(updateUI, 300);
    });
  } else if (sessionState === "running") {
    chrome.runtime.sendMessage({ action: "pause" }, (resp) => {
      sessionState = "paused";
      pausedRemainingMs = resp ? resp.pausedRemainingMs : null;
      updateButtonState();
      updateUI();
    });
  } else if (sessionState === "paused") {
    chrome.runtime.sendMessage({ action: "resume" }, () => {
      sessionState = "running";
      pausedRemainingMs = null;
      updateButtonState();
      document.body.classList.remove("break-phase");
      setTimeout(updateUI, 300);
    });
  }
});

// Reset button — stop session entirely
if (resetBtn) {
  resetBtn.addEventListener("click", () => {
    chrome.runtime.sendMessage({ action: "stopSession" }, () => {
      sessionState = "idle";
      pausedRemainingMs = null;
      updateButtonState();
      updateUI();
    });
  });
}

// Ambient select
if (ambientSelect) {
  ambientSelect.addEventListener("change", () => {
    chrome.storage.sync.set({ ambientNoise: ambientSelect.value });
    chrome.runtime.sendMessage({ action: "updateSettings" }).catch(() => {});
  });
}

// Helper: open or reuse a tab
function openOrReuseTab(pageFile, fallbackAction) {
  const targetUrl = chrome.runtime.getURL(pageFile);
  chrome.tabs.query({}, tabs => {
    const existing = tabs.find(t => t.url && t.url.startsWith(targetUrl));
    if (existing) {
      chrome.tabs.update(existing.id, { active: true });
      chrome.windows.update(existing.windowId, { focused: true });
    } else if (fallbackAction) {
      fallbackAction();
    } else {
      chrome.tabs.create({ url: targetUrl });
    }
  });
}

if (optionsBtn) optionsBtn.addEventListener("click", () => openOrReuseTab("options/options.html", () => chrome.runtime.openOptionsPage()));
if (optionsBtnHeader) optionsBtnHeader.addEventListener("click", () => openOrReuseTab("options/options.html", () => chrome.runtime.openOptionsPage()));

if (statsBtn) statsBtn.addEventListener("click", () => openOrReuseTab("pages/stats.html"));

if (timerBtn) timerBtn.addEventListener("click", () => openOrReuseTab("pages/timer.html", () => chrome.tabs.create({ url: chrome.runtime.getURL("pages/timer.html") })));

// Init
loadFolderSounds("ambient", "ambientSelect");
loadCustomAmbientSounds();
refreshSessionState(updateUI);
setInterval(() => { refreshSessionState(updateUI); }, 1000);
