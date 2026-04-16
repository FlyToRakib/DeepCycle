// background.js - v3.0 Manual Start, No Idle, No Salat, No Welcome Sound
let reminderMode = "pomodoro";
let notificationsEnabled = true;
let pomodoroWork = 50;
let pomodoroBreak = 5;
let longBreakCycles = 4;
let longBreakDuration = 10;
let pomodoroBeepInterval = 10;
let pomodoroBeepEnabled = false;
let healthBreakBeepEnabled = true;
let healthBreakBeepInterval = 60;
let continuousBeepSoundSelection = "beep/beep";

let activeHealthBeep = null;

let isWorkPhase = true;
let pomodoroCycleCount = 0;
let isLongBreak = false;
let streakCount = 0;
let waterIntake = 0;
let blocklist = [];
let focusModeEnabled = false;
let sessionActive = false; // Manual start tracking

let plantHealth = 100;
let lastMicroBreak = Date.now();
let soundSelection = "alert/chime";
let ambientNoise = "none";
let strictMode = false;
let soundsEnabled = true;

let focusStartTime = "09:00";
let focusEndTime = "17:00";
let focusExcludeDays = [];
let focusExcludeTimes = [];

let tips = [];
let pausedRemainingMs = null;

// Core Initialization
chrome.storage.sync.get(
  ["mode", "enabled", "pomodoroWork", "pomodoroBreak", "longBreakCycles", "longBreakDuration", "pomodoroBeepEnabled", "pomodoroBeepInterval", "streakCount", "pausedRemainingMs", "waterIntake", "lastWaterReset", "blocklist", "focusModeEnabled", "focusStartTime", "focusEndTime", "focusExcludeDays", "focusExcludeTimes", "totalReminders", "breaksTaken", "soundsEnabled", "ambientNoise", "strictMode", "soundSelection", "plantHealth", "sessionActive"],
  data => {
    if (data.mode) reminderMode = data.mode;
    if (data.enabled !== undefined) notificationsEnabled = data.enabled;
    if (data.pomodoroWork) pomodoroWork = data.pomodoroWork;
    if (data.pomodoroBreak) pomodoroBreak = data.pomodoroBreak;
    if (data.longBreakCycles) longBreakCycles = data.longBreakCycles;
    if (data.longBreakDuration) longBreakDuration = data.longBreakDuration;
    if (data.pomodoroBeepEnabled !== undefined) pomodoroBeepEnabled = !!data.pomodoroBeepEnabled;
    if (data.pomodoroBeepInterval) pomodoroBeepInterval = data.pomodoroBeepInterval;
    if (data.healthBreakBeepEnabled !== undefined) {
      healthBreakBeepEnabled = !!data.healthBreakBeepEnabled;
    } else {
      healthBreakBeepEnabled = true;
    }
    if (data.healthBreakBeepInterval) {
      healthBreakBeepInterval = data.healthBreakBeepInterval;
    } else {
      healthBreakBeepInterval = 60;
    }
    if (data.continuousBeepSoundSelection) {
      let b = data.continuousBeepSoundSelection;
      if (["beep", "chime", "gong", "digital"].includes(b)) b = "beep/beep";
      continuousBeepSoundSelection = b;
    }
    if (data.streakCount) streakCount = data.streakCount;
    if (data.waterIntake) waterIntake = data.waterIntake;
    if (data.blocklist) blocklist = data.blocklist;
    if (data.focusModeEnabled !== undefined) focusModeEnabled = data.focusModeEnabled;
    if (data.pausedRemainingMs) pausedRemainingMs = data.pausedRemainingMs;
    if (data.focusExcludeDays) focusExcludeDays = data.focusExcludeDays;
    
    if (data.focusExcludeTimes !== undefined) {
      focusExcludeTimes = data.focusExcludeTimes;
    } else {
      focusExcludeTimes = [{ start: "13:00", end: "13:30" }];
      chrome.storage.sync.set({ focusExcludeTimes });
    }

    // For new installs, start plant at 0 health
    if (data.plantHealth !== undefined) {
      plantHealth = data.plantHealth;
    } else {
      plantHealth = 0;
      chrome.storage.sync.set({ plantHealth: 0 });
    }
    if (data.soundSelection) {
      let s = data.soundSelection;
      if (s === "chime") s = "alert/chime";
      if (s === "gong") s = "alert/gong";
      if (s === "digital") s = "alert/digital";
      soundSelection = s;
    }
    if (data.ambientNoise) {
      let a = data.ambientNoise;
      if (a === "lofi") a = "ambient/lofi";
      if (a === "rain") a = "ambient/rain";
      if (a === "cafe") a = "ambient/cafe";
      ambientNoise = a;
    }
    if (data.strictMode !== undefined) strictMode = data.strictMode;
    if (data.soundsEnabled !== undefined) soundsEnabled = data.soundsEnabled;
    if (data.focusStartTime) focusStartTime = data.focusStartTime;
    if (data.focusEndTime) focusEndTime = data.focusEndTime;

    // Session active tracking
    if (data.sessionActive !== undefined) sessionActive = data.sessionActive;

    chrome.alarms.create("microBreak", { periodInMinutes: 20 });
    chrome.alarms.create("focusModeCheck", { periodInMinutes: 1 });
    syncDynamicAlarms();

    if (data.totalReminders === undefined) chrome.storage.sync.set({ totalReminders: 0 });
    if (data.breaksTaken === undefined) chrome.storage.sync.set({ breaksTaken: 0 });

    // Daily reset for water
    const today = new Date().toLocaleDateString();
    if (data.lastWaterReset !== today) {
      waterIntake = 0;
      chrome.storage.sync.set({ waterIntake: 0, lastWaterReset: today });
    }

    // Session persistence: only resume if session was active before browser closed
    if (sessionActive && !pausedRemainingMs) {
      chrome.alarms.get("breakReminder", (alarm) => {
        if (!alarm) {
          // Session was active but alarm is gone (browser restart) — save state for resume prompt
          chrome.storage.local.get(["lastAlarmDurationMin", "lastAlarmScheduledTime"], ldata => {
            if (ldata.lastAlarmScheduledTime) {
              const elapsed = Date.now() - ldata.lastAlarmScheduledTime;
              const totalMs = (ldata.lastAlarmDurationMin || pomodoroWork) * 60000;
              const remaining = Math.max(0, totalMs - elapsed);
              if (remaining > 0) {
                // Store for resume prompt
                chrome.storage.local.set({ pendingResumeMs: remaining });
              }
            }
          });
        }
      });
    }

    updateFocusModeRules();
  }
);

