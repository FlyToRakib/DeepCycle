As a senior browser extension developer, implement the following improvements:

### 1. Global UI & Link Management Update

Improve the global header, footer, and all outbound links by making them dynamic instead of hardcoded.

* Replace all hardcoded links with a centralized dynamic link system.
* Ensure links can be easily managed and updated from a single configuration file.

### 2. UI Consistency

Use the exact UI layout and color scheme for:

* Options page
* Header
* Footer
* Popup header
* Popup footer

Follow the shared screenshots precisely.

* Header, footer, and body background color must be: `#111827`

### 3. Preserve Existing Text

Keep the following body text exactly as it is (do not modify it in any way):

"Take control of your focus by setting daily browsing limits for distracting websites. Use the global shortcut Alt+Shift+L to quickly access this interface."

### 4. Dynamic Link Management (Implementation Example)

Use a centralized script (e.g., `links.js`) to manage all outbound links dynamically instead of hardcoding them.

#### Example: `links.js`

```javascript
// links.js - Centralized configuration for all outbound links
// Update URLs here to change them across the entire extension without touching HTML.

const APP_LINKS = {
  privacy: "#",
  reviewUs: "#",
  degirdHome: "https://degird.com",
  degirdProducts: "https://degird.com/products#extensions",
  moreTools: "https://chromewebstore.google.com/search/degird",
  support: "https://degird.com/support",
  userGuide: "https://wpinlearn.com/how-to-use-{extension_name}"
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
```

### 5. Implementation Safety Requirement

While implementing this UI and link update:

* Ensure 100% that no features, functions, or existing code are broken.
* Do not modify or remove any existing functionality.
* Only implement the changes exactly as described above.

