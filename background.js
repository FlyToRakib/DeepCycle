// background.js - v2.0 Pomodoro Overhaul
let reminderMode = "pomodoro"; // Enforced mode
let notificationsEnabled = true;
let pomodoroWork = 25;
let pomodoroBreak = 5;
let longBreakCycles = 4;
let longBreakDuration = 15;
let pomodoroBeepInterval = 10;
let pomodoroBeepEnabled = false;
let healthBreakBeepEnabled = true;
let healthBreakBeepInterval = 60;
let continuousBeepSoundSelection = "beep";

let activeHealthBeep = null;

let isWorkPhase = true;
let pomodoroCycleCount = 0;
let isLongBreak = false;
let streakCount = 0;
let waterIntake = 0;
let blocklist = [];
let focusModeEnabled = false;

let plantHealth = 100; // 0 to 100
let lastMicroBreak = Date.now();
let soundSelection = "chime";
let ambientNoise = "none";
let strictMode = false;
let soundsEnabled = true;

let focusStartTime = "09:00";
let focusEndTime = "17:00";

let tips = [];
let pausedRemainingMs = null;
let startupSoundPlayed = false;

// Core Initialization
chrome.storage.sync.get(
  ["mode", "enabled", "pomodoroWork", "pomodoroBreak", "longBreakCycles", "longBreakDuration", "pomodoroBeepEnabled", "pomodoroBeepInterval", "streakCount", "pausedRemainingMs", "waterIntake", "lastWaterReset", "blocklist", "focusModeEnabled", "focusStartTime", "focusEndTime", "totalReminders", "breaksTaken", "startupSoundSelection", "soundsEnabled", "ambientNoise", "strictMode", "soundSelection", "plantHealth"],
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
    if (data.continuousBeepSoundSelection) continuousBeepSoundSelection = data.continuousBeepSoundSelection;
    if (data.streakCount) streakCount = data.streakCount;
    if (data.waterIntake) waterIntake = data.waterIntake;
    if (data.blocklist) blocklist = data.blocklist;
    if (data.focusModeEnabled !== undefined) focusModeEnabled = data.focusModeEnabled;
    if (data.pausedRemainingMs) pausedRemainingMs = data.pausedRemainingMs;
    // For new installs, start plant at 0 health
    if (data.plantHealth !== undefined) {
      plantHealth = data.plantHealth;
    } else {
      plantHealth = 0;
      chrome.storage.sync.set({ plantHealth: 0 });
    }
    if (data.soundSelection) soundSelection = data.soundSelection;
    if (data.ambientNoise) ambientNoise = data.ambientNoise;
    if (data.strictMode !== undefined) strictMode = data.strictMode;
    if (data.soundsEnabled !== undefined) soundsEnabled = data.soundsEnabled;
    if (data.focusStartTime) focusStartTime = data.focusStartTime;
    if (data.focusEndTime) focusEndTime = data.focusEndTime;

    chrome.alarms.create("microBreak", { periodInMinutes: 20 });
    chrome.alarms.create("focusModeCheck", { periodInMinutes: 1 }); // check focus active time every minute
    syncDynamicAlarms();
    
    // Welcome startup sound
    if (data.startupSoundSelection && data.startupSoundSelection !== "none" && soundsEnabled && !startupSoundPlayed) {
      playSpecificSound(data.startupSoundSelection);
      startupSoundPlayed = true;
    }

    // ... rest of init ...
    
    if (data.totalReminders === undefined) chrome.storage.sync.set({ totalReminders: 0 });
    if (data.breaksTaken === undefined) chrome.storage.sync.set({ breaksTaken: 0 });

    // Daily reset for water
    const today = new Date().toLocaleDateString();
    if (data.lastWaterReset !== today) {
      waterIntake = 0;
      chrome.storage.sync.set({ waterIntake: 0, lastWaterReset: today });
    }

    chrome.alarms.get("breakReminder", (alarm) => {
      if (!alarm && !pausedRemainingMs) {
        setAlarm(pomodoroWork);
      }
    });

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
      // Overnight span (e.g. 22:00 to 06:00)
      isBlocking = currentMins >= startMins || currentMins < endMins;
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

// Dynamic Alarms Sync (Hydration, Custom, Salat)
// Dynamic Alarms Sync (Hydration, Custom, Salat, Health Breaks)
async function syncDynamicAlarms() {
  if (activeHealthBeep) { clearInterval(activeHealthBeep); activeHealthBeep = null; }
  chrome.storage.sync.get(["hydrationInterval", "customAlarms", "healthBreaks", "salatEnabled", "salatCity", "salatCountry", "salatLeadTime", "salatInterval", "salatRepeat"], async data => {
    // 1. Dynamic Hydration
    if (data.hydrationInterval && data.hydrationInterval > 0) {
      chrome.alarms.create("dynamicHydration", { periodInMinutes: data.hydrationInterval });
    } else {
      chrome.alarms.clear("dynamicHydration");
    }

    // Clear old custom & salat alarms
    // Clear old custom, salat, & health alarms
    const alarms = await chrome.alarms.getAll();
    for (let a of alarms) {
      if (a.name.startsWith("custom_") || a.name.startsWith("salat_") || a.name.startsWith("healthBreak_")) {
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
        if (target < now) target.setDate(target.getDate() + 1); // next day
        chrome.alarms.create(alarmName, { when: target.getTime() });
      } else if (alarm.type === "repeated") {
        chrome.alarms.create(alarmName, { periodInMinutes: alarm.interval });
      }
    });

    // 2.5 Advanced Health Breaks — seed defaults on first use (no options page needed)
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

    // 3. Salat Reminders
    if (data.salatEnabled && data.salatCity && data.salatCountry) {
      const url = `https://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(data.salatCity)}&country=${encodeURIComponent(data.salatCountry)}&method=2`;
      try {
        const res = await fetch(url);
        const json = await res.json();
        if (json.code === 200) {
          const prayers = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];
          const timings = json.data.timings;
          
          prayers.forEach(prayer => {
            const timeStr = timings[prayer];
            if (!timeStr) return;
            const [h, m] = timeStr.split(":").map(Number);
            const now = new Date();
            let target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0);
            
            // Apply lead time
            target.setMinutes(target.getMinutes() - (data.salatLeadTime || 15));
            if (target < now) target.setDate(target.getDate() + 1); // next day
            
            // Create the first alarm for the prayer
            chrome.alarms.create(`salat_${prayer}_1_${data.salatInterval || 2}_${data.salatRepeat || 3}`, { when: target.getTime() });
          });
          
          // Save the times so we can use them to format the toast notification string
          chrome.storage.local.set({ salatTimes: timings });

          // Refresh daily fetch logic setup
          chrome.alarms.create("salatRefresh", { periodInMinutes: 1440 });
        }
      } catch (err) {
        console.error("Salat API failed:", err);
      }
    } else {
      chrome.alarms.clear("salatRefresh");
    }
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
    // Process next notification after a brief delay so Chrome doesn't ignore concurrent calls
    setTimeout(processNotifQueue, 1000); 
  });

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      // Only send toasts here; Pomodoro break overlay is handled separately via showPomodoroBreak
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