// load tips file
fetch(chrome.runtime.getURL("tips.json"))
  .then(r => r.json())
  .then(d => tips = d)
  .catch(_ => tips = ["Take a short break!"]);

// Focus Mode / Site Restriction Logic (declarativeNetRequest)
async function updateFocusModeRules() {
  const oldRules = await chrome.declarativeNetRequest.getDynamicRules();
  const oldRuleIds = oldRules.map(r => r.id);

  // If feature is off or blocklist is empty, remove all rules and stop
  if (!focusModeEnabled || !blocklist || blocklist.length === 0) {
    if (oldRuleIds.length > 0) {
      await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: oldRuleIds });
    }
    return;
  }

  // Check exclude days
  const todayDay = new Date().getDay();
  if (focusExcludeDays && focusExcludeDays.includes(todayDay)) {
    if (oldRuleIds.length > 0) {
      await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: oldRuleIds });
    }
    return;
  }

  // Time window is optional. If start != end, apply the schedule gate.
  let isBlocking = true;
  if (focusStartTime && focusEndTime && focusStartTime !== focusEndTime) {
    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();
    const [startH, startM] = focusStartTime.split(":").map(Number);
    const [endH, endM] = focusEndTime.split(":").map(Number);
    const startMins = startH * 60 + startM;
    const endMins = endH * 60 + endM;

    if (startMins < endMins) {
      isBlocking = currentMins >= startMins && currentMins < endMins;
    } else {
      isBlocking = currentMins >= startMins || currentMins < endMins;
    }
  }

  // Check exclude time frames
  if (isBlocking && focusExcludeTimes && focusExcludeTimes.length > 0) {
    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();
    for (const tf of focusExcludeTimes) {
      const [sh, sm] = tf.start.split(":").map(Number);
      const [eh, em] = tf.end.split(":").map(Number);
      const sMins = sh * 60 + sm;
      const eMins = eh * 60 + em;
      if (sMins < eMins) {
        if (currentMins >= sMins && currentMins < eMins) { isBlocking = false; break; }
      } else {
        if (currentMins >= sMins || currentMins < eMins) { isBlocking = false; break; }
      }
    }
  }

  if (!isBlocking) {
    if (oldRuleIds.length > 0) {
      await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: oldRuleIds });
    }
    return;
  }

  const newRules = blocklist.map((domain, index) => {
    let filter = domain.replace(/^(?:https?:\/\/)?(?:www\.)?/i, "").trim();
    if (filter.endsWith("/")) filter = filter.slice(0, -1);
    if (!filter) return null;

    const blockedUrl = chrome.runtime.getURL(`blocked.html?site=${encodeURIComponent(filter)}`);
    return {
      id: index + 101,
      priority: 10,
      action: { type: "redirect", redirect: { url: blockedUrl } },
      condition: {
        urlFilter: `||${filter}`,
        resourceTypes: ["main_frame"]
      }
    };
  }).filter(Boolean);

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: oldRuleIds,
    addRules: newRules
  });
}

