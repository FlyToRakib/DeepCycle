// options.js - v3.1 Cleaned Settings

// XSS-safe text escaping for user-provided data in innerHTML
function sanitize(str) {
  const d = document.createElement("div");
  d.textContent = str;
  return d.innerHTML;
}

function formatTime12h(timeStr) {
  if (!timeStr) return timeStr;
  const [h, m] = timeStr.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}
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
const saveBtn = document.getElementById("saveBtn");
const statusEl = document.getElementById("status");
const focusModeCheckbox = document.getElementById("focusModeEnabled");
const focusStartTimeInput = document.getElementById("focusStartTime");
const focusEndTimeInput = document.getElementById("focusEndTime");
const waterGoalInput = document.getElementById("waterGoal");
const hydrationIntervalInput = document.getElementById("hydrationInterval");
const soundSelect = document.getElementById("soundSelection");
const ambientSelect = document.getElementById("ambientSelect");
const strictModeCheckbox = document.getElementById("strictMode");
const soundsEnabledCheckbox = document.getElementById("soundsEnabled");
const customSoundFile = document.getElementById("customSoundFile");
const customSoundName = document.getElementById("customSoundName");
const customSoundCategory = document.getElementById("customSoundCategory");
const addCustomSoundBtn = document.getElementById("addCustomSoundBtn");
const customSoundStatus = document.getElementById("customSoundStatus");

// Reminders
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

// Domain management
const newDomainInput = document.getElementById("newDomainInput");
const addDomainBtn = document.getElementById("addDomainBtn");
const domainList = document.getElementById("domainList");
const resetDomainsBtn = document.getElementById("resetDomainsBtn");

const DEFAULT_DOMAINS = [
  "facebook.com", "youtube.com", "instagram.com", "twitter.com", "x.com", "tiktok.com",
  "reddit.com", "snapchat.com", "linkedin.com"
];

// Global header/footer
const headerEl = document.getElementById("dcHeader");
const footerEl = document.getElementById("dcFooter");
if (headerEl) {
  headerEl.innerHTML = dcRenderHeader("settings", "Configure your Pomodoro timer, health reminders, ambient sounds, Focus Mode, and more to match your workflow.");
}
if (footerEl) footerEl.innerHTML = dcRenderFooter();
dcInitNav();

// Shortcut link — chrome:// URLs can't be opened directly, guide user
const shortcutLink = document.getElementById("shortcutLink");
if (shortcutLink) {
  shortcutLink.addEventListener("click", (e) => {
    e.preventDefault();
    alert("To customize your shortcut:\n\n1. Go to chrome://extensions/shortcuts\n2. Find DeepCycle\n3. Set your preferred key combination");
  });
}

// Exclude Time Frames
const excludeTimeStart = document.getElementById("excludeTimeStart");
const excludeTimeEnd = document.getElementById("excludeTimeEnd");
const addExcludeTimeBtn = document.getElementById("addExcludeTimeBtn");
const excludeTimesList = document.getElementById("excludeTimesList");

function renderExcludeTimeFrames() {
  chrome.storage.sync.get(["focusExcludeTimes"], data => {
    const times = data.focusExcludeTimes !== undefined ? data.focusExcludeTimes : [{ start: "13:00", end: "13:30" }];
    if (!excludeTimesList) return;
    excludeTimesList.innerHTML = "";
    times.forEach((tf, idx) => {
      const row = document.createElement("div");
      row.className = "exclude-time-item";
      row.innerHTML = `<span>${formatTime12h(tf.start)} — ${formatTime12h(tf.end)}</span><button style="width:auto;padding:3px 8px;background:rgba(239,83,80,0.15);color:#ef9a9a;border:1px solid rgba(239,83,80,0.3);font-size:11px;border-radius:4px;cursor:pointer;">✕</button>`;
      row.querySelector("button").addEventListener("click", () => {
        times.splice(idx, 1);
        chrome.storage.sync.set({ focusExcludeTimes: times }, () => {
          renderExcludeTimeFrames();
          chrome.runtime.sendMessage({ action: "updateSettings" }).catch(() => { });
        });
      });
      excludeTimesList.appendChild(row);
    });
  });
}

