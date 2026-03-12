// options.js - v1.4 Sound Library + Settings Logic
const pomodoroWorkInput = document.getElementById("pomodoroWork");
const pomodoroBreakInput = document.getElementById("pomodoroBreak");
const longBreakCyclesInput = document.getElementById("longBreakCycles");
const longBreakDurationInput = document.getElementById("longBreakDuration");
const pomodoroBeepEnabledCheckbox = document.getElementById("pomodoroBeepEnabled");
const pomodoroBeepIntervalInput = document.getElementById("pomodoroBeepInterval");
const pomodoroBeepCard = document.getElementById("pomodoroBeepCard");
const healthBreakBeepEnabledCheckbox = document.getElementById("healthBreakBeepEnabled");
const healthBreakBeepCard = document.getElementById("healthBreakBeepCard");
const healthBreakBeepIntervalInput = document.getElementById("healthBreakBeepInterval");
const continuousBeepSoundSelect = document.getElementById("continuousBeepSoundSelection");
const enabledCheckbox = document.getElementById("enabled");
const saveBtn = document.getElementById("saveBtn");
const statusEl = document.getElementById("status");
const focusModeCheckbox = document.getElementById("focusModeEnabled");
const focusStartTimeInput = document.getElementById("focusStartTime");
const focusEndTimeInput = document.getElementById("focusEndTime");
const blocklistTextarea = document.getElementById("blocklist");
const waterGoalInput = document.getElementById("waterGoal");
const hydrationIntervalInput = document.getElementById("hydrationInterval");
const smartIdleCheckbox = document.getElementById("smartIdle");
const soundSelect = document.getElementById("soundSelection");
const ambientSelect = document.getElementById("ambientSelect");
const strictModeCheckbox = document.getElementById("strictMode");
const soundsEnabledCheckbox = document.getElementById("soundsEnabled");
const startupSoundSelect = document.getElementById("startupSoundSelection");
const customSoundFile = document.getElementById("customSoundFile");
const customSoundName = document.getElementById("customSoundName");
const addCustomSoundBtn = document.getElementById("addCustomSoundBtn");
const customSoundStatus = document.getElementById("customSoundStatus");

// Reminders & Salat
const customOneTimeAt = document.getElementById("customOneTimeAt");
const customOneTimeText = document.getElementById("customOneTimeText");
const addOneTimeBtn = document.getElementById("addOneTimeBtn");
const customRepeatInterval = document.getElementById("customRepeatInterval");
const customRepeatText = document.getElementById("customRepeatText");
const addRepeatBtn = document.getElementById("addRepeatBtn");
const customRemindersList = document.getElementById("customRemindersList");

const healthBreakText = document.getElementById("healthBreakText");
const healthBreakInterval = document.getElementById("healthBreakInterval");
const healthBreakDurationSecs = document.getElementById("healthBreakDurationSecs");
const addHealthBreakBtn = document.getElementById("addHealthBreakBtn");
const resetHealthBreaksBtn = document.getElementById("resetHealthBreaksBtn");
const healthBreaksList = document.getElementById("healthBreaksList");

const salatEnabledCheckbox = document.getElementById("salatEnabled");
const salatCityInput = document.getElementById("salatCity");
const salatCountryInput = document.getElementById("salatCountry");
const salatLeadTimeInput = document.getElementById("salatLeadTime");
const salatIntervalInput = document.getElementById("salatInterval");
const salatRepeatInput = document.getElementById("salatRepeat");
const salatStatus = document.getElementById("salatStatus");

// ─── Custom Sound Library ─────────────────────────────────────────────────────
function loadCustomSoundsIntoDropdown() {
  chrome.storage.local.get(["customSounds"], data => {
    const sounds = data.customSounds || {};
    // Remove existing custom options from all dropdowns
    document.querySelectorAll("#soundSelection option[data-custom]").forEach(o => o.remove());
    document.querySelectorAll("#ambientSelect option[data-custom]").forEach(o => o.remove());
    document.querySelectorAll("#startupSoundSelection option[data-custom]").forEach(o => o.remove());
    document.querySelectorAll("#continuousBeepSoundSelection option[data-custom]").forEach(o => o.remove());
    
    Object.keys(sounds).forEach(name => {
      const optStr = `<option value="custom:${name}" data-custom="true">🎵 ${name} (custom)</option>`;
      if (soundSelect) soundSelect.insertAdjacentHTML("beforeend", optStr);
      if (ambientSelect) ambientSelect.insertAdjacentHTML("beforeend", optStr);
      if (startupSoundSelect) startupSoundSelect.insertAdjacentHTML("beforeend", optStr);
      if (continuousBeepSoundSelect) continuousBeepSoundSelect.insertAdjacentHTML("beforeend", optStr);
    });
    renderCustomSoundList(sounds);
  });
}

