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
});
