// background.js - final fix (pause/resume robust, consistent repeating alarms)

// defaults
let reminderInterval = 15;
let reminderMode = "interval"; // "interval" | "one-time" | "pomodoro"
let notificationsEnabled = true;
let pomodoroWork = 25;
let pomodoroBreak = 5;
let isWorkPhase = true;
let streakCount = 0;

let tips = [];
// pausedRemainingMs persisted in storage when paused
// Use in-memory copy for quick access but always update storage when changed
let pausedRemainingMs = null;

// load settings & paused info
chrome.storage.sync.get(
  ["interval", "mode", "enabled", "pomodoroWork", "pomodoroBreak", "streakCount", "pausedRemainingMs", "totalReminders", "breaksTaken"],
  data => {
    if (data.interval) reminderInterval = data.interval;
    if (data.mode) reminderMode = data.mode;
    if (data.enabled !== undefined) notificationsEnabled = data.enabled;
    if (data.pomodoroWork) pomodoroWork = data.pomodoroWork;
    if (data.pomodoroBreak) pomodoroBreak = data.pomodoroBreak;
    if (data.streakCount) streakCount = data.streakCount;
    if (data.pausedRemainingMs) pausedRemainingMs = data.pausedRemainingMs;
    if (data.totalReminders === undefined) chrome.storage.sync.set({ totalReminders: 0 });
    if (data.breaksTaken === undefined) chrome.storage.sync.set({ breaksTaken: 0 });

    // FIX: Check if alarm already exists before setting a new one
    // This prevents the timer from resetting to full on service worker restart
    chrome.alarms.get("breakReminder", (alarm) => {
      if (!alarm && !pausedRemainingMs) {
        setAlarm(reminderMode === "pomodoro" ? pomodoroWork : reminderInterval);
      }
    });
  }
);

// load tips file
fetch(chrome.runtime.getURL("tips.json"))
  .then(r => r.json())
  .then(d => tips = d)
  .catch(_ => tips = ["Take a short break!"]);

// show notification and update stats
function showNotification(message) {
  if (!notificationsEnabled) return;
  const tip = tips.length ? tips[Math.floor(Math.random() * tips.length)] : "";
  
  // 1. Standard Desktop Notification
  chrome.notifications.create({
    type: "basic",
    iconUrl: "icons/icon128.png",
    title: "Eyebrak Reminder",
    message: `${message} ${tip}`,
    priority: 2,
    buttons: [{ title: "Snooze 5 min" }]
  });

  // 2. In-Page Overlays & Toasts
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      if (reminderMode === "pomodoro" && !isWorkPhase) {
        // Just finished work, about to start break -> Show Overlay
        chrome.tabs.sendMessage(tabs[0].id, { action: "showOverlay", message, tip });
      } else {
        // Regular interval or break finished -> Show Toast
        chrome.tabs.sendMessage(tabs[0].id, { action: "showToast", message: `${message} ${tip}` });
      }
    }
  });

  chrome.storage.sync.get(["totalReminders","breaksTaken"], data => {
    const total = (data.totalReminders || 0) + 1;
    const breaks = (data.breaksTaken || 0) + 1;
    chrome.storage.sync.set({ totalReminders: total, breaksTaken: breaks });
  });
}

// set/reset alarm - always use the passed minutes for delay and (if repeating) for period
function setAlarm(minutes) {
  // minutes: number (may be decimal)
  chrome.alarms.clear("breakReminder", () => {
    if (reminderMode === "interval") {
      chrome.alarms.create("breakReminder", {
        delayInMinutes: minutes,
        periodInMinutes: minutes
      });
    } else {
      // one-time and pomodoro: single-delay alarm
      chrome.alarms.create("breakReminder", { delayInMinutes: minutes });
    }
    // Update last start time to allow UI progress tracking
    chrome.storage.local.set({ lastAlarmScheduledTime: Date.now(), lastAlarmDurationMin: minutes });
  });
}

