// content.js - Handles the Break Overlay and In-page Toasts
let overlay = null;

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "showOverlay") {
    createOverlay(msg.message, msg.tip);
  } else if (msg.action === "hideOverlay") {
    removeOverlay();
  } else if (msg.action === "showToast") {
    showToast(msg.message);
  }
});

function createOverlay(message, tip) {
  if (overlay) return;

  overlay = document.createElement("div");
  overlay.className = "eyebrak-overlay";
  overlay.innerHTML = `
    <h1>Take a Break</h1>
    <p>${message}</p>
    <p style="margin-top: 20px; font-style: italic; font-size: 16px;">Tip: ${tip}</p>
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
}

function showToast(message) {
  const toast = document.createElement("div");
  toast.className = "eyebrak-toast";
  toast.innerHTML = `
    <div class="icon"></div>
    <div>${message}</div>
  `;
  document.body.appendChild(toast);
  
  // Trigger animation
  setTimeout(() => toast.classList.add("show"), 100);
  
  // Auto remove
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 500);
  }, 5000);
}
