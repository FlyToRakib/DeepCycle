// offscreen.js - Handles reliable audio playback
let ambientAudio = null;

chrome.runtime.onMessage.addListener(msg => {
  if (msg.target !== 'offscreen') return false;

  if (msg.action === 'playSound') {
    const audio = new Audio(msg.url);
    audio.play().catch(console.error);
  } 
  else if (msg.action === 'startAmbient') {
    if (ambientAudio) {
      ambientAudio.pause();
    }
    ambientAudio = new Audio(msg.url);
    ambientAudio.loop = true;
    ambientAudio.play().catch(console.error);
  } 
  else if (msg.action === 'stopAmbient') {
    if (ambientAudio) {
      ambientAudio.pause();
      ambientAudio = null;
    }
  }
});
