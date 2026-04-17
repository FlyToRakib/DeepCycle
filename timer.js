// timer.js - Standalone Ad-Hoc Timer Logic
const durationInput = document.getElementById("durationInput");
const repIntervalInput = document.getElementById("repIntervalInput");
const repCyclesInput = document.getElementById("repCyclesInput");

const displaySection = document.getElementById("displaySection");
const timeDisplay = document.getElementById("timeDisplay");
const cycleStatusDisplay = document.getElementById("cycleStatusDisplay");

const startBtn = document.getElementById("startBtn");
const resetBtn = document.getElementById("resetBtn");
const timerContainer = document.querySelector(".timer-container");

const tabBtns = document.querySelectorAll(".tab-btn");
const tabContents = document.querySelectorAll(".tab-content");

let intervalId = null;
let remainingMs = 0;
let stopwatchMs = 0;
let isRunning = false;
let currentMode = "onetime"; // onetime, repetitive, stopwatch
let currentCycle = 1;
let totalCycles = 4;
let totalDurationMs = 0; // for SVG ring
let beepIntervalId = null;

const CIRCUMFERENCE = 879.64; // 2 * pi * 140
const timerProgressEl = document.getElementById("timerProgress");
const timerBeepToggle = document.getElementById("timerBeepToggle");

function updateRing(remainingMs, totalMs) {
  if (!timerProgressEl || totalMs <= 0) return;
  const fraction = Math.max(0, Math.min(1, remainingMs / totalMs));
  timerProgressEl.style.strokeDashoffset = CIRCUMFERENCE * (1 - fraction);
}

// Tab Switching
tabBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    if (isRunning) return; // Prevent switching while running
    
    tabBtns.forEach(b => b.classList.remove("active"));
    tabContents.forEach(c => c.classList.add("hidden"));
    
    btn.classList.add("active");
    currentMode = btn.dataset.tab;
    const content = document.getElementById(`tab-${currentMode}`);
    if (content) content.classList.remove("hidden");
    
    // Reset view whenever switching tabs
    resetTimer();
  });
});