function renderCustomSoundList(sounds) {
  const list = document.getElementById("customSoundsList");
  if (!list) return;
  list.innerHTML = "";
  const names = Object.keys(sounds);
  if (names.length === 0) return;
  const heading = document.createElement("p");
  heading.className = "guide-note";
  heading.style.marginBottom = "4px";
  heading.textContent = "Your uploaded sounds:";
  list.appendChild(heading);
  names.forEach(name => {
    const row = document.createElement("div");
    row.style.cssText = "display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.05);";
    row.innerHTML = `<span style="font-size:13px;">🎵 ${name}</span><button style="width:auto;padding:4px 10px;background:rgba(239,83,80,0.15);color:#ef9a9a;border:1px solid rgba(239,83,80,0.3);font-size:12px;" data-del="${name}">Remove</button>`;
    row.querySelector("button").addEventListener("click", () => {
      chrome.storage.local.get(["customSounds"], d => {
        const s = d.customSounds || {};
        delete s[name];
        chrome.storage.local.set({ customSounds: s }, loadCustomSoundsIntoDropdown);
      });
    });
    list.appendChild(row);
  });
}

if (customSoundFile) {
  customSoundFile.addEventListener("change", () => {
    if (customSoundFile.files[0] && customSoundName && !customSoundName.value) {
      customSoundName.value = customSoundFile.files[0].name.replace(/\.[^.]+$/, "");
    }
  });
}

if (addCustomSoundBtn) {
  addCustomSoundBtn.addEventListener("click", () => {
    const file = customSoundFile ? customSoundFile.files[0] : null;
    const name = customSoundName ? customSoundName.value.trim() : "";
    if (!file) { if (customSoundStatus) customSoundStatus.textContent = "⚠️ Choose a file first."; return; }
    if (!name) { if (customSoundStatus) customSoundStatus.textContent = "⚠️ Enter a name for the sound."; return; }
    const reader = new FileReader();
    reader.onload = e => {
      chrome.storage.local.get(["customSounds"], data => {
        const sounds = data.customSounds || {};
        sounds[name] = e.target.result;
        chrome.storage.local.set({ customSounds: sounds }, () => {
          if (customSoundStatus) { customSoundStatus.textContent = `✅ "${name}" added!`; customSoundStatus.style.color = "var(--accent-color)"; }
          if (customSoundName) customSoundName.value = "";
          if (customSoundFile) customSoundFile.value = "";
          loadCustomSoundsIntoDropdown();
        });
      });
    };
    reader.readAsDataURL(file);
  });
}

// ─── Custom Reminders UI ───────────────────────────────────────────────────
function renderCustomReminders() {
  chrome.storage.sync.get(["customAlarms"], data => {
    const list = customRemindersList;
    if (!list) return;
    list.innerHTML = "";
    const alarms = data.customAlarms || [];
    if (alarms.length === 0) return;
    
    alarms.forEach((alarm, index) => {
      const row = document.createElement("div");
      row.style.cssText = "display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.05);";
      
      let label = alarm.type === "one-time" 
        ? `🕒 ${alarm.time} - "${alarm.text}"` 
        : `🔁 Every ${alarm.interval}m - "${alarm.text}"`;
      
      row.innerHTML = `<span style="font-size:13px; color:white;">${label}</span><button style="width:auto;padding:4px 10px;background:rgba(239,83,80,0.15);color:#ef9a9a;border:1px solid rgba(239,83,80,0.3);font-size:12px;" data-idx="${index}">Remove</button>`;
      
      row.querySelector("button").addEventListener("click", () => {
        alarms.splice(index, 1);
        chrome.storage.sync.set({ customAlarms: alarms }, () => {
          renderCustomReminders();
          chrome.runtime.sendMessage({ action: "syncDynamicAlarms" }).catch(() => {});
        });
      });
      list.appendChild(row);
    });
  });
}

