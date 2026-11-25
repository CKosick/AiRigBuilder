// Monthly GPU price history helpers.
// History entries are { date: 'Oct 2026', price } with one entry per calendar month.

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function monthLabel(date = new Date()) {
  return `${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

function parseLabel(label) {
  const [mon, year] = String(label).split(' ');
  const m = MONTHS.indexOf(mon);
  const y = Number(year);
  return m >= 0 && Number.isInteger(y) ? y * 12 + m : null;
}

/**
 * Records a price for the given month: updates that month's entry if it is the
 * latest one, otherwise appends a new entry.
 */
export function recordMonthlyPrice(history, price, date = new Date()) {
  const label = monthLabel(date);
  const last = history[history.length - 1];
  if (last && last.date === label) last.price = price;
  else history.push({ date: label, price });
  return history;
}

function formatMonthIdx(idx) {
  return `${MONTHS[idx % 12]} ${Math.floor(idx / 12)}`;
}

/**
 * When two consecutive recorded history entries are more than minMonthsApart (default 2)
 * calendar months apart, returns { start, end, missingMonths } for the unrecorded span
 * strictly between them; otherwise returns null.
 */
export function historyGapBetween(olderDate, newerDate, minMonthsApart = 2) {
  const olderIdx = parseLabel(olderDate);
  const newerIdx = parseLabel(newerDate);
  if (olderIdx === null || newerIdx === null) return null;
  const diff = newerIdx - olderIdx;
  if (diff <= minMonthsApart) return null;
  return {
    start: formatMonthIdx(olderIdx + 1),
    end: formatMonthIdx(newerIdx - 1),
    missingMonths: diff - 1
  };
}

/**
 * Expands history into one point per month, with price null for months that
 * have no recorded data, so charts show gaps instead of compressing them.
 * Returns { points, missingMonths }.
 */
export function fillMonthGaps(history) {
  const points = [];
  let missingMonths = 0;
  let prev = null;
  for (const entry of history) {
    const idx = parseLabel(entry.date);
    if (idx === null) {
      points.push({ date: entry.date, price: entry.price });
      prev = null;
      continue;
    }
    if (prev !== null) {
      for (let i = prev + 1; i < idx; i++) {
        points.push({ date: `${MONTHS[i % 12]} ${Math.floor(i / 12)}`, price: null });
        missingMonths++;
      }
    }
    points.push({ date: entry.date, price: entry.price });
    prev = idx;
  }
  return { points, missingMonths };
}