function formatTime(ms) {
  const totalSeconds = Math.ceil(ms / 1000);
  const m = Math.floor(Math.abs(totalSeconds) / 60);
  const s = Math.abs(totalSeconds) % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function tick() {
  if (currentMode === "stopwatch") {
    stopwatchMs += 1000;
    timeDisplay.textContent = formatTime(stopwatchMs);
    return;
  }

  remainingMs -= 1000;
  if (remainingMs <= 0) {
    if (currentMode === "onetime") {
      remainingMs = 0;
      timeDisplay.textContent = "00:00";
      clearInterval(intervalId);
      isRunning = false;
      timerContainer.classList.remove("pulsing");
      playAlarmSound();
      startBtn.textContent = "Done";
      return;
    } else if (currentMode === "repetitive") {
      playAlarmSound();
      if (currentCycle >= totalCycles) {
        // Finished all cycles
        remainingMs = 0;
        timeDisplay.textContent = "00:00";
        clearInterval(intervalId);
        isRunning = false;
        timerContainer.classList.remove("pulsing");
        cycleStatusDisplay.textContent = `Completed ${totalCycles} Cycles`;
        startBtn.textContent = "Done";
        return;
      }
      // Start next cycle
      currentCycle++;
      const mins = parseInt(repIntervalInput.value) || 15;
      remainingMs = mins * 60000;
      cycleStatusDisplay.textContent = `Cycle ${currentCycle} / ${totalCycles}`;
    }
  }
  
  timeDisplay.textContent = formatTime(remainingMs);
  if (currentMode !== "stopwatch" && totalDurationMs > 0) {
    updateRing(remainingMs, totalDurationMs);
  }

  if (currentMode !== "stopwatch" && remainingMs <= 60000 && remainingMs > 0) {
    timerContainer.classList.add("pulsing");
  } else {
    timerContainer.classList.remove("pulsing");
  }
}

function playAlarmSound() {
  chrome.storage.sync.get(["soundSelection", "soundsEnabled"], data => {
    if (data.soundsEnabled === false) return;
    const soundName = data.soundSelection || "alert/chime";
    chrome.runtime.sendMessage({ action: "playStandAloneSound", sound: soundName }).catch(() => {});
  });
}

function startTimer() {
  if (isRunning) {
    // Treat as pause
    clearInterval(intervalId);
    if (beepIntervalId) clearInterval(beepIntervalId);
    isRunning = false;
    startBtn.textContent = "Resume";
    return;
  }
  
  if (startBtn.textContent === "Start" || startBtn.textContent === "Done") {
    if (startBtn.textContent === "Done") {
      resetTimer();
      return;
    }
    // Fresh start setup
    if (currentMode === "onetime") {
      const mins = parseInt(durationInput.value) || 25;
      remainingMs = mins * 60000;
      totalDurationMs = remainingMs;
      updateRing(remainingMs, totalDurationMs);
      timeDisplay.textContent = formatTime(remainingMs);
    } else if (currentMode === "repetitive") {
      const mins = parseInt(repIntervalInput.value) || 15;
      totalCycles = parseInt(repCyclesInput.value) || 4;
      currentCycle = 1;
      remainingMs = mins * 60000;
      totalDurationMs = remainingMs;
      updateRing(remainingMs, totalDurationMs);
      timeDisplay.textContent = formatTime(remainingMs);
      cycleStatusDisplay.textContent = `Cycle ${currentCycle} / ${totalCycles}`;
      cycleStatusDisplay.classList.remove("hidden");
      cycleStatusDisplay.style.opacity = "1";
    } else if (currentMode === "stopwatch") {
      stopwatchMs = 0;
      if (timerProgressEl) timerProgressEl.style.strokeDashoffset = "0";
      timeDisplay.textContent = "00:00";
    }
    
    tabContents.forEach(c => c.classList.add("hidden"));
    displaySection.classList.remove("hidden");
    resetBtn.classList.remove("hidden");
  }
  
  intervalId = setInterval(tick, 1000);
  isRunning = true;
  startBtn.textContent = "Pause";

  // Start optional beep loop
  if (beepIntervalId) clearInterval(beepIntervalId);
  if (timerBeepToggle && timerBeepToggle.checked) {
    beepIntervalId = setInterval(() => {
      chrome.storage.sync.get(["continuousBeepSoundSelection"], data => {
        const sound = data.continuousBeepSoundSelection || "beep/beep1";
        chrome.runtime.sendMessage({ action: "playStandAloneSound", sound: sound }).catch(() => {});
      });
    }, 5000); // beep every 5s
  }
}

function resetTimer() {
  clearInterval(intervalId);
  clearInterval(beepIntervalId);
  beepIntervalId = null;
  isRunning = false;
  remainingMs = 0;
  totalDurationMs = 0;
  stopwatchMs = 0;

  if (timerProgressEl) timerProgressEl.style.strokeDashoffset = "0";
  timerContainer.classList.remove("pulsing");
  displaySection.classList.add("hidden");
  cycleStatusDisplay.classList.add("hidden");
  cycleStatusDisplay.style.opacity = "0";
  resetBtn.classList.add("hidden");
  
  // Re-show active input
  tabContents.forEach(c => {
    if (c.id === `tab-${currentMode}`) {
      c.classList.remove("hidden");
    } else {
      c.classList.add("hidden");
    }
  });

  startBtn.textContent = "Start";
  
  if (currentMode === "onetime") {
    timeDisplay.textContent = "25:00";
  } else if (currentMode === "repetitive") {
    timeDisplay.textContent = "15:00";
  } else {
    timeDisplay.textContent = "00:00";
  }
}

startBtn.addEventListener("click", startTimer);
resetBtn.addEventListener("click", resetTimer);
