// components.js — Global Header & Footer for full pages (Settings, Analytics, etc.)
// Popup has its own compact header/footer and does NOT use this file.

const DC_PAGES = {
  settings: { label: "Settings", url: "options.html", action: () => chrome.runtime.openOptionsPage() },
  analytics: { label: "Analytics", url: "stats.html" },
};

const DC_LINKS = {
  review: { label: "Review Us", url: "https://chromewebstore.google.com/detail/deepcycle/kclcldpjhdjdabblaljlfibkdjelclnh" },
  tools: { label: "More Tools", url: "https://chromewebstore.google.com/search/degird" },
  products: { label: "Degird Products", url: "https://degird.com/products#extensions" },
};

// Inject global styles once
(function injectGlobalStyles() {
  if (document.getElementById("dc-global-styles")) return;
  const style = document.createElement("style");
  style.id = "dc-global-styles";
  style.textContent = `
    /* === HEADER === */
    .dc-header {
      margin: 0 0 20px;
      padding: 0;
    }
    .dc-header-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 4px 0 12px;
    }
    .dc-header-left {
      display: flex;
      align-items: center;
      gap: 20px;
    }
    .dc-header-brand {
      font-size: 17px;
      font-weight: 700;
      color: var(--text);
      letter-spacing: -0.3px;
    }
    .dc-header-nav {
      display: flex;
      gap: 4px;
    }
    .dc-nav-link {
      font-size: 12px;
      font-weight: 500;
      color: var(--text-muted);
      text-decoration: none;
      cursor: pointer;
      padding: 5px 14px;
      border-radius: 6px;
      transition: all 0.15s ease;
      border: 1px solid transparent;
    }
    .dc-nav-link:hover {
      color: var(--brand-lime);
      background: rgba(174,237,34,0.08);
    }
    .dc-nav-link.active {
      color: var(--brand-lime);
      font-weight: 600;
      background: transparent;
      cursor: default;
      border-color: transparent;
      border-bottom: 2px solid var(--brand-lime);
      border-radius: 0;
      padding: 5px 0 3px;
    }
    .dc-nav-link.active:hover {
      background: transparent;
      color: var(--brand-lime);
    }
    .dc-header-powered {
      font-size: 10px;
      color: var(--text-muted);
      opacity: 0.6;
    }
    .dc-header-powered a {
      color: var(--brand-lime);
      text-decoration: none;
      font-weight: 600;
    }
    .dc-header-sep {
      border: none;
      border-top: 1px solid var(--border);
      margin: 0 0 10px;
    }
    .dc-header-desc {
      font-size: 11px;
      color: var(--text-muted);
      line-height: 1.5;
      margin: 0 0 16px;
      opacity: 0.7;
    }

    /* === FOOTER === */
    .dc-footer {
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid var(--border);
      text-align: center;
    }
    .dc-footer-links {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      font-size: 11px;
      margin-bottom: 10px;
    }
    .dc-footer-links a {
      color: var(--brand-lime);
      text-decoration: none;
      font-weight: 500;
      transition: opacity 0.15s;
    }
    .dc-footer-links a:hover {
      opacity: 0.8;
      text-decoration: underline;
    }
    .dc-footer-links .dot {
      color: var(--text-muted);
      opacity: 0.3;
      font-size: 10px;
    }
    .dc-footer-brand {
      font-size: 10px;
      color: var(--text-muted);
      opacity: 0.45;
      padding-bottom: 10px;
    }
    .dc-footer-brand a {
      color: var(--brand-lime);
      text-decoration: none;
      font-weight: 600;
    }
  `;
  document.head.appendChild(style);
})();

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
          <span class="dc-header-brand">DeepCycle</span>
          <nav class="dc-header-nav">${nav}</nav>
        </div>
        <span class="dc-header-powered">Powered by <a href="https://degird.com/products#extensions" target="_blank">Degird</a></span>
      </div>
      <hr class="dc-header-sep">
      <p class="dc-header-desc">${description}</p>
    </header>`;
}

function dcRenderFooter() {
  const links = Object.values(DC_LINKS).map(l =>
    `<a href="${l.url}" target="_blank">${l.label}</a>`
  ).join('<span class="dot">·</span>');

  return `
    <footer class="dc-footer">
      <div class="dc-footer-links">${links}</div>
      <div class="dc-footer-brand">Made with focus by <a href="https://degird.com" target="_blank">Degird</a> — Build better habits.</div>
    </footer>`;
}

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
