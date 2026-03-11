// options.js - Modern Settings Logic
const modeSelect = document.getElementById("mode");
const intervalInput = document.getElementById("interval");
const pomodoroWorkInput = document.getElementById("pomodoroWork");
const pomodoroBreakInput = document.getElementById("pomodoroBreak");
const enabledCheckbox = document.getElementById("enabled");
const saveBtn = document.getElementById("saveBtn");
const statusEl = document.getElementById("status");

const intervalCard = document.getElementById("intervalCard");
const pomodoroCard = document.getElementById("pomodoroCard");

// Load current settings
chrome.storage.sync.get(["mode","interval","pomodoroWork","pomodoroBreak","enabled"], data => {
  modeSelect.value = data.mode || "interval";
  intervalInput.value = (data.interval !== undefined) ? data.interval : 15;
  pomodoroWorkInput.value = data.pomodoroWork || 25;
  pomodoroBreakInput.value = data.pomodoroBreak || 5;
  enabledCheckbox.checked = (data.enabled !== undefined) ? data.enabled : true;
  toggleFields();
});

function toggleFields() {
  if (modeSelect.value === "pomodoro") {
    intervalCard.classList.add("hidden");
    pomodoroCard.classList.remove("hidden");
  } else {
    intervalCard.classList.remove("hidden");
    pomodoroCard.classList.add("hidden");
  }
}

modeSelect.addEventListener("change", toggleFields);

saveBtn.addEventListener("click", () => {
  const mode = modeSelect.value;
  const interval = Math.max(1, parseInt(intervalInput.value) || 15);
  const pomodoroWork = Math.max(1, parseInt(pomodoroWorkInput.value) || 25);
  const pomodoroBreak = Math.max(1, parseInt(pomodoroBreakInput.value) || 5);
  const enabled = !!enabledCheckbox.checked;

  chrome.runtime.sendMessage({
    action: "updateAlarm",
    mode,
    interval,
    pomodoroWork,
    pomodoroBreak,
    enabled
  }, (resp) => {
    statusEl.textContent = (resp && resp.paused) ? "Settings Saved (Paused)" : "Settings Saved!";
    saveBtn.textContent = "Saved";
    setTimeout(() => {
      statusEl.textContent = "";
      saveBtn.textContent = "Save Settings";
    }, 2000);
  });

  chrome.storage.sync.set({ mode, interval, pomodoroWork, pomodoroBreak, enabled });
});
