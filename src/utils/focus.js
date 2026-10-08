// Keeps keyboard focus on the same control when a component re-renders its innerHTML.

const KEY_ATTRS = ['data-tier-id', 'data-model-id', 'data-cat', 'data-sort', 'data-gpu-id'];

function selectorFor(el) {
  if (el.id) return `#${CSS.escape(el.id)}`;
  for (const attr of KEY_ATTRS) {
    const val = el.getAttribute(attr);
    if (val !== null) return `${el.tagName.toLowerCase()}[${attr}="${CSS.escape(val)}"]`;
  }
  return null;
}

/**
 * Call before replacing container.innerHTML; call the returned function after.
 */
export function preserveFocus(container) {
  const active = document.activeElement;
  const selector = active && active !== document.body && container.contains(active) ? selectorFor(active) : null;
  return () => {
    if (!selector) return;
    const el = container.querySelector(selector);
    if (el) el.focus({ preventScroll: true });
  };
}
