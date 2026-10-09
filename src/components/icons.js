// The site's one icon set: small line icons drawn on a 24x24 grid in currentColor, so they take the
// colour of the text next to them. Decorative by default (aria-hidden); the label beside them carries
// the meaning.
const PATHS = {
  monitor: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
  calculator: '<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M8 6h8M8 11h2M14 11h2M8 15h2M14 15h2M8 18h2M14 18h2"/>',
  chart: '<path d="M2 20h20M5 20v-8M10 20V5M15 20v-5M20 20V9"/>',
  book: '<path d="M5 4h12a2 2 0 0 1 2 2v14H7a2 2 0 0 1-2-2z"/><path d="M5 18a2 2 0 0 1 2-2h12"/>',
  bulb: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z"/>',
  sliders: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
  cart: '<circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h3l2.5 12h11.5l2-8H6.2"/>',
  package: '<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5M12 13v8"/>',
  check: '<path d="m5 12 5 5 9-10"/>',
  alert: '<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17h.01"/>',
  bell: '<path d="M6 16v-5a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 21h4"/>',
  history: '<path d="M3 3v18h18"/><path d="m7 15 4-4 3 3 6-6"/>',
  zap: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>'
};

export const ICON_NAMES = Object.keys(PATHS);

/** Inline SVG markup for one icon. */
export function icon(name) {
  const paths = PATHS[name];
  if (!paths) throw new Error(`icon: unknown icon '${name}'`);
  return `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
}
