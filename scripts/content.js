// content.js - Handles the Break Overlay and In-page Toasts
let overlay = null;

function _esc(str) {
  const d = document.createElement("div");
  d.textContent = str;
  return d.innerHTML;
}


chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "showOverlay") {
    createOverlay(msg.message, msg.tip);
  } else if (msg.action === "hideOverlay") {
    removeOverlay();
  } else if (msg.action === "showToast") {
    showToast(msg.message, msg.duration);
  } else if (msg.action === "showMicroBreak") {
    showMicroBreakCountdown(msg.text, msg.duration);
  } else if (msg.action === "showPomodoroBreak") {
    showPomodoroBreakOverlay(msg.text, msg.duration);
  }
});

function createOverlay(message, tip) {
  if (overlay) return;

  overlay = document.createElement("div");
  overlay.className = "eyebrak-overlay";
  overlay.innerHTML = `
    <h1>Take a Break</h1>
    <p>${_esc(message)}</p>
    <div class="breathing-container">
      <div class="breathing-circle"></div>
      <p>Breath in... Breath out...</p>
    </div>
    <p style="margin-top: 20px; font-style: italic; font-size: 16px;">Tip: ${_esc(tip)}</p>
  `;
  document.body.appendChild(overlay);
}

function removeOverlay() {
  if (overlay) {
    overlay.style.opacity = "0";
    setTimeout(() => {
      if (overlay && overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
      overlay = null;
    }, 500);
  }
  
  // Also clear any active Pomodoro break overlays
  document.querySelectorAll('.deepcycle-pomo-overlay').forEach(el => {
    el.style.opacity = "0";
    setTimeout(() => el.remove(), 500);
  });
}

function showToast(message, duration = 5000) {
  const toast = document.createElement("div");
  toast.className = "eyebrak-toast";
  toast.innerHTML = `
    <div class="icon"></div>
    <div>${_esc(message)}</div>
  `;
  document.body.appendChild(toast);
  
  setTimeout(() => toast.classList.add("show"), 100);
  
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 500);
  }, duration);
}

function showMicroBreakCountdown(text = "Rest your eyes.", duration = 20) {
  const overlay = document.createElement("div");
  overlay.className = "deepcycle-micro-overlay";
  overlay.innerHTML = `
    <div class="micro-card">
      <h2>Health Break</h2>
      <p id="microText">${_esc(text)}</p>
      <div class="micro-timer">
        <svg width="120" height="120" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="8" />
          <circle id="microProgress" cx="60" cy="60" r="54" fill="none" stroke="#AEED22" stroke-width="8"
            stroke-dasharray="339.29" stroke-dashoffset="0" stroke-linecap="round"
            style="transition: stroke-dashoffset 1s linear; transform: rotate(-90deg); transform-origin: center;" />
        </svg>
        <div class="micro-text" id="microSecs">${duration}</div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  
  // Animation loop
  let secs = duration;
  const progressEl = overlay.querySelector("#microProgress");
  const textEl = overlay.querySelector("#microSecs");
  const circ = 339.29; // 2 * pi * 54

  const loop = setInterval(() => {
    secs--;
    if (secs < 0) {
      clearInterval(loop);
      overlay.style.opacity = "0";
      setTimeout(() => overlay.remove(), 500);
      return;
    }
    textEl.textContent = secs;
    const progress = secs / duration;
    progressEl.style.strokeDashoffset = circ * (1 - progress);
  }, 1000);
}

function showPomodoroBreakOverlay(text = "Take a break", duration = 300) {
  // Clear existing if any
  document.querySelectorAll('.deepcycle-pomo-overlay').forEach(el => el.remove());

  const overlay = document.createElement("div");
  overlay.className = "deepcycle-micro-overlay deepcycle-pomo-overlay"; // Reuses the CSS container style
  overlay.innerHTML = `
    <div class="micro-card">
      <h2 style="background: linear-gradient(90deg, #81c784, #ffffff); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;">Pomodoro Break</h2>
      <p id="pomoText">${_esc(text)}</p>
      <div class="micro-timer">
        <svg width="120" height="120" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="8" />
          <circle id="pomoProgress" cx="60" cy="60" r="54" fill="none" stroke="#AEED22" stroke-width="8"
            stroke-dasharray="339.29" stroke-dashoffset="0" stroke-linecap="round"
            style="transition: stroke-dashoffset 1s linear; transform: rotate(-90deg); transform-origin: center;" />
        </svg>
        <div class="micro-text" id="pomoSecs" style="color: #AEED22; font-size: 28px;"></div>
      </div>
      <button id="pomoDismissBtn" style="margin-top: 24px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: white; padding: 8px 16px; border-radius: 8px; cursor: pointer; transition: background 0.2s; font-family: 'Inter', sans-serif;">Dismiss</button>
    </div>
  `;
  document.body.appendChild(overlay);

  // Formatting helper for MM:SS
  const formatTime = (totalSeconds) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };
  
  // Animation loop
  let secs = duration;
  const progressEl = overlay.querySelector("#pomoProgress");
  const textEl = overlay.querySelector("#pomoSecs");
  const circ = 339.29; 

  textEl.textContent = formatTime(secs);

  const loop = setInterval(() => {
    secs--;
    if (secs < 0) {
      clearInterval(loop);
      overlay.style.opacity = "0";
      setTimeout(() => overlay.remove(), 500);
      return;
    }
    textEl.textContent = formatTime(secs);
    const progress = secs / duration;
    progressEl.style.strokeDashoffset = circ * (1 - progress);
  }, 1000);

  // Allow user to dismiss if they want to
  overlay.querySelector("#pomoDismissBtn").addEventListener("click", () => {
    clearInterval(loop);
    overlay.style.opacity = "0";
    setTimeout(() => overlay.remove(), 500);
  });
}