// Smart Idle Detection
chrome.idle.onStateChanged.addListener(state => {
  if (state === "idle" || state === "locked") {
    handlePause();
    // Decay plant health if idle too long
    plantHealth = Math.max(0, plantHealth - 2);
    chrome.storage.sync.set({ plantHealth });
  } else if (state === "active") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) chrome.tabs.sendMessage(tabs[0].id, { action: "showToast", message: "Welcome back! Timer is currently paused." }).catch(() => {});
    });
  }
});

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
        chrome.runtime.sendMessage({ target: 'offscreen', action: 'playSound', url: cdata.customSounds[rawName] }).catch(() => {});
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
    
    // Read fresh settings from storage to avoid stale global bug
    chrome.storage.sync.get(["healthBreakBeepEnabled", "healthBreakBeepInterval", "continuousBeepSoundSelection", "soundsEnabled", "enabled"], freshData => {
      const beepOn = freshData.healthBreakBeepEnabled !== undefined ? !!freshData.healthBreakBeepEnabled : true;
      const sndOn = freshData.soundsEnabled !== false;
      const notiOn = freshData.enabled !== false;
      const beepSound = freshData.continuousBeepSoundSelection || "beep";
      const beepBpm = Math.max(1, parseInt(freshData.healthBreakBeepInterval) || 60);

      // Update in-memory globals to stay in sync
      healthBreakBeepEnabled = beepOn;
      healthBreakBeepInterval = beepBpm;
      continuousBeepSoundSelection = beepSound;

      // 3-way alert
      showNotification(`health-${Date.now()}`, `Health Break: ${text}`, false);
      
      if (beepOn && sndOn && notiOn) {
        // Use chrome.alarms (not setInterval) - service workers can sleep and kill setInterval
        // Store beep metadata in local storage so the alarm handler can retrieve it
        const beepPeriodMin = 1 / beepBpm; // period in minutes per beep
        const beepEndTime = Date.now() + (duration * 1000);
        chrome.storage.local.set({
          healthBeepActive: true,
          healthBeepSound: beepSound,
          healthBeepEndTime: beepEndTime
        }, () => {
          chrome.alarms.clear("healthBreakBeep", () => {
            // Play first beep immediately
            playSpecificSound(beepSound);
            // Schedule repeating alarm for subsequent beeps
            chrome.alarms.create("healthBreakBeep", { periodInMinutes: Math.max(0.017, beepPeriodMin) });
          });
        });
      } else {
        // Beep off: just one notification chime
        playSound("reminder");
      }
      
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, { action: "showMicroBreak", text, duration }).catch(() => {});
        }
      });
    });
  } else if (alarm.name === "healthBreakBeep") {
    // Alarm-based beep tick for health breaks — reliable even when service worker wakes
    chrome.storage.local.get(["healthBeepActive", "healthBeepSound", "healthBeepEndTime"], d => {
      if (!d.healthBeepActive) {
        chrome.alarms.clear("healthBreakBeep");
        return;
      }
      if (Date.now() >= (d.healthBeepEndTime || 0)) {
        // Duration expired, stop beeping
        chrome.storage.local.set({ healthBeepActive: false });
        chrome.alarms.clear("healthBreakBeep");
        return;
      }
      playSpecificSound(d.healthBeepSound || "beep");
    });
  } else if (alarm.name === "focusModeCheck") {
    updateFocusModeRules();
  } else if (alarm.name === "dynamicHydration") {
    showNotification(`hydrate-${Date.now()}`, "💧 Hydration Check! Time to drink a glass of water.", false);
    playSound("reminder");
  } else if (alarm.name === "salatRefresh") {
    syncDynamicAlarms();
  } else if (alarm.name.startsWith("custom_")) {
    const text = alarm.name.split("_").slice(2).join("_");
    showNotification(`custom-${Date.now()}-${alarm.name}`, `🔔 Reminder: ${text}`, false);
    playSound("reminder");
    // if one-time, it doesn't repeat automatically, but we might want to clean it up next time sync runs or just rely on alarms api
  } else if (alarm.name.startsWith("salat_")) {
    const parts = alarm.name.split("_");
    const prayer = parts[1];
    const attempt = parseInt(parts[2]);
    const interval = parseInt(parts[3]);
    const maxRepeat = parseInt(parts[4]);
    
    // Check if we saved the actual time for this prayer in storage to include it
    chrome.storage.local.get(["salatTimes"], d => {
      const startTime = (d.salatTimes && d.salatTimes[prayer]) ? d.salatTimes[prayer] : "soon";
      showNotification(`salat-${prayer}-${Date.now()}`, `🕌 Time for ${prayer} is approaching. (Starts at ${startTime}) [Reminder ${attempt}/${maxRepeat}]`, false);
      playSound("gong");
      
      if (attempt < maxRepeat) {
        chrome.alarms.create(`salat_${prayer}_${attempt + 1}_${interval}_${maxRepeat}`, { delayInMinutes: interval });
      }
    });
  }
});

