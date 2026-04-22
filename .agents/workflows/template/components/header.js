// header.js — Shared Header Component

const DC_PAGES = {
  settings: { label: "Settings", url: "options/options.html", action: () => chrome.runtime.openOptionsPage() },
  analytics: { label: "Analytics", url: "pages/stats.html" },
};

function dcRenderHeader(activePage, description) {
  const nav = Object.entries(DC_PAGES).map(([key]) => {
    const pg = DC_PAGES[key];
    const cls = key === activePage ? "dc-nav-link active" : "dc-nav-link";
    return `<a class="${cls}" data-page="${key}">${pg.label}</a>`;
  }).join("");

  return `
    <header class="dc-header">
      <div class="dc-header-bar">
        <div class="dc-header-left">
          <span class="dc-header-brand">ExtensionName</span>
          <nav class="dc-header-nav">${nav}</nav>
        </div>
        <span class="dc-header-powered">Powered by <a href="#" data-link="degirdProducts" target="_blank">Degird</a></span>
      </div>
      <hr class="dc-header-sep">
      <p class="dc-header-desc">${description}</p>
    </header>`;
}

function dcInitNav() {
  document.querySelectorAll(".dc-nav-link").forEach(link => {
    if (link.classList.contains("active")) return;

    link.addEventListener("click", e => {
      e.preventDefault();
      const page = link.dataset.page;
      const pg = DC_PAGES[page];
      if (!pg) return;

      const targetUrl = chrome.runtime.getURL(pg.url);
      chrome.tabs.query({}, tabs => {
        const existing = tabs.find(t => t.url && t.url.startsWith(targetUrl));
        if (existing) {
          chrome.tabs.update(existing.id, { active: true });
          chrome.windows.update(existing.windowId, { focused: true });
        } else if (pg.action) {
          pg.action();
        } else {
          chrome.tabs.create({ url: targetUrl });
        }
      });
    });
  });
}