// Dynamic Alarms Sync (Hydration, Custom, Health Breaks)
async function syncDynamicAlarms() {
  if (activeHealthBeep) { clearInterval(activeHealthBeep); activeHealthBeep = null; }
  chrome.storage.sync.get(["hydrationInterval", "customAlarms", "healthBreaks"], async data => {
    // 1. Dynamic Hydration
    if (data.hydrationInterval && data.hydrationInterval > 0) {
      chrome.alarms.create("dynamicHydration", { periodInMinutes: data.hydrationInterval });
    } else {
      chrome.alarms.clear("dynamicHydration");
    }

    // Clear old custom & health alarms
    const alarms = await chrome.alarms.getAll();
    for (let a of alarms) {
      if (a.name.startsWith("custom_") || a.name.startsWith("healthBreak_")) {
        chrome.alarms.clear(a.name);
      }
    }

    // 2. Custom Reminders
    const customAlarms = data.customAlarms || [];
    customAlarms.forEach(alarm => {
      const alarmName = `custom_${alarm.id}_${alarm.text}`;
      if (alarm.type === "one-time") {
        const [h, m] = alarm.time.split(":").map(Number);
        const now = new Date();
        let target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0);
        if (target < now) target.setDate(target.getDate() + 1);
        chrome.alarms.create(alarmName, { when: target.getTime() });
      } else if (alarm.type === "repeated") {
        chrome.alarms.create(alarmName, { periodInMinutes: alarm.interval });
      }
    });

    // 3. Advanced Health Breaks
    let healthBreaks = data.healthBreaks;
    if (!healthBreaks || healthBreaks.length === 0) {
      const now = Date.now();
      healthBreaks = [
        { id: now + 1, interval: 20, durationSecs: 20, text: "Blink slowly 10 times to moisten your eyes." },
        { id: now + 2, interval: 45, durationSecs: 30, text: "Stretch your neck and shoulders." },
        { id: now + 3, interval: 60, durationSecs: 60, text: "Take a short walk around your room." },
        { id: now + 4, interval: 90, durationSecs: 30, text: "Close your eyes for 30 seconds to relax." }
      ];
      chrome.storage.sync.set({ healthBreaks });
    }
    healthBreaks.forEach(hb => {
      const alarmName = `healthBreak_${hb.id}_${hb.durationSecs}_${hb.text}`;
      chrome.alarms.create(alarmName, { periodInMinutes: hb.interval });
    });
  });
}

// show notification and update stats
const notifQueue = [];
let isProcessingQueue = false;

