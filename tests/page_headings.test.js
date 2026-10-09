import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { renderAllPages } from '../scripts/prerender.js';
import { MODELS_DATA } from '../src/data/models.js';
import { GPUS_DATA } from '../src/data/gpus.js';

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TEMPLATE = fs.readFileSync(path.join(ROOT_DIR, 'index.html'), 'utf-8');
const pages = renderAllPages(TEMPLATE);
const h1sOf = (html) => [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/g)].map(m => m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim());

describe('Page headings', () => {
  it('every page has exactly one h1, and it is not the logo', () => {
    for (const { route, html } of pages) {
      const h1s = h1sOf(html);
      assert.equal(h1s.length, 1, `${route.path}: ${JSON.stringify(h1s)}`);
      assert.ok(!/^AIRigBuilder/.test(h1s[0]), `${route.path}: the logo is not the page heading`);
      assert.match(html, /<span class="brand-name">AIRigBuilder<span class="domain-suffix">\.com<\/span><\/span>/);
    }
  });

  it('each page type is headed by its own title', () => {
    const h1 = (p) => h1sOf(pages.find(pg => pg.route.path === p).html)[0];
    assert.match(h1('/'), /^What's the cheapest way to run a 70B model at home\? Two used RTX 3090s: about \$[\d,]+ for the whole PC\.$/);
    assert.equal(h1('/builds'), `Local AI Build Sheets for ${MODELS_DATA.length} Models`);
    assert.equal(h1('/calculator'), 'Local AI vs Cloud GPU Break-Even Calculator');
    assert.equal(h1('/tracker'), 'Used GPU Price Tracker for Local AI');
    assert.equal(h1('/guide'), 'Local AI Hardware Guide & Crucial Gotchas');
    for (const gpu of GPUS_DATA) assert.equal(h1(`/gpu/${gpu.id}`), `${gpu.name} Used Price`);
    for (const m of MODELS_DATA) {
      const page = pages.find(pg => pg.route.path === `/builds/${m.id}`);
      if (page) assert.equal(h1sOf(page.html)[0], m.name, `/builds/${m.id}`);
    }
  });

  it('on the home page the model name sits under the hero as an h2', () => {
    const home = pages.find(pg => pg.route.home).html;
    assert.match(home, /<h2 class="model-info-title">Llama 3\.3 70B Instruct<\/h2>/);
  });
});
