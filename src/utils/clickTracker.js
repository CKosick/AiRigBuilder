// src/utils/clickTracker.js
// Single delegated click listener for outbound merchant links (anchors rendered with rel="sponsored").
// Uses navigator.sendBeacon('/api/click', ...) exclusively so navigation is never delayed or blocked.

/**
 * Extracts the outbound click payload from an anchor element if it is a tracked merchant link.
 *
 * @param {Element | null} anchor
 * @param {string} [pagePath]
 * @returns {{ path: string, merchant: string, linkId: string } | null}
 */
export function buildClickPayload(anchor, pagePath = '/') {
  if (!anchor || typeof anchor.getAttribute !== 'function') return null;

  const rel = anchor.getAttribute('rel') || '';
  if (!rel.split(/\s+/).includes('sponsored')) return null;

  const href = anchor.getAttribute('href') || '';
  if (!href || href === '#') return null;

  const merchant = (anchor.getAttribute('data-click-merchant') || '').trim();
  let linkId = (anchor.getAttribute('data-click-id') || '').trim();

  if (!linkId) {
    const modelId = anchor.getAttribute('data-model-id');
    const tierId = anchor.getAttribute('data-tier-id');
    const partName = anchor.getAttribute('data-part-name');
    const gpuId = anchor.getAttribute('data-gpu-id');
    const linkKind = anchor.getAttribute('data-link-kind');
    if (modelId && tierId && partName) {
      linkId = `build:${modelId}:${tierId}:${partName}`;
    } else if (gpuId && linkKind) {
      linkId = `gpu:${gpuId}:${linkKind}`;
    }
  }

  if (!merchant || !linkId) return null;

  return {
    path: pagePath || '/',
    merchant,
    linkId
  };
}

/**
 * Attaches one delegated click listener to root (default: document) watching merchant links.
 *
 * @param {Document | Element} [root]
 * @param {{ sendBeacon?: (url: string, data: string) => boolean, getPath?: () => string }} [options]
 */
export function initOutboundClickTracking(
  root = typeof document !== 'undefined' ? document : null,
  {
    sendBeacon = typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function'
      ? navigator.sendBeacon.bind(navigator)
      : null,
    getPath = () => (typeof window !== 'undefined' && window.location ? window.location.pathname : '/')
  } = {}
) {
  if (!root || typeof root.addEventListener !== 'function') return () => {};

  const onClick = (event) => {
    const target = event?.target;
    const anchor = target && typeof target.closest === 'function'
      ? target.closest('a[rel~="sponsored"]')
      : null;
    if (!anchor) return;

    const payload = buildClickPayload(anchor, getPath());
    if (!payload || typeof sendBeacon !== 'function') return;

    try {
      sendBeacon('/api/click', JSON.stringify(payload));
    } catch {
      // Never block or interfere with outbound navigation
    }
  };

  root.addEventListener('click', onClick);
  return () => root.removeEventListener('click', onClick);
}
