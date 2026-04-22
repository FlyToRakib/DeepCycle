// footer.js — Shared Footer Component

const DC_LINKS = {
  review: { label: "Review Us", linkKey: "reviewUs" },
  tools: { label: "More Tools", linkKey: "moreTools" },
  products: { label: "Degird Products", linkKey: "degirdProducts" },
};

function dcRenderFooter() {
  const links = Object.values(DC_LINKS).map(l =>
    `<a href="#" data-link="${l.linkKey}" target="_blank">${l.label}</a>`
  ).join('<span class="dot">|</span>');

  return `
    <footer class="dc-footer">
      <div class="dc-footer-brand">Made with focus by <a href="#" data-link="degirdHome" target="_blank">Degird</a> — Build better habits for a balanced life.</div>
      <div class="dc-footer-links">${links}</div>
    </footer>`;
}