// Alarm Handler (v1.3 with Sound and Plant)
chrome.alarms.onAlarm.addListener(alarm => {
  // Beep during break
  if (alarm.name === "breakBeep") {
    playSpecificSound(continuousBeepSoundSelection);
    return;
  }

  if (alarm.name !== "breakReminder") return;

  chrome.idle.queryState(15, async state => {
    if (state !== "active") return;

    if (reminderMode === "pomodoro") {
      if (isWorkPhase) {
        pomodoroCycleCount++;
        
        let isLong = false;
        let breakLen = pomodoroBreak;

        if (pomodoroCycleCount >= longBreakCycles) {
          isLong = true;
          breakLen = longBreakDuration;
          pomodoroCycleCount = 0; // reset
        }
        isLongBreak = isLong;

        const breakMsg = isLong ? "Long break time! Amazing focus." : "Work session finished! Time for a short break.";
        showNotification(`pomodoro-work-${Date.now()}`, breakMsg, true);
        playSound("break_start");
        setAlarm(breakLen);
        isWorkPhase = false;

        // Show countdown overlay on active tab (like Advanced Health Breaks)
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
        chrome.alarms.clear("breakBeep"); // clear beeps if any

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
            if (diffDays > 1) newStreak = 1; // missed a day
          }
          streakCount = newStreak;
          chrome.storage.sync.set({ streakCount: newStreak, lastCompletionDate: today });
          // Send level-up toast
          chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
            if (tabs[0]) chrome.tabs.sendMessage(tabs[0].id, {
              action: "showToast",
              message: `🔥 Streak x${newStreak}! You've completed ${newStreak} session${newStreak>1?'s':''} in a row. Keep it up!`,
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
});

chrome.notifications.onButtonClicked.addListener((notifId, btnIdx) => {
  if (btnIdx === 0) setAlarm(5, true);
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || !msg.action) return false;

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
        } else {
          const startMin = pomodoroWork;
          isWorkPhase = true;
          setAlarm(startMin);
          // Removed updateFocusModeRules() here to prevent race condition with updateSettings
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
    chrome.storage.sync.get(["blocklist", "focusModeEnabled", "focusStartTime", "focusEndTime", "soundSelection", "microBreaksEnabled", "strictMode", "ambientNoise", "soundsEnabled"], data => {
      blocklist = data.blocklist || [];
      focusModeEnabled = data.focusModeEnabled || false;
      focusStartTime = data.focusStartTime || "09:00";
      focusEndTime = data.focusEndTime || "17:00";
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

async function handleAmbientNoise() {
  const isRunning = pausedRemainingMs === null && isWorkPhase;
  const shouldPlay = soundsEnabled && isRunning && ambientNoise !== "none";
  const action = shouldPlay ? "startAmbient" : "stopAmbient";
  const url = shouldPlay ? chrome.runtime.getURL(`sounds/${ambientNoise}.mp3`) : "";

  await setupOffscreenDocument("offscreen.html");
  chrome.runtime.sendMessage({ target: 'offscreen', action, url }).catch(() => {});
}

// Activity Tracking (for Stats Graph)
chrome.alarms.create("activityLogger", { periodInMinutes: 1 });

chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === "activityLogger") {
    chrome.idle.queryState(60, state => {
      if (state === "active") {
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
  }
});