function processNotifQueue() {
  if (notifQueue.length === 0) {
    isProcessingQueue = false;
    return;
  }
  isProcessingQueue = true;
  const { id, message, includeTip } = notifQueue.shift();

  const tip = (includeTip && tips.length) ? `\n\nTip: ${tips[Math.floor(Math.random() * tips.length)]}` : "";

  chrome.notifications.create(id, {
    type: "basic",
    iconUrl: "icons/icon128.png",
    title: "DeepCycle",
    message: `${message}${tip}`,
    priority: 2,
    buttons: [{ title: "Snooze 5 min" }]
  }, () => {
    setTimeout(processNotifQueue, 1000);
  });

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, { action: "showToast", message: `${message}${tip}` }).catch(() => {});
    }
  });

  chrome.storage.sync.get(["totalReminders","breaksTaken"], data => {
    const total = (data.totalReminders || 0) + 1;
    const breaks = (data.breaksTaken || 0) + 1;
    chrome.storage.sync.set({ totalReminders: total, breaksTaken: breaks });
  });
}

function showNotification(id, message, includeTip = false) {
  if (!notificationsEnabled) return;
  notifQueue.push({ id, message, includeTip });
  if (!isProcessingQueue) {
    processNotifQueue();
  }
}

// set/reset alarm
function setAlarm(minutes, isResume = false) {
  chrome.alarms.clear("breakReminder", () => {
    chrome.alarms.create("breakReminder", { delayInMinutes: minutes });
    chrome.storage.local.set({
      lastAlarmScheduledTime: Date.now(),
      lastAlarmDurationMin: isResume ? minutes : (isWorkPhase ? pomodoroWork : (isLongBreak ? longBreakDuration : pomodoroBreak))
    });
  });
}

function handlePause(sendResponse) {
  chrome.alarms.get("breakReminder", (alarm) => {
    if (!alarm) {
      pausedRemainingMs = null;
      chrome.storage.sync.remove("pausedRemainingMs", () => {
        updateFocusModeRules();
        handleAmbientNoise();
        if (sendResponse) sendResponse({ status: "paused", pausedRemainingMs: null });
      });
      return;
    }
    const remaining = Math.max(0, alarm.scheduledTime - Date.now());
    pausedRemainingMs = remaining;
    chrome.alarms.clear("breakReminder", () => {
      chrome.storage.sync.set({ pausedRemainingMs: pausedRemainingMs }, () => {
        updateFocusModeRules();
        handleAmbientNoise();
        if (sendResponse) sendResponse({ status: "paused", pausedRemainingMs: pausedRemainingMs });
      });
    });
  });
}

function handleResume(sendResponse) {
  chrome.storage.sync.get(["pausedRemainingMs"], data => {
    const pr = data.pausedRemainingMs;
    pausedRemainingMs = null;
    chrome.storage.sync.remove("pausedRemainingMs", () => {
      if (pr && pr > 0) {
        const delayMin = pr / 60000;
        setAlarm(delayMin, true);
      } else {
        const startMin = pomodoroWork;
        isWorkPhase = true;
        setAlarm(startMin, true);
      }
      updateFocusModeRules();
      handleAmbientNoise();
      if (sendResponse) sendResponse({ status: "resumed", resumedFrom: pr });
    });
  });
}

// Offscreen Document Setup
let creatingOffscreen;
async function setupOffscreenDocument(path) {
  if (await chrome.offscreen.hasDocument()) return;
  if (creatingOffscreen) {
    await creatingOffscreen;
  } else {
    creatingOffscreen = chrome.offscreen.createDocument({
      url: path,
      reasons: ['AUDIO_PLAYBACK'],
      justification: 'Playing timer notifications and ambient sounds'
    }).catch(() => {}).finally(() => {
      creatingOffscreen = null;
    });
    await creatingOffscreen;
  }
}

