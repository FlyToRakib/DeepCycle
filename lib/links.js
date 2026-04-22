// links.js - Centralized configuration for all outbound links

const APP_LINKS = {
  degirdHome: "https://degird.com",
  degirdProducts: "https://degird.com/products#extensions",
  reviewUs: "https://chromewebstore.google.com/detail/deepcycle/kclcldpjhdjdabblaljlfibkdjelclnh/reviews",
  moreTools: "https://chromewebstore.google.com/search/degird",
  shortcuts: "chrome://extensions/shortcuts"
};

function initDynamicLinks() {
  document.querySelectorAll('[data-link]').forEach(el => {
    const linkKey = el.getAttribute('data-link');
    if (APP_LINKS[linkKey]) {
      el.href = APP_LINKS[linkKey];
    }
  });
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDynamicLinks);
  } else {
    initDynamicLinks();
  }
}
