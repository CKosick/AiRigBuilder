import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { renderPriceTrackerHtml } from '../src/components/priceTracker.js';
import { renderModelPickerHtml } from '../src/components/modelPicker.js';
import { renderBuildsIndexHtml } from '../src/components/buildsIndex.js';

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CSS = fs.readFileSync(path.join(ROOT_DIR, 'src', 'style.css'), 'utf-8');

/** Every <td> opening tag inside tables marked stack-table. */
function stackTableCells(html) {
  const tables = html.match(/<table class="[^"]*\bstack-table\b[^"]*">[\s\S]*?<\/table>/g) || [];
  return tables.flatMap(t => t.match(/<td\b[^>]*>/g) || []);
}

describe('Phone layout: wide tables become labelled cards', () => {
  const pages = {
    tracker: renderPriceTrackerHtml(),
    'build sheet': renderModelPickerHtml({ activeModelId: 'llama-3.3-70b' }),
    'builds index': renderBuildsIndexHtml()
  };

  for (const [name, html] of Object.entries(pages)) {
    it(`${name}: every stacked cell has a label or a full-width role`, () => {
      const cells = stackTableCells(html);
      assert.ok(cells.length > 0, `${name} has stack-table cells`);
      for (const td of cells) {
        assert.ok(
          /data-label="[^"]+"/.test(td) || /\bstack-(head|wide|action)\b/.test(td),
          `${name}: cell would show on phones without a label: ${td}`
        );
      }
    });
  }

  it('the tracker, parts list, quant options and builds index use the stacked layout', () => {
    assert.match(pages.tracker, /<table class="gpu-table stack-table">/);
    assert.equal((pages['build sheet'].match(/<table class="parts-table stack-table">/g) || []).length, 2, 'quant options and parts list');
    assert.match(pages['builds index'], /<table class="parts-table stack-table">/);
  });

  it('style.css has the phone breakpoint that turns stack-table rows into cards', () => {
    const phone = CSS.slice(CSS.indexOf('@media (max-width: 640px)'));
    assert.ok(phone.length > 0, 'phone media query');
    assert.match(phone, /\.stack-table tr \{[^}]*display: grid/);
    assert.match(phone, /\.stack-table td\[data-label\]::before \{[^}]*content: attr\(data-label\)/);
    assert.match(phone, /\.header-container \{[^}]*position: static/, 'header is not pinned on phones');
  });

  it('Item 3: build sheet renders jump links for Parts and Cost breakdown with scroll-margin-top on both targets', () => {
    const sheetHtml = pages['build sheet'];
    assert.match(sheetHtml, /<nav class="build-jump-links"[^>]*>[\s\S]*?<a href="#parts-list" class="build-jump-link">Parts<\/a>[\s\S]*?<a href="#cost-breakdown" class="build-jump-link">Cost breakdown<\/a>[\s\S]*?<\/nav>/);
    assert.match(sheetHtml, /id="parts-list"/);
    assert.match(sheetHtml, /id="cost-breakdown"/);
    assert.match(CSS, /#parts-list,\s*#cost-breakdown \{\s*scroll-margin-top: 140px;/);
  });

  it('Items 4, 6, 7: phone tab swipe fade, 0.75rem text floor on .ticker-tag & .tier-badge-label, and desktop nowrap on .brand-tagline & #btn-why-used', () => {
    const phone = CSS.slice(CSS.indexOf('@media (max-width: 640px)'));
    assert.match(phone, /\.nav-tabs::after \{[\s\S]*?linear-gradient[\s\S]*?pointer-events: none;/);
    assert.match(phone, /\.playground-sticky-summary \{[\s\S]*?position: sticky;[\s\S]*?top: 0;/);
    assert.match(CSS, /\.ticker-tag \{[^}]*font-size: 0\.75rem;/);
    assert.match(CSS, /\.tier-badge-label \{[^}]*font-size: 0\.75rem;/);
    assert.match(CSS, /\.brand-tagline \{[^}]*white-space: nowrap;/);
    assert.match(CSS, /#btn-why-used \{\s*white-space: nowrap;/);
  });
});