async function playSpecificSound(soundName) {
  await setupOffscreenDocument("offscreen.html");
  if (soundName.startsWith("custom:")) {
    const rawName = soundName.replace("custom:", "");
    chrome.storage.local.get(["customSounds"], cdata => {
      if (cdata.customSounds && cdata.customSounds[rawName]) {
        const entry = cdata.customSounds[rawName];
        const url = (typeof entry === "object" && entry.dataUrl) ? entry.dataUrl : entry;
        chrome.runtime.sendMessage({ target: 'offscreen', action: 'playSound', url }).catch(() => {});
      }
    });
  } else {
    chrome.runtime.sendMessage({ target: 'offscreen', action: 'playSound', url: chrome.runtime.getURL(`sounds/${soundName}.mp3`) }).catch(() => {});
  }
}

// Audio Playback Helper
async function playSound(type) {
  if (!soundsEnabled || !notificationsEnabled) return;
  playSpecificSound(soundSelection);
}

// Dynamic Secondary Alarms Logic
chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name.startsWith("healthBreak_")) {
    const parts = alarm.name.split("_");
    const duration = parseInt(parts[2]);
    const text = parts.slice(3).join("_");

    chrome.storage.sync.get(["healthBreakBeepEnabled", "healthBreakBeepInterval", "continuousBeepSoundSelection", "soundsEnabled", "enabled"], freshData => {
      const beepOn = freshData.healthBreakBeepEnabled !== undefined ? !!freshData.healthBreakBeepEnabled : true;
      const sndOn = freshData.soundsEnabled !== false;
      const notiOn = freshData.enabled !== false;
      const beepSound = freshData.continuousBeepSoundSelection || "beep/beep";
      const beepBpm = Math.max(1, parseInt(freshData.healthBreakBeepInterval) || 60);

      healthBreakBeepEnabled = beepOn;
      healthBreakBeepInterval = beepBpm;
      continuousBeepSoundSelection = beepSound;

      showNotification(`health-${Date.now()}`, `Health Break: ${text}`, false);

      if (beepOn && sndOn && notiOn) {
        const beepPeriodMin = 1 / beepBpm;
        const beepEndTime = Date.now() + (duration * 1000);
        chrome.storage.local.set({
          healthBeepActive: true,
          healthBeepSound: beepSound,
          healthBeepEndTime: beepEndTime
        }, () => {
          chrome.alarms.clear("healthBreakBeep", () => {
            playSpecificSound(beepSound);
            chrome.alarms.create("healthBreakBeep", { periodInMinutes: Math.max(0.017, beepPeriodMin) });
          });
        });
      } else {
        playSound("reminder");
      }

      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, { action: "showMicroBreak", text, duration }).catch(() => {});
        }
      });
    });
  } else if (alarm.name === "healthBreakBeep") {
    chrome.storage.local.get(["healthBeepActive", "healthBeepSound", "healthBeepEndTime"], d => {
      if (!d.healthBeepActive) {
        chrome.alarms.clear("healthBreakBeep");
        return;
      }
      if (Date.now() >= (d.healthBeepEndTime || 0)) {
        chrome.storage.local.set({ healthBeepActive: false });
        chrome.alarms.clear("healthBreakBeep");
        return;
      }
      playSpecificSound(d.healthBeepSound || "beep/beep");
    });
  } else if (alarm.name === "focusModeCheck") {
    updateFocusModeRules();
  } else if (alarm.name === "dynamicHydration") {
    showNotification(`hydrate-${Date.now()}`, "Hydration Check! Time to drink some water.", false);
    playSound("reminder");
  } else if (alarm.name.startsWith("custom_")) {
    const parts = alarm.name.split("_");
    const alarmId = parseInt(parts[1]);
    const text = parts.slice(2).join("_");
    showNotification(`custom-${Date.now()}-${alarm.name}`, `Reminder: ${text}`, false);
    playSound("reminder");

    // Auto-remove one-time alerts after 30 seconds
    if (alarmId) {
      setTimeout(() => {
        chrome.storage.sync.get(["customAlarms"], data => {
          const alarms = data.customAlarms || [];
          const idx = alarms.findIndex(a => a.id === alarmId && a.type === "one-time");
          if (idx !== -1) {
            alarms.splice(idx, 1);
            chrome.storage.sync.set({ customAlarms: alarms });
          }
        });
      }, 30000);
    }
  }
});

