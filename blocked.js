document.addEventListener('DOMContentLoaded', () => {
  // Go back button logic
  const goBackBtn = document.getElementById('goBackBtn');
  if (goBackBtn) {
    goBackBtn.addEventListener('click', () => {
      history.back();
    });
  }

  // Show which site was blocked
  const params = new URLSearchParams(window.location.search);
  const blockedSite = params.get('site');
  if (blockedSite) {
    const blockedUrlEl = document.getElementById('blockedUrl');
    if (blockedUrlEl) {
      blockedUrlEl.textContent = '🚫 ' + blockedSite;
    }
  }

  // Create floating particles
  const container = document.getElementById('particles');
  if (container) {
    for (let i = 0; i < 20; i++) {
      const p = document.createElement('div');
      p.className = 'particle';
      const size = Math.random() * 80 + 20;
      p.style.cssText = `
        width: ${size}px;
        height: ${size}px;
        left: ${Math.random() * 100}%;
        animation-duration: ${Math.random() * 15 + 10}s;
        animation-delay: ${Math.random() * -20}s;
      `;
      container.appendChild(p);
    }
  }

  // Show remaining time from chrome alarms
  try {
    chrome.alarms.get('breakReminder', alarm => {
      if (alarm) {
        const tick = () => {
          const rem = Math.max(0, alarm.scheduledTime - Date.now());
          const m = Math.floor(rem / 60000);
          const s = Math.floor((rem % 60000) / 1000);
          const timeDisplay = document.getElementById('timeDisplay');
          if (timeDisplay) {
            timeDisplay.textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
          }
          if (rem > 0) setTimeout(tick, 1000);
        };
        tick();
      }
    });
  } catch(e) { /* Running outside extension context */ }
});
