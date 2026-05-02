// links.js - Centralized configuration for all outbound links

const APP_LINKS = {
  privacy: "https://docs.google.com/document/d/1H-d_OIDWfj39sh9Q5pkCRr96lz-W8Mglr65PCovhvOY/edit?usp=sharing",
  reviewUs: "https://chromewebstore.google.com/detail/deepcycle/kclcldpjhdjdabblaljlfibkdjelclnh/reviews",
  degirdHome: "https://degird.com",
  degirdProducts: "https://degird.com/products#extensions",
  moreTools: "https://chromewebstore.google.com/search/degird",
  support: "https://degird.com/support",
  userGuide: "https://wpinlearn.com/how-to-use-deepcycle",
  shortcuts: "chrome://extensions/shortcuts"
};

function initDynamicLinks() {
  document.querySelectorAll('[data-link]').forEach(el => {
    const linkKey = el.getAttribute('data-link');
    if (APP_LINKS[linkKey]) {
      el.href = APP_LINKS[linkKey];
    }
  });
  // Dynamic copyright year
  const year = new Date().getFullYear();
  document.querySelectorAll('.dc-year').forEach(el => { el.textContent = year; });
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDynamicLinks);
  } else {
    initDynamicLinks();
  }
}