// Alarm Handler — Pomodoro Break Logic
chrome.alarms.onAlarm.addListener(alarm => {
  // Beep during break
  if (alarm.name === "breakBeep") {
    playSpecificSound(continuousBeepSoundSelection);
    return;
  }

  if (alarm.name !== "breakReminder") return;

  if (reminderMode === "pomodoro") {
    if (isWorkPhase) {
      pomodoroCycleCount++;

      let isLong = false;
      let breakLen = pomodoroBreak;

      if (pomodoroCycleCount >= longBreakCycles) {
        isLong = true;
        breakLen = longBreakDuration;
        pomodoroCycleCount = 0;
      }
      isLongBreak = isLong;

      const breakMsg = isLong ? "Long break time! Amazing focus." : "Work session finished! Time for a short break.";
      showNotification(`pomodoro-work-${Date.now()}`, breakMsg, true);
      playSound("break_start");
      setAlarm(breakLen);
      isWorkPhase = false;

      // Show countdown overlay on active tab
      const breakDurationSecs = breakLen * 60;
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: "showPomodoroBreak",
            text: breakMsg,
            duration: breakDurationSecs,
            isLong
          }).catch(() => {});
        }
      });

      // Continuous Beep Setup
      if (pomodoroBeepEnabled && pomodoroBeepInterval > 0) {
        chrome.alarms.create("breakBeep", { periodInMinutes: (1 / pomodoroBeepInterval) });
      }

      // Boost plant on work completion
      plantHealth = Math.min(100, plantHealth + 5);
      chrome.storage.sync.set({ plantHealth });
    } else {
      chrome.alarms.clear("breakBeep");

      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) chrome.tabs.sendMessage(tabs[0].id, { action: "hideOverlay" }).catch(() => {});
      });
      showNotification(`pomodoro-break-${Date.now()}`, "Break's over! Back to work.", false);
      playSound("work_start");

      // Streak logic with daily reset
      const today = new Date().toLocaleDateString();
      chrome.storage.sync.get(["lastCompletionDate", "streakCount"], sdata => {
        let newStreak = (sdata.streakCount || 0) + 1;
        if (sdata.lastCompletionDate && sdata.lastCompletionDate !== today) {
          const lastDate = new Date(sdata.lastCompletionDate);
          const diffDays = Math.floor((new Date() - lastDate) / 86400000);
          if (diffDays > 1) newStreak = 1;
        }
        streakCount = newStreak;
        chrome.storage.sync.set({ streakCount: newStreak, lastCompletionDate: today });
        chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
          if (tabs[0]) chrome.tabs.sendMessage(tabs[0].id, {
            action: "showToast",
            message: `Streak x${newStreak}! You've completed ${newStreak} session${newStreak>1?'s':''} in a row.`,
            duration: 5000
          }).catch(() => {});
        });
      });

      setAlarm(pomodoroWork);
      isWorkPhase = true;
    }
    updateFocusModeRules();
    handleAmbientNoise();
  }
});

