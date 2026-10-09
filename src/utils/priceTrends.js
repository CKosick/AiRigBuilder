// 7-day and 30-day price trends from the apply audit log (data/price_history_log.json).
// A trend is only reported when the log holds a price observed roughly that long before the
// latest one; otherwise it is null, so the site shows "n/a" instead of an invented number.

const DAY_MS = 24 * 60 * 60 * 1000;

// Accepted age (in days) of the comparison price for each trend window
export const TREND_WINDOWS = {
  trend7d: { days: 7, minDays: 5, maxDays: 10 },
  trend30d: { days: 30, minDays: 25, maxDays: 40 }
};

/** Every price applied for one GPU, oldest first: [{ at: ms, price }] */
export function priceObservations(auditLog, gpuId) {
  const points = [];
  for (const run of auditLog || []) {
    const at = Date.parse(run.appliedAt);
    if (Number.isNaN(at)) continue;
    for (const u of run.updates || []) {
      if (u.id === gpuId && typeof u.newPrice === 'number') points.push({ at, price: u.newPrice });
    }
  }
  return points.sort((a, b) => a.at - b.at);
}

function pctChange(from, to) {
  return parseFloat((((to - from) / from) * 100).toFixed(1));
}

/**
 * { trend7d, trend30d } for one GPU: percent change from the observation closest to N days
 * before the latest one (within that window's accepted range) to currentPrice, or null.
 */
export function computePriceTrends(auditLog, gpuId, currentPrice) {
  const points = priceObservations(auditLog, gpuId);
  const result = Object.fromEntries(Object.keys(TREND_WINDOWS).map(key => [key, null]));
  if (points.length < 2) return result;

  const latestAt = points[points.length - 1].at;
  for (const [key, w] of Object.entries(TREND_WINDOWS)) {
    let best = null;
    for (const p of points) {
      const ageDays = (latestAt - p.at) / DAY_MS;
      if (ageDays < w.minDays || ageDays > w.maxDays) continue;
      if (!best || Math.abs(ageDays - w.days) < Math.abs(best.ageDays - w.days)) best = { ...p, ageDays };
    }
    if (best && best.price > 0) result[key] = pctChange(best.price, currentPrice);
  }
  return result;
}

/** Trend badge HTML for the tracker and GPU pages; "n/a" when the trend is unavailable. */
export function trendBadgeHtml(pct) {
  if (typeof pct !== 'number') {
    return '<span class="trend-badge trend-na" title="Not enough price history yet for this period">n/a</span>';
  }
  const down = pct <= 0;
  return `<span class="trend-badge ${down ? 'trend-down' : 'trend-up'}">${down ? '▼' : '▲'} ${Math.abs(pct)}%</span>`;
}