function renderHealthBreaks() {
  chrome.storage.sync.get(["healthBreaks"], data => {
    const list = healthBreaksList;
    if (!list) return;
    list.innerHTML = "";
    
    let breaks = data.healthBreaks;
    if (!breaks || breaks.length === 0) {
      breaks = [
        { id: Date.now() + 1, interval: 20, durationSecs: 20, text: "Blink slowly 10 times to moisten your eyes." },
        { id: Date.now() + 2, interval: 45, durationSecs: 30, text: "Stretch your neck and shoulders." },
        { id: Date.now() + 3, interval: 60, durationSecs: 60, text: "Take a short walk around your room." },
        { id: Date.now() + 4, interval: 90, durationSecs: 30, text: "Close your eyes for 30 seconds to relax." }
      ];
      chrome.storage.sync.set({ healthBreaks: breaks }, () => {
        chrome.runtime.sendMessage({ action: "syncDynamicAlarms" }).catch(() => {});
        renderHealthBreaks();
      });
      return;
    }

    breaks.forEach((b, index) => {
      const row = document.createElement("div");
      row.style.cssText = "display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.05);";
      
      row.innerHTML = `<span style="font-size:13px; color:white;">❤️ Every ${b.interval}m: "${b.text}" (${b.durationSecs}s)</span><button style="width:auto;padding:4px 10px;background:rgba(239,83,80,0.15);color:#ef9a9a;border:1px solid rgba(239,83,80,0.3);font-size:12px;" data-idx="${index}">Remove</button>`;
      
      row.querySelector("button").addEventListener("click", () => {
        breaks.splice(index, 1);
        chrome.storage.sync.set({ healthBreaks: breaks }, () => {
          renderHealthBreaks();
          chrome.runtime.sendMessage({ action: "syncDynamicAlarms" }).catch(() => {});
        });
      });
      list.appendChild(row);
    });
  });
}

if (addHealthBreakBtn) {
  addHealthBreakBtn.addEventListener("click", () => {
    const interval = parseInt(healthBreakInterval.value);
    const durationSecs = parseInt(healthBreakDurationSecs.value);
    const text = healthBreakText.value.trim();
    if (!interval || interval < 1 || !durationSecs || durationSecs < 5 || !text) {
      alert("Please enter valid text, interval (min), and duration (seconds >= 5).");
      return;
    }
    
    chrome.storage.sync.get(["healthBreaks"], data => {
      const breaks = data.healthBreaks || [];
      breaks.push({ id: Date.now(), interval, durationSecs, text });
      chrome.storage.sync.set({ healthBreaks: breaks }, () => {
        healthBreakInterval.value = "";
        healthBreakDurationSecs.value = "";
        healthBreakText.value = "";
        renderHealthBreaks();
        chrome.runtime.sendMessage({ action: "syncDynamicAlarms" }).catch(() => {});
      });
    });
  });
}
if (resetHealthBreaksBtn) {
  resetHealthBreaksBtn.addEventListener("click", () => {
    const defaults = [
        { id: Date.now() + 1, interval: 20, durationSecs: 20, text: "Blink slowly 10 times to moisten your eyes." },
        { id: Date.now() + 2, interval: 45, durationSecs: 30, text: "Stretch your neck and shoulders." },
        { id: Date.now() + 3, interval: 60, durationSecs: 60, text: "Take a short walk around your room." },
        { id: Date.now() + 4, interval: 90, durationSecs: 30, text: "Close your eyes for 30 seconds to relax." }
    ];
    chrome.storage.sync.set({ healthBreaks: defaults }, () => {
      renderHealthBreaks();
      chrome.runtime.sendMessage({ action: "syncDynamicAlarms" }).catch(() => {});
      alert("Health Breaks have been reset to default values.");
    });
  });
}
if (addOneTimeBtn) {
  addOneTimeBtn.addEventListener("click", () => {
    const time = customOneTimeAt.value;
    const text = customOneTimeText.value.trim();
    if (!time || !text) return alert("Please enter both time and a message.");
    
    chrome.storage.sync.get(["customAlarms"], data => {
      const alarms = data.customAlarms || [];
      alarms.push({ id: Date.now(), type: "one-time", time, text });
      chrome.storage.sync.set({ customAlarms: alarms }, () => {
        customOneTimeAt.value = "";
        customOneTimeText.value = "";
        renderCustomReminders();
        chrome.runtime.sendMessage({ action: "syncDynamicAlarms" }).catch(() => {});
      });
    });
  });
}

