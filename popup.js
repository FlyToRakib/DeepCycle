// popup.js - v2.0 Pomodoro Only
const timerEl = document.getElementById("timer");
const timerLabelEl = document.getElementById("timerLabel");
const pomodoroCard = document.getElementById("pomodoroCard");
const streakEl = document.getElementById("streak");
const phaseEl = document.getElementById("phase");
const waterText = document.getElementById("waterText");
const focusStatus = document.getElementById("focusStatus");
const plantSvg = document.getElementById("plantSvg");
const plantStatus = document.getElementById("plantStatus");
const plantStageLabel = document.getElementById("plantStageLabel");
const ambientSelect = document.getElementById("ambientSelect");

const pauseBtn = document.getElementById("pauseBtn");
const optionsBtn = document.getElementById("optionsBtn");
const statsBtn = document.getElementById("statsBtn");
const timerBtn = document.getElementById("timerBtn");
const addWaterBtn = document.getElementById("addWaterBtn");
const timerProgress = document.getElementById("timerProgress");
const timerCircle = document.getElementById("timerCircle");

// Plant tooltip toggle
const plantInfoBtn = document.getElementById("plantInfoBtn");
const plantTooltip = document.getElementById("plantTooltip");
if (plantInfoBtn) {
  plantInfoBtn.addEventListener("click", () => {
    plantTooltip.classList.toggle("hidden");
  });
  // Close when clicking outside
  document.addEventListener("click", e => {
    if (!plantInfoBtn.contains(e.target) && !plantTooltip.contains(e.target)) {
      plantTooltip.classList.add("hidden");
    }
  });
}

const CIRCLE_CIRCUMFERENCE = 502.65;

let paused = false;
let pausedRemainingMs = null;
let lastPhase = null;

// Plant growth stages
const PLANT_STAGES = [
  { min: 0,  max: 24,  label: "Seed 🌱",        stageId: "stage-seed",    status: "Just planted..." },
  { min: 25, max: 49,  label: "Sprout 🌿",       stageId: "stage-sprout",  status: "Growing nicely!" },
  { min: 50, max: 74,  label: "Sapling 🌳",      stageId: "stage-sapling", status: "Getting stronger!" },
  { min: 75, max: 100, label: "Mature Plant 🌸",  stageId: "stage-mature",  status: "Fully Bloomed!" },
];

function getPlantStage(health) {
  for (const s of PLANT_STAGES) {
    if (health <= s.max) return s;
  }
  return PLANT_STAGES[3];
}

function updatePlantUI(health) {
  const stage = getPlantStage(health);
  const allStageIds = ["stage-seed", "stage-sprout", "stage-sapling", "stage-mature"];
  allStageIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      if (id === stage.stageId) el.classList.remove("hidden");
      else el.classList.add("hidden");
    }
  });

  if (plantStageLabel) plantStageLabel.textContent = stage.label;
  if (plantStatus) plantStatus.textContent = stage.status;

  // Tooltip
  const stageIdx = PLANT_STAGES.indexOf(stage);
  const isMax = stageIdx === 3;
  const nextStage = isMax ? null : PLANT_STAGES[stageIdx + 1];
  const tooltipStageEl = document.getElementById("tooltipStage");
  const tooltipDescEl = document.getElementById("tooltipDesc");
  const tooltipProgressEl = document.getElementById("tooltipProgress");
  const plantProgressBar = document.getElementById("plantProgressBar");
  
  if (tooltipStageEl) {
    tooltipStageEl.textContent = isMax ? "🌸 Fully Grown!" : `${stage.label} → ${nextStage.label}`;
  }
  if (tooltipDescEl) {
    tooltipDescEl.textContent = isMax 
      ? "Your plant has reached full bloom. Keep working to maintain it!" 
      : `Reach ${nextStage.min} focus points to unlock the next stage!`;
  }
  
  const progressPct = isMax ? 100 : ((health - stage.min) / (stage.max - stage.min + 1)) * 100;
  if (plantProgressBar) plantProgressBar.style.width = `${Math.max(3, progressPct)}%`;
  if (tooltipProgressEl) tooltipProgressEl.textContent = `${health} / ${isMax ? 100 : stage.max} focus points (grows with Pomodoro completion)`;
}