if (addExcludeTimeBtn) {
  addExcludeTimeBtn.addEventListener("click", () => {
    const start = excludeTimeStart ? excludeTimeStart.value : "";
    const end = excludeTimeEnd ? excludeTimeEnd.value : "";
    if (!start || !end) return alert("Please select both start and end times.");
    if (start === end) return alert("Start and end times cannot be the same.");
    chrome.storage.sync.get(["focusExcludeTimes"], data => {
      const times = data.focusExcludeTimes !== undefined ? data.focusExcludeTimes : [{ start: "13:00", end: "13:30" }];
      times.push({ start, end });
      chrome.storage.sync.set({ focusExcludeTimes: times }, () => {
        if (excludeTimeStart) excludeTimeStart.value = "";
        if (excludeTimeEnd) excludeTimeEnd.value = "";
        renderExcludeTimeFrames();
        chrome.runtime.sendMessage({ action: "updateSettings" }).catch(() => { });
      });
    });
  });
}

// ─── Custom Sound Library ─────────────────────────────────────────────────────
function loadCustomSoundsIntoDropdown() {
  chrome.storage.local.get(["customSounds"], data => {
    const sounds = data.customSounds || {};
    // Remove existing custom options from all dropdowns
    document.querySelectorAll("#soundSelection option[data-custom]").forEach(o => o.remove());
    document.querySelectorAll("#ambientSelect option[data-custom]").forEach(o => o.remove());
    document.querySelectorAll("#continuousBeepSoundSelection option[data-custom]").forEach(o => o.remove());

    Object.entries(sounds).forEach(([name, info]) => {
      const category = (typeof info === "object" && info.category) ? info.category : "alert";
      let displayName = name.length > 20 ? name.substring(0, 20) + "..." : name;
      const optStr = `<option value="custom:${name}" data-custom="true">${sanitize(displayName)}</option>`;

      if (category === "alert" && soundSelect) {
        soundSelect.insertAdjacentHTML("beforeend", optStr);
      } else if (category === "ambient" && ambientSelect) {
        ambientSelect.insertAdjacentHTML("beforeend", optStr);
      } else if (category === "beep" && continuousBeepSoundSelect) {
        continuousBeepSoundSelect.insertAdjacentHTML("beforeend", optStr);
      } else {
        // Default: add to alert
        if (soundSelect) soundSelect.insertAdjacentHTML("beforeend", optStr);
      }
    });
    renderCustomSoundList(sounds);
  });
}

function renderCustomSoundList(sounds) {
  const list = document.getElementById("customSoundsList");
  if (!list) return;
  list.innerHTML = "";
  const entries = Object.entries(sounds);
  if (entries.length === 0) return;
  const heading = document.createElement("p");
  heading.className = "guide-note";
  heading.style.marginBottom = "4px";
  heading.textContent = "Your uploaded sounds:";
  list.appendChild(heading);
  entries.forEach(([name, info]) => {
    const category = (typeof info === "object" && info.category) ? info.category : "alert";
    let displayName = name.length > 20 ? name.substring(0, 20) + "..." : name;
    const row = document.createElement("div");
    row.style.cssText = "display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--border);";
    row.innerHTML = `<span style="font-size:13px;" title="${sanitize(name)}">${sanitize(displayName)} <span style="font-size:10px;padding:2px 6px;border-radius:4px;background:var(--surface);color:var(--text-muted);margin-left:6px;">${sanitize(category)}</span></span><button style="width:auto;padding:4px 10px;background:rgba(239,83,80,0.15);color:#ef9a9a;border:1px solid rgba(239,83,80,0.3);font-size:12px;border-radius:4px;cursor:pointer;" data-del="${sanitize(name)}">Remove</button>`;
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
    const category = customSoundCategory ? customSoundCategory.value : "alert";
    if (!file) { if (customSoundStatus) customSoundStatus.textContent = "⚠️ Choose a file first."; return; }
    if (!name) { if (customSoundStatus) customSoundStatus.textContent = "⚠️ Enter a name for the sound."; return; }
    const reader = new FileReader();
    reader.onload = e => {
      chrome.storage.local.get(["customSounds"], data => {
        const sounds = data.customSounds || {};
        sounds[name] = { dataUrl: e.target.result, category };
        chrome.storage.local.set({ customSounds: sounds }, () => {
          if (customSoundStatus) { customSoundStatus.textContent = `✅ "${name}" added to ${category}!`; customSoundStatus.style.color = "var(--brand-lime)"; }
          if (customSoundName) customSoundName.value = "";
          if (customSoundFile) customSoundFile.value = "";
          loadCustomSoundsIntoDropdown();
        });
      });
    };
    reader.readAsDataURL(file);
  });
}