chrome.notifications.onButtonClicked.addListener((notifId, btnIdx) => {
  if (btnIdx === 0) setAlarm(5, true);
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || !msg.action) return false;

  if (msg.action === "startSession") {
    sessionActive = true;
    isWorkPhase = true;
    pausedRemainingMs = null;
    chrome.storage.sync.set({ sessionActive: true });
    chrome.storage.sync.remove("pausedRemainingMs");
    chrome.storage.local.remove("pendingResumeMs");
    setAlarm(pomodoroWork);
    handleAmbientNoise();
    sendResponse({ status: "started", pomodoroWork });
    return true;
  }

  if (msg.action === "stopSession") {
    // Full stop — clear everything
    sessionActive = false;
    isWorkPhase = true;
    pausedRemainingMs = null;
    pomodoroCycleCount = 0;
    chrome.alarms.clear("breakReminder");
    chrome.alarms.clear("breakBeep");
    chrome.storage.sync.set({ sessionActive: false });
    chrome.storage.sync.remove("pausedRemainingMs");
    chrome.storage.local.remove("pendingResumeMs");
    handleAmbientNoise();
    sendResponse({ status: "stopped" });
    return true;
  }

  if (msg.action === "trackBlock") {
    chrome.storage.local.get(["blockedAttempts"], data => {
      const attempts = data.blockedAttempts || { total: 0, domains: {}, daily: {} };
      if (!attempts.daily) attempts.daily = {};
      attempts.total++;
      const domain = msg.domain || "unknown";
      attempts.domains[domain] = (attempts.domains[domain] || 0) + 1;
      // Track daily
      const today = new Date();
      const key = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
      attempts.daily[key] = (attempts.daily[key] || 0) + 1;
      chrome.storage.local.set({ blockedAttempts: attempts });
    });
    sendResponse({ status: "tracked" });
    return true;
  }

  if (msg.action === "getSessionState") {
    chrome.storage.sync.get(["pausedRemainingMs", "sessionActive"], data => {
      if (data.pausedRemainingMs !== null && data.pausedRemainingMs !== undefined) {
        sendResponse({ state: "paused", pausedRemainingMs: data.pausedRemainingMs });
      } else if (data.sessionActive) {
        chrome.alarms.get("breakReminder", alarm => {
          if (alarm) {
            sendResponse({ state: "running" });
          } else {
            sendResponse({ state: "idle" });
          }
        });
        return; // Keep channel open for async alarm check
      } else {
        sendResponse({ state: "idle" });
      }
    });
    return true;
  }

  if (msg.action === "updateAlarm") {
    reminderMode = "pomodoro";
    if (typeof msg.pomodoroWork === "number") pomodoroWork = msg.pomodoroWork;
    if (typeof msg.pomodoroBreak === "number") pomodoroBreak = msg.pomodoroBreak;
    if (typeof msg.longBreakCycles === "number") longBreakCycles = msg.longBreakCycles;
    if (typeof msg.longBreakDuration === "number") longBreakDuration = msg.longBreakDuration;
    if (typeof msg.pomodoroBeepEnabled === "boolean") pomodoroBeepEnabled = msg.pomodoroBeepEnabled;
    if (typeof msg.pomodoroBeepInterval === "number") pomodoroBeepInterval = msg.pomodoroBeepInterval;
    if (typeof msg.healthBreakBeepEnabled === "boolean") healthBreakBeepEnabled = msg.healthBreakBeepEnabled;
    if (typeof msg.healthBreakBeepInterval === "number") healthBreakBeepInterval = msg.healthBreakBeepInterval;
    if (typeof msg.continuousBeepSoundSelection === "string") continuousBeepSoundSelection = msg.continuousBeepSoundSelection;
    if (typeof msg.enabled === "boolean") notificationsEnabled = msg.enabled;

    if (activeHealthBeep) { clearInterval(activeHealthBeep); activeHealthBeep = null; }

    chrome.storage.sync.set({
      mode: reminderMode,
      pomodoroWork: pomodoroWork,
      pomodoroBreak: pomodoroBreak,
      longBreakCycles: longBreakCycles,
      longBreakDuration: longBreakDuration,
      pomodoroBeepEnabled: pomodoroBeepEnabled,
      pomodoroBeepInterval: pomodoroBeepInterval,
      healthBreakBeepEnabled: healthBreakBeepEnabled,
      continuousBeepSoundSelection: continuousBeepSoundSelection,
      enabled: notificationsEnabled
    }, () => {
      chrome.storage.sync.get(["pausedRemainingMs"], data => {
        if (data.pausedRemainingMs) {
          sendResponse({ status: "ok", paused: true });
        } else if (sessionActive) {
          isWorkPhase = true;
          setAlarm(pomodoroWork);
          sendResponse({ status: "ok", paused: false });
        } else {
          sendResponse({ status: "ok", paused: false });
        }
      });
    });
    return true;
  }

  if (msg.action === "getPhase") {
    sendResponse({ phase: isWorkPhase ? "Work" : "Break" });
    return false;
  }

  if (msg.action === "pause") {
    handlePause(sendResponse);
    return true;
  }

  if (msg.action === "resume") {
    handleResume(sendResponse);
    return true;
  }

  if (msg.action === "getPaused") {
    chrome.storage.sync.get(["pausedRemainingMs"], data => {
      sendResponse({ pausedRemainingMs: data.pausedRemainingMs || null });
    });
    return true;
  }

  if (msg.action === "addWater") {
    waterIntake++;
    chrome.storage.sync.set({ waterIntake });
    sendResponse({ waterIntake });
    return true;
  }

  if (msg.action === "updateSettings") {
    chrome.storage.sync.get(["blocklist", "focusModeEnabled", "focusStartTime", "focusEndTime", "focusExcludeDays", "focusExcludeTimes", "soundSelection", "strictMode", "ambientNoise", "soundsEnabled"], data => {
      blocklist = data.blocklist || [];
      focusModeEnabled = data.focusModeEnabled || false;
      focusStartTime = data.focusStartTime || "09:00";
      focusEndTime = data.focusEndTime || "18:00";
      focusExcludeDays = data.focusExcludeDays || [];
      focusExcludeTimes = data.focusExcludeTimes || [];
      soundSelection = data.soundSelection || "chime";
      strictMode = !!data.strictMode;
      ambientNoise = data.ambientNoise || "none";
      soundsEnabled = data.soundsEnabled !== false;

      updateFocusModeRules();
      handleAmbientNoise();
      syncDynamicAlarms();
    });
    return false;
  }

  if (msg.action === "syncDynamicAlarms") {
    syncDynamicAlarms().finally(() => sendResponse({status: "ok"}));
    return true;
  }

  if (msg.action === "playStandAloneSound") {
    playSpecificSound(msg.sound).finally(() => sendResponse({status: "ok"}));
    return true;
  }
});

