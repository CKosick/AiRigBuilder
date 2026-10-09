// Small inline-SVG price history line for table rows. Pure string output, so the prerendered
// tracker shows it without JavaScript. Months with no data break the solid line; a faint dashed
// join marks the gap.
import { fillMonthGaps } from './priceHistory.js';

const fmt = (n) => `$${Math.round(n).toLocaleString('en-US')}`;

/** SVG markup for one GPU's monthly history, or '' when there is nothing to draw. */
export function sparklineSvg(history, { width = 120, height = 32, pad = 3 } = {}) {
  const { points, missingMonths } = fillMonthGaps(history || []);
  const known = points.filter(p => typeof p.price === 'number');
  if (known.length === 0) return '';

  const prices = known.map(p => p.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const x = (i) => points.length === 1 ? width / 2 : pad + (i * (width - 2 * pad)) / (points.length - 1);
  const y = (p) => max === min ? height / 2 : pad + ((max - p) * (height - 2 * pad)) / (max - min);
  const r = (n) => Math.round(n * 10) / 10;

  // One path per run of consecutive months with data; a run of one month is drawn as a dot
  const runs = [];
  let run = [];
  points.forEach((p, i) => {
    if (typeof p.price === 'number') run.push([r(x(i)), r(y(p.price))]);
    else if (run.length) { runs.push(run); run = []; }
  });
  if (run.length) runs.push(run);

  const lines = runs.filter(rn => rn.length > 1)
    .map(rn => `<path d="M${rn.map(([px, py]) => `${px} ${py}`).join(' L')}" />`).join('');
  // Faint dashed joins across months with no data, so the gap reads as "no data", not a price move
  const gaps = runs.slice(1).map((rn, i) => {
    const [ax, ay] = runs[i][runs[i].length - 1];
    const [bx, by] = rn[0];
    return `<path d="M${ax} ${ay} L${bx} ${by}" />`;
  }).join('');
  const dots = runs.filter(rn => rn.length === 1)
    .map(([[px, py]]) => `<circle cx="${px}" cy="${py}" r="1.6" />`).join('');
  const [lx, ly] = runs[runs.length - 1][runs[runs.length - 1].length - 1];

  const first = known[0];
  const last = known[known.length - 1];
  const label = `Monthly price history: ${first.date} ${fmt(first.price)} to ${last.date} ${fmt(last.price)}`
    + (missingMonths > 0 ? `, ${missingMonths} months without data` : '');

  return `<svg class="sparkline" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="${label}">`
    + (gaps ? `<g class="sparkline-gap">${gaps}</g>` : '')
    + `<g class="sparkline-line">${lines}${dots}</g><circle class="sparkline-last" cx="${lx}" cy="${ly}" r="2.4" /></svg>`;
}