// ─── Domain Management ────────────────────────────────────────────────────────
function loadDomains(callback) {
  chrome.storage.sync.get(["domainEntries", "blocklist"], data => {
    let domains = data.domainEntries;
    if (!domains) {
      // Migrate from old blocklist format
      const oldList = data.blocklist || [];
      if (oldList.length > 0) {
        domains = oldList.map(d => ({
          domain: d.trim(),
          isDefault: DEFAULT_DOMAINS.includes(d.trim().toLowerCase())
        }));
      } else {
        // Fresh install: populate with defaults
        domains = DEFAULT_DOMAINS.map(d => ({ domain: d, isDefault: true }));
      }
      chrome.storage.sync.set({ domainEntries: domains });
    }
    if (callback) callback(domains);
  });
}

function renderDomainList() {
  loadDomains(domains => {
    if (!domainList) return;
    domainList.innerHTML = "";
    if (domains.length === 0) {
      domainList.innerHTML = '<div style="padding:12px;text-align:center;color:var(--text-muted);font-size:12px;">No domains added</div>';
      return;
    }
    domains.forEach((entry, index) => {
      const row = document.createElement("div");
      row.className = "domain-item";
      row.innerHTML = `
        <div style="display:flex;align-items:center;gap:8px;">
          <span>${sanitize(entry.domain)}</span>
          <span class="domain-tag ${entry.isDefault ? 'default' : 'custom'}">${entry.isDefault ? 'Default' : 'Custom'}</span>
        </div>
        <button style="width:auto;padding:4px 10px;background:rgba(239,83,80,0.15);color:#ef9a9a;border:1px solid rgba(239,83,80,0.3);font-size:11px;border-radius:4px;cursor:pointer;" data-idx="${index}">✕</button>`;
      row.querySelector("button").addEventListener("click", () => {
        domains.splice(index, 1);
        chrome.storage.sync.set({ domainEntries: domains, blocklist: domains.map(d => d.domain) }, () => {
          renderDomainList();
          chrome.runtime.sendMessage({ action: "updateSettings" }).catch(() => { });
        });
      });
      domainList.appendChild(row);
    });
  });
}

if (addDomainBtn) {
  addDomainBtn.addEventListener("click", () => {
    const val = newDomainInput ? newDomainInput.value.trim() : "";
    if (!val) return;
    const domain = val.replace(/^(?:https?:\/\/)?(?:www\.)?/i, "").replace(/\/.*$/, "");
    if (!domain) return;
    loadDomains(domains => {
      if (domains.some(d => d.domain.toLowerCase() === domain.toLowerCase())) {
        alert("Domain already exists.");
        return;
      }
      domains.push({ domain, isDefault: false });
      chrome.storage.sync.set({ domainEntries: domains, blocklist: domains.map(d => d.domain) }, () => {
        if (newDomainInput) newDomainInput.value = "";
        renderDomainList();
        chrome.runtime.sendMessage({ action: "updateSettings" }).catch(() => { });
      });
    });
  });
}

