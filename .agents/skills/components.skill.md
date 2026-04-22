# DeepCycle Components Skill

## 1. Objective
Guide the implementation of the shared components architecture for all DeepCycle-based extensions. This ensures a perfectly replicable header, footer, and navigation structure.

## 2. Global Components Architecture
- Every full page (like Options, Settings, Analytics) MUST use the shared Header and Footer components.
- The Popup uses its own compact header/footer and does NOT use these full-page components.
- Shared structure files are located in `/components/`, `/styles/`, and `/config/`.

## 3. Header Integration Steps
1. Include the `header.js` component and `global.css` styles in your HTML file.
2. In your initialization script, target an element (e.g., `<div id="header-container"></div>`).
3. Call `dcRenderHeader(activePageKey, descriptionText)` and inject the result into the container via `innerHTML`.
4. Call `dcInitNav()` to initialize tab navigation logic.
5. Example:
   ```javascript
   document.getElementById('header-container').innerHTML = dcRenderHeader('settings', 'Configure your extension preferences.');
   dcInitNav();
   ```

## 4. Footer Integration Steps
1. Include the `footer.js` component and `global.css` styles in your HTML file.
2. Target a footer container (e.g., `<div id="footer-container"></div>`).
3. Call `dcRenderFooter()` and inject it via `innerHTML`.
4. The footer relies on the links configuration defined in `links.json` / `links.js`.

## 5. Dynamic Content & Link Configuration
- Extension-specific links (Review, More Tools, Products) are managed centrally.
- Define `APP_LINKS` and `DC_LINKS` globally.
- Use `data-link="key"` on HTML elements to auto-inject URLs via the central config.
- When an extension's ID or store URL changes, update only the central links file.

## 6. Avoiding Duplicate Logic
- Do NOT rewrite header navigation logic. `dcInitNav()` handles opening new tabs and focusing existing tabs for internal extension pages automatically.
- Do NOT rewrite the CSS for the header or footer. Rely on the injected styles or the shared `global.css`.