// pause: compute remaining ms, persist it, clear alarm, then respond via sendResponse
function handlePause(sendResponse) {
  chrome.alarms.get("breakReminder", (alarm) => {
    if (!alarm) {
      pausedRemainingMs = null;
      chrome.storage.sync.remove("pausedRemainingMs", () => {
        sendResponse({ status: "paused", pausedRemainingMs: null });
      });
      return;
    }
    const remaining = Math.max(0, alarm.scheduledTime - Date.now());
    pausedRemainingMs = remaining;
    chrome.alarms.clear("breakReminder", () => {
      chrome.storage.sync.set({ pausedRemainingMs: pausedRemainingMs }, () => {
        sendResponse({ status: "paused", pausedRemainingMs: pausedRemainingMs });
      });
    });
  });
}

// resume: if pausedRemainingMs exists, schedule using it, else start fresh
function handleResume(sendResponse) {
  chrome.storage.sync.get(["pausedRemainingMs"], data => {
    const pr = data.pausedRemainingMs;
    if (pr && pr > 0) {
      // schedule with the remaining ms
      const delayMin = pr / 60000;
      chrome.storage.sync.remove("pausedRemainingMs", () => {
        pausedRemainingMs = null;
        setAlarm(delayMin);
        sendResponse({ status: "resumed", resumedFrom: pr });
      });
    } else {
      // start fresh
      const startMin = (reminderMode === "pomodoro") ? pomodoroWork : reminderInterval;
      // reset pomodoro phase to work when resuming from nothing (keeps consistent)
      if (reminderMode === "pomodoro") isWorkPhase = true;
      setAlarm(startMin);
      sendResponse({ status: "resumed", resumedFrom: null });
    }
  });
}

// alarm handler
chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name !== "breakReminder") return;

  chrome.idle.queryState(15, state => {
    if (state !== "active") return;

    if (reminderMode === "pomodoro") {
      if (isWorkPhase) {
        showNotification("Pomodoro work finished! Time for a break.");
        setAlarm(pomodoroBreak);
        isWorkPhase = false;
      } else {
        // Break finished, hide overlay if active
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]) chrome.tabs.sendMessage(tabs[0].id, { action: "hideOverlay" });
        });

        showNotification("Break finished! Start next Pomodoro.");
        streakCount++;
        chrome.storage.sync.set({ streakCount: streakCount });
        setAlarm(pomodoroWork);
        isWorkPhase = true;
      }
    } else {
      // interval or one-time
      showNotification("Time to take a break!");
      // interval alarms auto-repeat because created with periodInMinutes
    }

    if (reminderMode === "one-time") {
      // ensure no repeat
      chrome.alarms.clear("breakReminder");
    }
  });
});

// snooze button
chrome.notifications.onButtonClicked.addListener((notifId, btnIdx) => {
  if (btnIdx === 0) {
    setAlarm(5);
  }
});

// single message listener (MV3-safe)
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || !msg.action) {
    sendResponse({ error: "invalid_message" });
    return false;
  }

  if (msg.action === "updateAlarm") {
    // update in-memory and persist
    reminderMode = msg.mode || reminderMode;
    if (typeof msg.interval === "number") reminderInterval = msg.interval;
    if (typeof msg.pomodoroWork === "number") pomodoroWork = msg.pomodoroWork;
    if (typeof msg.pomodoroBreak === "number") pomodoroBreak = msg.pomodoroBreak;
    if (typeof msg.enabled === "boolean") notificationsEnabled = msg.enabled;

    chrome.storage.sync.set({
      mode: reminderMode,
      interval: reminderInterval,
      pomodoroWork: pomodoroWork,
      pomodoroBreak: pomodoroBreak,
      enabled: notificationsEnabled
    }, () => {
      // If currently paused, don't start alarms now
      chrome.storage.sync.get(["pausedRemainingMs"], data => {
        if (data.pausedRemainingMs) {
          sendResponse({ status: "ok", paused: true });
        } else {
          const startMin = (reminderMode === "pomodoro") ? pomodoroWork : reminderInterval;
          if (reminderMode === "pomodoro") isWorkPhase = true;
          setAlarm(startMin);
          sendResponse({ status: "ok", paused: false });
        }
      });
    });

    return true; // sendResponse asynchronously
  }

  if (msg.action === "getPhase") {
    sendResponse({ phase: reminderMode === "pomodoro" ? (isWorkPhase ? "Work" : "Break") : "--" });
    return false;
  }

  if (msg.action === "pause") {
    // pause, then respond asynchronously
    handlePause(sendResponse);
    return true; // we will call sendResponse async
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

  sendResponse({ error: "unknown_action" });
  return false;
});