if (addRepeatBtn) {
  addRepeatBtn.addEventListener("click", () => {
    const interval = parseInt(customRepeatInterval.value);
    const text = customRepeatText.value.trim();
    if (!interval || !text || interval < 1) return alert("Please enter a valid interval and message.");
    
    chrome.storage.sync.get(["customAlarms"], data => {
      const alarms = data.customAlarms || [];
      alarms.push({ id: Date.now(), type: "repeated", interval, text });
      chrome.storage.sync.set({ customAlarms: alarms }, () => {
        customRepeatInterval.value = "";
        customRepeatText.value = "";
        renderCustomReminders();
        chrome.runtime.sendMessage({ action: "syncDynamicAlarms" }).catch(() => {});
      });
    });
  });
}

// ─── Load Settings ────────────────────────────────────────────────────────────
chrome.storage.sync.get(["mode","pomodoroWork","pomodoroBreak","longBreakCycles","longBreakDuration","pomodoroBeepEnabled","pomodoroBeepInterval","healthBreakBeepEnabled","continuousBeepSoundSelection","enabled","focusModeEnabled","focusStartTime","focusEndTime","blocklist","waterGoal","hydrationInterval","smartIdle","soundSelection","startupSoundSelection","strictMode","soundsEnabled","salatEnabled","salatCity","salatCountry","salatLeadTime","salatInterval","salatRepeat"], data => {
  if (pomodoroWorkInput) pomodoroWorkInput.value = data.pomodoroWork || 25;
  if (pomodoroBreakInput) pomodoroBreakInput.value = data.pomodoroBreak || 5;
  if (longBreakCyclesInput) longBreakCyclesInput.value = data.longBreakCycles || 4;
  if (longBreakDurationInput) longBreakDurationInput.value = data.longBreakDuration || 15;
  if (pomodoroBeepEnabledCheckbox) pomodoroBeepEnabledCheckbox.checked = !!data.pomodoroBeepEnabled;
  if (pomodoroBeepIntervalInput) pomodoroBeepIntervalInput.value = data.pomodoroBeepInterval || 10;
  if (healthBreakBeepEnabledCheckbox) healthBreakBeepEnabledCheckbox.checked = (data.healthBreakBeepEnabled !== undefined) ? !!data.healthBreakBeepEnabled : true;
  if (healthBreakBeepIntervalInput) healthBreakBeepIntervalInput.value = data.healthBreakBeepInterval || 60;
  if (continuousBeepSoundSelect) continuousBeepSoundSelect.value = data.continuousBeepSoundSelection || "beep";
  if (enabledCheckbox) enabledCheckbox.checked = (data.enabled !== undefined) ? data.enabled : true;
  if (focusModeCheckbox) focusModeCheckbox.checked = !!data.focusModeEnabled;
  if (focusStartTimeInput) focusStartTimeInput.value = data.focusStartTime || "09:00";
  if (focusEndTimeInput) focusEndTimeInput.value = data.focusEndTime || "17:00";
  if (blocklistTextarea) blocklistTextarea.value = (data.blocklist || []).join("\n");
  if (waterGoalInput) waterGoalInput.value = data.waterGoal || 8;
  if (hydrationIntervalInput) hydrationIntervalInput.value = (data.hydrationInterval !== undefined) ? data.hydrationInterval : 120;
  if (smartIdleCheckbox) smartIdleCheckbox.checked = data.smartIdle !== false;
  
  if (salatEnabledCheckbox) salatEnabledCheckbox.checked = !!data.salatEnabled;
  if (salatCityInput) salatCityInput.value = data.salatCity || "";
  if (salatCountryInput) salatCountryInput.value = data.salatCountry || "";
  if (salatLeadTimeInput) salatLeadTimeInput.value = data.salatLeadTime !== undefined ? data.salatLeadTime : 15;
  if (salatIntervalInput) salatIntervalInput.value = data.salatInterval !== undefined ? data.salatInterval : 2;
  if (salatRepeatInput) salatRepeatInput.value = data.salatRepeat !== undefined ? data.salatRepeat : 3;

  const salatTimesDisplay = document.getElementById("salatTimesDisplay");
  if (salatTimesDisplay) {
    chrome.storage.local.get(["salatTimes"], d => {
      if (d.salatTimes) {
        salatTimesDisplay.innerHTML = `Fajr: ${d.salatTimes.Fajr} | Dhuhr: ${d.salatTimes.Dhuhr} | Asr: ${d.salatTimes.Asr} | Maghrib: ${d.salatTimes.Maghrib} | Isha: ${d.salatTimes.Isha}`;
      } else {
        salatTimesDisplay.textContent = data.salatEnabled ? "Awaiting prayer times..." : "Enable below to fetch times";
      }
    });
  }

  if (soundSelect) soundSelect.value = data.soundSelection || "chime";
  if (startupSoundSelect) startupSoundSelect.value = data.startupSoundSelection || "none";
  if (strictModeCheckbox) strictModeCheckbox.checked = !!data.strictMode;
  if (soundsEnabledCheckbox) soundsEnabledCheckbox.checked = data.soundsEnabled !== false;
  
  loadCustomSoundsIntoDropdown();
  renderCustomReminders();
  renderHealthBreaks();
  togglePomodoroBeep();
  toggleHealthBreakBeep();
});

