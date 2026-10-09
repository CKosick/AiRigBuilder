import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const COMPONENTS_DIR = path.join(ROOT_DIR, 'src', 'components');
const components = fs.readdirSync(COMPONENTS_DIR).filter(f => f.endsWith('.js'))
  .map(f => ({ file: f, src: fs.readFileSync(path.join(COMPONENTS_DIR, f), 'utf-8') }));
const CSS = fs.readFileSync(path.join(ROOT_DIR, 'src', 'style.css'), 'utf-8');

/** Every hex / rgb() / rgba() colour in a source text, as [text, r, g, b]. */
function colours(text) {
  const out = [];
  for (const m of text.matchAll(/#([0-9a-f]{6}|[0-9a-f]{3})\b/gi)) {
    let h = m[1];
    if (h.length === 3) h = [...h].map(c => c + c).join('');
    out.push([m[0], parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]);
  }
  for (const m of text.matchAll(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/gi)) out.push([m[0], +m[1], +m[2], +m[3]]);
  return out;
}

/** Neutral grey, or the green (good value / primary) or amber (warning / cost) family. */
function onPalette([, r, g, b]) {
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  if ((max - min) / 255 < 0.18) return true;
  let hue;
  if (max === r) hue = 60 * (((g - b) / (max - min)) % 6);
  else if (max === g) hue = 60 * ((b - r) / (max - min) + 2);
  else hue = 60 * ((r - g) / (max - min) + 4);
  if (hue < 0) hue += 360;
  return (hue >= 140 && hue <= 180) || (hue >= 30 && hue <= 50);
}

describe('Visual system', () => {
  it('components style through classes in style.css, not inline style attributes', () => {
    for (const { file, src } of components) {
      const hits = src.match(/style="[^"]*"/g) || [];
      assert.deepEqual(hits, [], `${file} has inline styles`);
    }
  });

  it('uses two meaningful colours (green, amber) plus neutrals, in CSS and component code', () => {
    assert.ok(!onPalette(['cyan', 6, 182, 212]) && !onPalette(['rose', 244, 63, 94]), 'the check rejects other hues');
    const sources = [['style.css', CSS], ...components.map(c => [c.file, c.src])];
    for (const [name, text] of sources) {
      const off = colours(text).filter(c => !onPalette(c)).map(c => c[0]);
      assert.deepEqual(off, [], `${name} uses colours outside green / amber / neutral`);
    }
  });

  it('uses the SVG icon set instead of emoji in components and GPU tags', async () => {
    const emoji = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B50}]/u;
    for (const { file, src } of components) {
      const lines = src.split('\n').filter(l => emoji.test(l)).map(l => l.trim());
      assert.deepEqual(lines, [], `${file} still uses emoji`);
    }
    const { GPUS_DATA } = await import('../src/data/gpus.js');
    for (const gpu of GPUS_DATA) assert.ok(!emoji.test(gpu.aiRating), `${gpu.id} tag: ${gpu.aiRating}`);

    const { icon, ICON_NAMES } = await import('../src/components/icons.js');
    for (const name of ICON_NAMES) {
      assert.match(icon(name), /^<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"[^>]*stroke="currentColor"/);
    }
    assert.throws(() => icon('no-such-icon'), /unknown icon/);
    for (const { file, src } of components) {
      for (const m of src.matchAll(/icon\('([a-z-]+)'\)/g)) assert.ok(ICON_NAMES.includes(m[1]), `${file} uses unknown icon '${m[1]}'`);
    }
  });

  it('keeps the monospace font for numbers, not for labels and links', () => {
    const rule = (selector) => {
      const start = CSS.replace(/\r\n/g, '\n').indexOf('\n' + selector + ' {');
      assert.ok(start >= 0, `${selector} rule exists`);
      const css = CSS.replace(/\r\n/g, '\n');
      return css.slice(start, css.indexOf('}', start));
    };
    for (const text of ['.market-ticker', '.domain-suffix', '.chart-legend-row', '.footer-nav', '.breadcrumbs ol', '.footer-directory summary', '.model-speed-line']) {
      assert.ok(!rule(text).includes('font-mono'), `${text} is text, not a number`);
    }
    for (const figure of ['.ticker-val', '.price-main', '.kpi-value', '.part-price-cell', '.price-per-gb-badge']) {
      assert.ok(rule(figure).includes('font-family: var(--font-mono)'), `${figure} is a number`);
    }
  });

  it('the ticker and tracker show a price rise as a warning and a drop as good news', () => {
    assert.match(CSS, /\.ticker-trend\.is-up \{ color: var\(--warn-text\); \}/);
    assert.match(CSS, /\.ticker-trend\.is-down \{ color: var\(--accent-text\); \}/);
    assert.match(CSS, /\.trend-up \{[^}]*color: var\(--warn-text\)/);
  });
});