function refreshPausedState(callback) {
  chrome.runtime.sendMessage({ action: "getPaused" }, (resp) => {
    if (resp && resp.pausedRemainingMs !== null && resp.pausedRemainingMs !== undefined) {
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

let lastRemaining = null;

function updateUI() {
  chrome.storage.sync.get(["mode", "streakCount", "waterIntake", "focusModeEnabled", "plantHealth", "ambientNoise", "soundsEnabled", "pomodoroWork", "reminderInterval"], (data) => {
    // ------- TIMER -------
    if (paused) {
      if (pausedRemainingMs !== null) {
        const minutes = Math.floor(pausedRemainingMs / 60000);
        const seconds = Math.floor((pausedRemainingMs % 60000) / 1000);
        timerEl.textContent = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
        timerLabelEl.textContent = "⏸ Paused";
        
        chrome.storage.local.get(["lastAlarmDurationMin"], ldata => {
          const total = (ldata.lastAlarmDurationMin || 25) * 60000;
          const filled = 1 - pausedRemainingMs / total;
          timerProgress.style.strokeDashoffset = CIRCLE_CIRCUMFERENCE * (1 - filled);
        });
        if (timerCircle) timerCircle.classList.add("timer-pulsing");
        pausedRemainingMs = Math.max(0, pausedRemainingMs - 1000);
      }
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

          // Final 60s pulse
          if (remaining < 60000 && timerCircle) {
            timerCircle.classList.add("timer-pulsing");
          }

          // Mode label
          chrome.runtime.sendMessage({ action: "getPhase" }, (resp) => {
            const phase = resp ? resp.phase : "Work";
            timerLabelEl.textContent = phase === "Work" ? "Deep Work Phase" : "Resting Phase";
            // Phase change → body theme
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
          timerEl.textContent = "--:--";
          timerLabelEl.textContent = "IDLE";
          timerProgress.style.strokeDashoffset = CIRCLE_CIRCUMFERENCE;
        }
      });
    }

    // ------- POMODORO CARD -------
    if (streakEl) streakEl.textContent = data.streakCount || 0;
    chrome.runtime.sendMessage({ action: "getPhase" }, (resp) => {
      if (phaseEl) phaseEl.textContent = resp ? resp.phase : "--";
    });

    // ------- WATER -------
    if (waterText) waterText.textContent = `${data.waterIntake || 0} glasses today`;

    // ------- FOCUS STATUS -------
    if (focusStatus) {
      focusStatus.textContent = data.focusModeEnabled ? "🟢 Active" : "⚫ Disabled";
      focusStatus.style.color = data.focusModeEnabled ? "var(--accent-color)" : "var(--text-dim)";
    }

    // ------- SOUND CARD -------
    const soundsEnabled = data.soundsEnabled !== false;
    const soundCard = document.getElementById("soundCard");
    if (soundCard) {
      soundCard.classList.toggle("hidden", !soundsEnabled);
    }
    if (ambientSelect) ambientSelect.value = data.ambientNoise || "none";

    // ------- PLANT -------
    const health = Math.max(0, Math.min(100, data.plantHealth !== undefined ? data.plantHealth : 100));
    updatePlantUI(health);
  });
}

// Pause / Resume
pauseBtn.addEventListener("click", () => {
  if (!paused) {
    chrome.runtime.sendMessage({ action: "pause" }, (resp) => {
      paused = true;
      pausedRemainingMs = resp ? resp.pausedRemainingMs : null;
      pauseBtnText.textContent = "Resume";
      pauseBtn.classList.add("secondary");
      updateUI();
    });
  } else {
    chrome.runtime.sendMessage({ action: "resume" }, () => {
      paused = false;
      pausedRemainingMs = null;
      pauseBtnText.textContent = "Pause";
      pauseBtn.classList.remove("secondary");
      document.body.classList.remove("break-phase");
      setTimeout(updateUI, 300);
    });
  }
});

// Water
if (addWaterBtn) {
  addWaterBtn.addEventListener("click", () => {
    chrome.runtime.sendMessage({ action: "addWater" }, (resp) => {
      if (resp && waterText) waterText.textContent = `${resp.waterIntake} glasses today`;
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

if (optionsBtn) optionsBtn.addEventListener("click", () => chrome.runtime.openOptionsPage());
if (statsBtn) statsBtn.addEventListener("click", () => chrome.tabs.create({ url: "stats.html" }));
if (timerBtn) timerBtn.addEventListener("click", () => chrome.tabs.create({ url: chrome.runtime.getURL("timer.html") }));

// Start
refreshPausedState(updateUI);
setInterval(updateUI, 1000);