function togglePomodoroBeep() {
  if (!pomodoroBeepEnabledCheckbox || !pomodoroBeepCard) return;
  if (pomodoroBeepEnabledCheckbox.checked) {
    pomodoroBeepCard.classList.remove("hidden");
  } else {
    pomodoroBeepCard.classList.add("hidden");
  }
}

function toggleHealthBreakBeep() {
  if (!healthBreakBeepEnabledCheckbox || !healthBreakBeepCard) return;
  if (healthBreakBeepEnabledCheckbox.checked) {
    healthBreakBeepCard.classList.remove("hidden");
  } else {
    healthBreakBeepCard.classList.add("hidden");
  }
}

if (pomodoroBeepEnabledCheckbox) {
  pomodoroBeepEnabledCheckbox.addEventListener("change", togglePomodoroBeep);
}
if (healthBreakBeepEnabledCheckbox) {
  healthBreakBeepEnabledCheckbox.addEventListener("change", toggleHealthBreakBeep);
}
// ─── Save ────────────────────────────────────────────────────────────────────
if (saveBtn) {
  saveBtn.addEventListener("click", () => {
    chrome.storage.sync.get(["strictMode"], data => {
      // If currently strictMode is ON, user must type password to change anything
      if (data.strictMode) {
        const pass = prompt("Settings Locked! Type 'yes' to save changes:");
        if (pass !== "yes") { alert("Incorrect password. Changes not saved."); return; }
      }
      
      const newStrictMode = strictModeCheckbox ? !!strictModeCheckbox.checked : false;
      if (newStrictMode !== data.strictMode) {
        if (newStrictMode) alert("Settings Secured.");
        else alert("Settings Unlocked.");
      }

      saveSettings();
    });
  });
}