// Keyboard shortcut handler
chrome.commands.onCommand.addListener((command) => {
  if (command === "start-pomodoro") {
    if (!sessionActive) {
      // Start new session
      sessionActive = true;
      isWorkPhase = true;
      pausedRemainingMs = null;
      chrome.storage.sync.set({ sessionActive: true });
      chrome.storage.sync.remove("pausedRemainingMs");
      setAlarm(pomodoroWork);
      handleAmbientNoise();
    } else {
      // Toggle pause/resume
      chrome.storage.sync.get(["pausedRemainingMs"], data => {
        if (data.pausedRemainingMs) {
          handleResume();
        } else {
          handlePause();
        }
      });
    }
  }
});

async function handleAmbientNoise() {
  const isRunning = pausedRemainingMs === null && isWorkPhase && sessionActive;
  const shouldPlay = soundsEnabled && isRunning && ambientNoise !== "none";
  const action = shouldPlay ? "startAmbient" : "stopAmbient";

  await setupOffscreenDocument("offscreen.html");
  if (shouldPlay && ambientNoise.startsWith("custom:")) {
    const rawName = ambientNoise.replace("custom:", "");
    chrome.storage.local.get(["customSounds"], cdata => {
      if (cdata.customSounds && cdata.customSounds[rawName]) {
        const entry = cdata.customSounds[rawName];
        const url = (typeof entry === "object" && entry.dataUrl) ? entry.dataUrl : entry;
        chrome.runtime.sendMessage({ target: 'offscreen', action, url }).catch(() => {});
      }
    });
  } else {
    const url = shouldPlay ? chrome.runtime.getURL(`sounds/${ambientNoise}.mp3`) : "";
    chrome.runtime.sendMessage({ target: 'offscreen', action, url }).catch(() => {});
  }
}

// Activity Tracking (for Stats Graph)
chrome.alarms.create("activityLogger", { periodInMinutes: 1 });

chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === "activityLogger") {
    const hour = new Date().getHours();
    const today = new Date().toLocaleDateString();
    chrome.storage.local.get(["dailyUsage", "lastUsageReset"], data => {
      let usage = data.dailyUsage || {};
      if (data.lastUsageReset !== today) {
        usage = {};
        chrome.storage.local.set({ lastUsageReset: today });
      }
      usage[hour] = (usage[hour] || 0) + 1;
      chrome.storage.local.set({ dailyUsage: usage });
    });
  }
});