if (resetDomainsBtn) {
  resetDomainsBtn.addEventListener("click", () => {
    loadDomains(domains => {
      // Keep custom domains, restore any missing defaults
      const customDomains = domains.filter(d => !d.isDefault);
      const existingDefaults = domains.filter(d => d.isDefault).map(d => d.domain.toLowerCase());
      const restoredDefaults = DEFAULT_DOMAINS.map(d => ({ domain: d, isDefault: true }));
      // Merge: defaults + customs (no duplicates)
      const merged = [...restoredDefaults];
      customDomains.forEach(cd => {
        if (!merged.some(m => m.domain.toLowerCase() === cd.domain.toLowerCase())) {
          merged.push(cd);
        }
      });
      chrome.storage.sync.set({ domainEntries: merged, blocklist: merged.map(d => d.domain) }, () => {
        renderDomainList();
        chrome.runtime.sendMessage({ action: "updateSettings" }).catch(() => { });
        alert("Default domains restored. Your custom domains have been kept.");
      });
    });
  });
}

// ─── Custom Reminders UI ──────────────────────────────────────────────────────
function renderCustomReminders() {
  chrome.storage.sync.get(["customAlarms"], data => {
    const list = customRemindersList;
    if (!list) return;
    list.innerHTML = "";
    const alarms = data.customAlarms || [];
    if (alarms.length === 0) return;

    alarms.forEach((alarm, index) => {
      const row = document.createElement("div");
      row.style.cssText = "display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--border);";

      let label = alarm.type === "one-time"
        ? `${formatTime12h(sanitize(alarm.time))} - "${sanitize(alarm.text)}"`
        : `Every ${alarm.interval}m - "${sanitize(alarm.text)}"`;

      row.innerHTML = `<span style="font-size:13px;">${label}</span><button style="width:auto;padding:4px 10px;background:rgba(239,83,80,0.15);color:#ef9a9a;border:1px solid rgba(239,83,80,0.3);font-size:12px;border-radius:4px;cursor:pointer;" data-idx="${index}">Remove</button>`;

      row.querySelector("button").addEventListener("click", () => {
        alarms.splice(index, 1);
        chrome.storage.sync.set({ customAlarms: alarms }, () => {
          renderCustomReminders();
          chrome.runtime.sendMessage({ action: "syncDynamicAlarms" }).catch(() => { });
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
        chrome.runtime.sendMessage({ action: "syncDynamicAlarms" }).catch(() => { });
        renderHealthBreaks();
      });
      return;
    }

    breaks.forEach((b, index) => {
      const row = document.createElement("div");
      row.style.cssText = "display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--border);";

      row.innerHTML = `<span style="font-size:13px;">Every ${b.interval}m: "${sanitize(b.text)}" (${b.durationSecs}s)</span><button style="width:auto;padding:4px 10px;background:rgba(239,83,80,0.15);color:#ef9a9a;border:1px solid rgba(239,83,80,0.3);font-size:12px;border-radius:4px;cursor:pointer;" data-idx="${index}">Remove</button>`;

      row.querySelector("button").addEventListener("click", () => {
        breaks.splice(index, 1);
        chrome.storage.sync.set({ healthBreaks: breaks }, () => {
          renderHealthBreaks();
          chrome.runtime.sendMessage({ action: "syncDynamicAlarms" }).catch(() => { });
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
        chrome.runtime.sendMessage({ action: "syncDynamicAlarms" }).catch(() => { });
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
      chrome.runtime.sendMessage({ action: "syncDynamicAlarms" }).catch(() => { });
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
        chrome.runtime.sendMessage({ action: "syncDynamicAlarms" }).catch(() => { });
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
        chrome.runtime.sendMessage({ action: "syncDynamicAlarms" }).catch(() => { });
      });
    });
  });
}

// ─── Load Settings ────────────────────────────────────────────────────────────
chrome.storage.sync.get(["mode", "pomodoroWork", "pomodoroBreak", "longBreakCycles", "longBreakDuration", "pomodoroBeepEnabled", "pomodoroBeepInterval", "healthBreakBeepEnabled", "continuousBeepSoundSelection", "focusModeEnabled", "focusStartTime", "focusEndTime", "waterGoal", "hydrationInterval", "soundSelection", "ambientNoise", "strictMode", "soundsEnabled", "focusExcludeDays"], data => {
  if (pomodoroWorkInput) pomodoroWorkInput.value = data.pomodoroWork || 50;
  if (pomodoroBreakInput) pomodoroBreakInput.value = data.pomodoroBreak || 5;
  if (longBreakCyclesInput) longBreakCyclesInput.value = data.longBreakCycles || 4;
  if (longBreakDurationInput) longBreakDurationInput.value = data.longBreakDuration || 10;
  if (pomodoroBeepEnabledCheckbox) pomodoroBeepEnabledCheckbox.checked = !!data.pomodoroBeepEnabled;
  if (pomodoroBeepIntervalInput) pomodoroBeepIntervalInput.value = data.pomodoroBeepInterval || 10;
  if (healthBreakBeepEnabledCheckbox) healthBreakBeepEnabledCheckbox.checked = (data.healthBreakBeepEnabled !== undefined) ? !!data.healthBreakBeepEnabled : true;
  if (healthBreakBeepIntervalInput) healthBreakBeepIntervalInput.value = data.healthBreakBeepInterval || 60;
  let loadedBeep = data.continuousBeepSoundSelection || "beep/beep";
  if (loadedBeep === "beep") loadedBeep = "beep/beep";
  if (["chime", "gong", "digital"].includes(loadedBeep)) loadedBeep = "beep/beep";
  if (continuousBeepSoundSelect) continuousBeepSoundSelect.value = loadedBeep;
  if (focusModeCheckbox) focusModeCheckbox.checked = !!data.focusModeEnabled;
  if (focusStartTimeInput) focusStartTimeInput.value = data.focusStartTime || "09:00";
  if (focusEndTimeInput) focusEndTimeInput.value = data.focusEndTime || "18:00";
  if (waterGoalInput) waterGoalInput.value = data.waterGoal || 8;
  if (hydrationIntervalInput) hydrationIntervalInput.value = (data.hydrationInterval !== undefined) ? data.hydrationInterval : 120;

  let loadedSound = data.soundSelection || "alert/chime";
  if (loadedSound === "chime") loadedSound = "alert/chime";
  if (loadedSound === "gong") loadedSound = "alert/gong";
  if (loadedSound === "digital") loadedSound = "alert/digital";
  if (soundSelect) soundSelect.value = loadedSound;

  let loadedAmbient = data.ambientNoise || "none";
  if (loadedAmbient === "lofi") loadedAmbient = "ambient/lofi";
  if (loadedAmbient === "rain") loadedAmbient = "ambient/rain";
  if (loadedAmbient === "cafe") loadedAmbient = "ambient/cafe";
  if (ambientSelect) ambientSelect.value = loadedAmbient;
  if (strictModeCheckbox) strictModeCheckbox.checked = !!data.strictMode;
  if (soundsEnabledCheckbox) soundsEnabledCheckbox.checked = data.soundsEnabled !== false;

  // Exclude days
  const excludeDays = data.focusExcludeDays || [];
  document.querySelectorAll(".excludeDay").forEach(cb => {
    cb.checked = excludeDays.includes(parseInt(cb.value));
  });

  loadCustomSoundsIntoDropdown();
  renderCustomReminders();
  renderHealthBreaks();
  renderDomainList();
  renderExcludeTimeFrames();
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
  const mode = "pomodoro";
  const pomodoroWork = pomodoroWorkInput ? Math.max(1, parseInt(pomodoroWorkInput.value) || 50) : 50;
  const pomodoroBreak = pomodoroBreakInput ? Math.max(1, parseInt(pomodoroBreakInput.value) || 5) : 5;
  const longBreakCycles = longBreakCyclesInput ? Math.max(1, parseInt(longBreakCyclesInput.value) || 4) : 4;
  const longBreakDuration = longBreakDurationInput ? Math.max(1, parseInt(longBreakDurationInput.value) || 10) : 10;
  const pomodoroBeepEnabled = pomodoroBeepEnabledCheckbox ? !!pomodoroBeepEnabledCheckbox.checked : false;
  const pomodoroBeepInterval = pomodoroBeepIntervalInput ? Math.max(1, parseInt(pomodoroBeepIntervalInput.value) || 10) : 10;
  const healthBreakBeepEnabled = healthBreakBeepEnabledCheckbox ? !!healthBreakBeepEnabledCheckbox.checked : true;
  const continuousBeepSoundSelection = continuousBeepSoundSelect ? continuousBeepSoundSelect.value : "beep/beep";
  const focusModeEnabled = focusModeCheckbox ? !!focusModeCheckbox.checked : false;
  const focusStartTime = focusStartTimeInput ? focusStartTimeInput.value : "09:00";
  const focusEndTime = focusEndTimeInput ? focusEndTimeInput.value : "18:00";

  // Exclude days
  const focusExcludeDays = [];
  document.querySelectorAll(".excludeDay:checked").forEach(cb => {
    focusExcludeDays.push(parseInt(cb.value));
  });

  // Build blocklist from domain entries
  loadDomains(domains => {
    const blocklist = domains.map(d => d.domain);

    const waterGoal = waterGoalInput ? (parseInt(waterGoalInput.value) || 8) : 8;
    const hydrationInterval = hydrationIntervalInput ? (parseInt(hydrationIntervalInput.value) || 0) : 120;
    const soundSelection = soundSelect ? soundSelect.value : "alert/chime";
    const ambientNoise = ambientSelect ? ambientSelect.value : "none";
    const strictMode = strictModeCheckbox ? !!strictModeCheckbox.checked : false;
    const soundsEnabled = soundsEnabledCheckbox ? !!soundsEnabledCheckbox.checked : true;

    chrome.storage.sync.set({
      mode, pomodoroWork, pomodoroBreak, longBreakCycles, longBreakDuration,
      pomodoroBeepEnabled, pomodoroBeepInterval,
      healthBreakBeepEnabled, healthBreakBeepInterval: healthBreakBeepIntervalInput ? (parseInt(healthBreakBeepIntervalInput.value) || 60) : 60,
      continuousBeepSoundSelection,
      focusModeEnabled, focusStartTime, focusEndTime, focusExcludeDays, blocklist,
      waterGoal, hydrationInterval, soundSelection, ambientNoise,
      strictMode, soundsEnabled
    });

    chrome.runtime.sendMessage({
      action: "updateAlarm", mode, pomodoroWork, pomodoroBreak, longBreakCycles, longBreakDuration,
      pomodoroBeepEnabled, pomodoroBeepInterval, healthBreakBeepEnabled,
      healthBreakBeepInterval: healthBreakBeepIntervalInput ? (parseInt(healthBreakBeepIntervalInput.value) || 60) : 60,
      continuousBeepSoundSelection
    }, resp => {
      chrome.runtime.sendMessage({ action: "updateSettings" }).catch(() => { });
      chrome.runtime.sendMessage({ action: "syncDynamicAlarms" }).catch(() => { });

      // Sound preview on save
      if (soundsEnabled) {
        chrome.storage.local.get(["customSounds"], cdata => {
          const cs = cdata.customSounds || {};
          if (soundSelection.startsWith("custom:")) {
            const cname = soundSelection.replace("custom:", "");
            const entry = cs[cname];
            const url = (typeof entry === "object" && entry.dataUrl) ? entry.dataUrl : entry;
            if (url) new Audio(url).play().catch(() => { });
          } else {
            new Audio(chrome.runtime.getURL(`sounds/${soundSelection}.mp3`)).play().catch(() => { });
          }
        });
      }

      if (statusEl) {
        statusEl.textContent = (resp && resp.paused) ? "✅ Saved (Paused)" : "✅ Settings Saved!";
        if (saveBtn) saveBtn.textContent = "Saved!";
        setTimeout(() => { if (statusEl) statusEl.textContent = ""; if (saveBtn) saveBtn.textContent = "Save Settings"; }, 2000);
      }
    });
  });
}

// ─── Play Preview Handlers ───────────────────────────────────────────────────
let currentPreviewAudio = null;

function playPreviewSound(selectId) {
  const el = document.getElementById(selectId);
  if (!el) return;
  const val = el.value;

  if (currentPreviewAudio) {
    currentPreviewAudio.pause();
    currentPreviewAudio.currentTime = 0;
  }

  if (!val || val === "none") return;

  chrome.storage.local.get(["customSounds"], cdata => {
    const cs = cdata.customSounds || {};
    if (val.startsWith("custom:")) {
      const cname = val.replace("custom:", "");
      const entry = cs[cname];
      const url = (typeof entry === "object" && entry.dataUrl) ? entry.dataUrl : entry;
      if (url) {
        currentPreviewAudio = new Audio(url);
        currentPreviewAudio.play().catch(() => { });
      }
    } else {
      currentPreviewAudio = new Audio(chrome.runtime.getURL(`sounds/${val}.mp3`));
      currentPreviewAudio.play().catch(() => { });
    }
  });
}

function loadFolderSounds(folderName, selectId) {
  const selectEl = document.getElementById(selectId);
  if (!selectEl) return;

  if (chrome.runtime.getPackageDirectoryEntry) {
    chrome.runtime.getPackageDirectoryEntry((root) => {
      root.getDirectory("sounds/" + folderName, { create: false }, (dirEntry) => {
        const dirReader = dirEntry.createReader();
        let entries = [];
        const readEntries = () => {
          dirReader.readEntries((results) => {
            if (!results.length) {
              Array.from(selectEl.options).forEach(opt => {
                if (opt.value !== "none" && !opt.hasAttribute("data-custom")) opt.remove();
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
              chrome.storage.sync.get(["soundSelection", "continuousBeepSoundSelection", "ambientNoise"], data => {
                requestAnimationFrame(() => {
                  let mappedVal = null;
                  if (selectId === "soundSelection") {
                    mappedVal = data.soundSelection || "alert/chime";
                    if (mappedVal === "chime") mappedVal = "alert/chime";
                    if (mappedVal === "gong") mappedVal = "alert/gong";
                    if (mappedVal === "digital") mappedVal = "alert/digital";
                  } else if (selectId === "continuousBeepSoundSelection") {
                    mappedVal = data.continuousBeepSoundSelection || "beep/beep";
                    if (["beep", "chime", "gong", "digital"].includes(mappedVal)) mappedVal = "beep/beep";
                  } else if (selectId === "ambientSelect") {
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
          }, () => { });
        };
        readEntries();
      }, () => { });
    });
  }
}

// Call dynamic loaders
loadFolderSounds("alert", "soundSelection");
loadFolderSounds("ambient", "ambientSelect");
loadFolderSounds("beep", "continuousBeepSoundSelection");

const previewAlertBtn = document.getElementById("previewAlertBtn");
if (previewAlertBtn) previewAlertBtn.addEventListener("click", () => playPreviewSound("soundSelection"));

const previewAmbientBtn = document.getElementById("previewAmbientBtn");
if (previewAmbientBtn) previewAmbientBtn.addEventListener("click", () => playPreviewSound("ambientSelect"));

const previewBeepBtn = document.getElementById("previewBeepBtn");
if (previewBeepBtn) previewBeepBtn.addEventListener("click", () => playPreviewSound("continuousBeepSoundSelection"));

const shortcutLimits = document.querySelectorAll('a[href="chrome://extensions/shortcuts"]');
shortcutLimits.forEach(link => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: "chrome://extensions/shortcuts" });
  });
});
