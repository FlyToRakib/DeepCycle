// components.js — Global Header & Footer for full pages (Settings, Analytics, etc.)
// Popup has its own compact header/footer and does NOT use this file.

const DC_PAGES = {
  settings: { label: "Settings", url: "options/options.html", action: () => chrome.runtime.openOptionsPage() },
  analytics: { label: "Analytics", url: "pages/stats.html" },
};

const DC_LINKS = {
  review: { label: "REVIEW US", linkKey: "reviewUs" },
  tools: { label: "MORE TOOLS", linkKey: "moreTools" },
  privacy: { label: "PRIVACY", linkKey: "privacy" },
  support: { label: "SUPPORT", linkKey: "support" },
  guide: { label: "USER GUIDE", linkKey: "userGuide" },
};



function dcInitNav() {
  document.querySelectorAll(".dc-nav-link").forEach(link => {
    // Skip active tab — no click action needed
    if (link.classList.contains("active")) return;

    link.addEventListener("click", e => {
      e.preventDefault();
      const page = link.dataset.page;
      const pg = DC_PAGES[page];
      if (!pg) return;

      // Always try to find & reuse an existing tab for the target page
      const targetUrl = chrome.runtime.getURL(pg.url);
      chrome.tabs.query({}, tabs => {
        const existing = tabs.find(t => t.url && t.url.startsWith(targetUrl));
        if (existing) {
          // Reuse existing tab — just focus it
          chrome.tabs.update(existing.id, { active: true });
          chrome.windows.update(existing.windowId, { focused: true });
        } else if (pg.action) {
          // Use the action (e.g. openOptionsPage) if no tab exists
          pg.action();
        } else {
          // Create new tab
          chrome.tabs.create({ url: targetUrl });
        }
      });
    });
  });
}