function saveSettings() {
  const mode = "pomodoro"; // Hardcode mode to pomodoro globally
  const pomodoroWork = pomodoroWorkInput ? Math.max(1, parseInt(pomodoroWorkInput.value) || 25) : 25;
  const pomodoroBreak = pomodoroBreakInput ? Math.max(1, parseInt(pomodoroBreakInput.value) || 5) : 5;
  const longBreakCycles = longBreakCyclesInput ? Math.max(1, parseInt(longBreakCyclesInput.value) || 4) : 4;
  const longBreakDuration = longBreakDurationInput ? Math.max(1, parseInt(longBreakDurationInput.value) || 15) : 15;
  const pomodoroBeepEnabled = pomodoroBeepEnabledCheckbox ? !!pomodoroBeepEnabledCheckbox.checked : false;
  const pomodoroBeepInterval = pomodoroBeepIntervalInput ? Math.max(1, parseInt(pomodoroBeepIntervalInput.value) || 10) : 10;
  const healthBreakBeepEnabled = healthBreakBeepEnabledCheckbox ? !!healthBreakBeepEnabledCheckbox.checked : true;
  const continuousBeepSoundSelection = continuousBeepSoundSelect ? continuousBeepSoundSelect.value : "beep";
  const enabled = enabledCheckbox ? !!enabledCheckbox.checked : true;
  const focusModeEnabled = focusModeCheckbox ? !!focusModeCheckbox.checked : false;
  const focusStartTime = focusStartTimeInput ? focusStartTimeInput.value : "09:00";
  const focusEndTime = focusEndTimeInput ? focusEndTimeInput.value : "17:00";
  const blocklist = blocklistTextarea ? blocklistTextarea.value.split("\n").map(s => s.trim()).filter(Boolean) : [];

  const waterGoal = waterGoalInput ? (parseInt(waterGoalInput.value) || 8) : 8;
  const hydrationInterval = hydrationIntervalInput ? (parseInt(hydrationIntervalInput.value) || 0) : 120;
  const smartIdle = smartIdleCheckbox ? !!smartIdleCheckbox.checked : true;
  const soundSelection = soundSelect ? soundSelect.value : "chime";
  const ambientNoise = ambientSelect ? ambientSelect.value : "none";
  const strictMode = strictModeCheckbox ? !!strictModeCheckbox.checked : false;
  const soundsEnabled = soundsEnabledCheckbox ? !!soundsEnabledCheckbox.checked : true;
  const startupSoundSelection = startupSoundSelect ? startupSoundSelect.value : "none";

  const salatEnabled = salatEnabledCheckbox ? !!salatEnabledCheckbox.checked : false;
  const salatCity = salatCityInput ? salatCityInput.value.trim() : "";
  const salatCountry = salatCountryInput ? salatCountryInput.value.trim() : "";
  const salatLeadTime = salatLeadTimeInput ? parseInt(salatLeadTimeInput.value) || 15 : 15;
  const salatInterval = salatIntervalInput ? parseInt(salatIntervalInput.value) || 2 : 2;
  const salatRepeat = salatRepeatInput ? parseInt(salatRepeatInput.value) || 3 : 3;

  if (salatEnabled && (!salatCity || !salatCountry)) {
    if (salatStatus) salatStatus.textContent = "City and Country are required for Salat!";
    return;
  } else if (salatStatus) {
    salatStatus.textContent = "Fetching and saving times...";
  }

  chrome.storage.sync.set({ 
    mode, pomodoroWork, pomodoroBreak, longBreakCycles, longBreakDuration,
    pomodoroBeepEnabled, pomodoroBeepInterval,
    healthBreakBeepEnabled, healthBreakBeepInterval: healthBreakBeepIntervalInput ? (parseInt(healthBreakBeepIntervalInput.value) || 60) : 60,
    continuousBeepSoundSelection, enabled, 
    focusModeEnabled, focusStartTime, focusEndTime, blocklist, 
    waterGoal, hydrationInterval, smartIdle, soundSelection, ambientNoise, startupSoundSelection, 
    strictMode, soundsEnabled,
    salatEnabled, salatCity, salatCountry, salatLeadTime, salatInterval, salatRepeat
  });

  chrome.runtime.sendMessage({ action: "updateAlarm", mode, pomodoroWork, pomodoroBreak, longBreakCycles, longBreakDuration, pomodoroBeepEnabled, pomodoroBeepInterval, healthBreakBeepEnabled, healthBreakBeepInterval: healthBreakBeepIntervalInput ? (parseInt(healthBreakBeepIntervalInput.value) || 60) : 60, continuousBeepSoundSelection, enabled }, resp => {
    chrome.runtime.sendMessage({ action: "updateSettings" }).catch(() => {});
    chrome.runtime.sendMessage({ action: "syncDynamicAlarms" }).catch(() => {});

    // Sound preview on save
    if (soundsEnabled) {
      chrome.storage.local.get(["customSounds"], cdata => {
        const cs = cdata.customSounds || {};
        if (soundSelection.startsWith("custom:")) {
          const cname = soundSelection.replace("custom:", "");
          if (cs[cname]) new Audio(cs[cname]).play().catch(() => {});
        } else {
          new Audio(chrome.runtime.getURL(`sounds/${soundSelection}.mp3`)).play().catch(() => {});
        }
      });
    }

    if (statusEl) {
      statusEl.textContent = (resp && resp.paused) ? "✅ Saved (Paused)" : "✅ Settings Saved!";
      if (saveBtn) saveBtn.textContent = "Saved!";
      setTimeout(() => { if (statusEl) statusEl.textContent = ""; if (saveBtn) saveBtn.textContent = "Save Settings"; }, 2000);
    }
  });
}
