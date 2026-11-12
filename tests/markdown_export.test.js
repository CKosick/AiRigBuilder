import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { MODELS_DATA } from '../src/data/models.js';
import { BUILDS_DATA } from '../src/data/builds.js';
import { GPUS_UPDATED_AT } from '../src/data/gpus.js';
import { SITE_URL, buildPath } from '../src/routes.js';
import { buildPartsListMarkdown } from '../src/utils/markdownExport.js';
import { renderModelPickerHtml } from '../src/components/modelPicker.js';

describe('Copyable Markdown Parts List Export', () => {
  const dataDate = GPUS_UPDATED_AT.slice(0, 10);

  it('golden test: matches expected markdown fixture for Llama 3.3 70B dual-3090 row for row', () => {
    const model = MODELS_DATA.find(m => m.id === 'llama-3.3-70b');
    assert.ok(model, 'llama-3.3-70b model exists');
    const sheet = BUILDS_DATA['llama-3.3-70b'];
    assert.ok(sheet, 'llama-3.3-70b build sheet exists');
    const tier = sheet.tiers.find(t => t.id === 'tier-budget-used');
    assert.ok(tier, 'tier-budget-used exists');

    const canonicalUrl = `${SITE_URL}${buildPath('llama-3.3-70b')}`;
    assert.equal(canonicalUrl, 'https://airigbuilder.com/');

    const actual = buildPartsListMarkdown(model, tier, canonicalUrl);

    const expected = [
      '**Llama 3.3 70B Instruct — Budget Used Dual-3090**',
      '',
      'Fit: Q4_K_M (fits). Estimated speed at Q4_K_M: ~11-17 tok/s (bandwidth-bound estimate)',
      '',
      '| Part | Spec | Price | Buy |',
      '| :--- | :--- | :--- | :--- |',
      '| GPU (Primary + Secondary): 2x NVIDIA GeForce RTX 3090 24GB | 48GB Total GDDR6X, 936 GB/s, NVLink compatible | $1,698 | [eBay Sold](https://www.ebay.com/sch/i.html?_nkw=RTX+3090+24GB&LH_Sold=1&LH_Complete=1) |',
      '| CPU: AMD Ryzen 7 5700X (8C / 16T) | 65W TDP, 3.4GHz base / 4.6GHz boost, PCIe 4.0 | $155 | [Amazon](https://www.amazon.com/dp/B09VCHQHZ6) |',
      '| Motherboard: ASUS ROG Strix B550-F Gaming (WiFi) | Supports dual full-length PCIe slots with 3-slot spacing | $110 | [eBay Sold](https://www.ebay.com/sch/i.html?_nkw=ASUS+ROG+Strix+B550-F+Gaming) |',
      '| RAM: Corsair Vengeance LPX 64GB (2x32GB) DDR4-3200 | 64GB DDR4 dual channel | $98 | [Amazon](https://www.amazon.com/dp/B07Y4ZZ7LQ) |',
      '| Power Supply (PSU): EVGA SuperNOVA 1000 G6 (or Corsair RM1000e 1000W 80+ Gold) | 1000W 80+ Gold, 4-6 dedicated 8-pin PCIe cables | $159 | [Amazon / B&H](https://www.amazon.com/s?k=1000W+power+supply+80+gold) |',
      '| Storage (SSD): Crucial P3 Plus 2TB NVMe M.2 SSD | Up to 5000 MB/s read, PCIe 4.0 | $115 | [Amazon](https://www.amazon.com/dp/B0B25ML2FH) |',
      '| Case & Spacing: Fractal Design Meshify 2 or Phanteks Enthoo Pro 2 | Spacious full tower, support for multi-GPU & 3-slot cards | $139 | [Amazon](https://www.amazon.com/s?k=Fractal+Design+Meshify+2) |',
      '| Cooling & Accessories: Thermalright Peerless Assassin 120 SE + PCIe 4.0 Riser cable | Dual-tower CPU cooler + 20cm x16 shielded riser | $58 | [Amazon](https://www.amazon.com/s?k=Thermalright+Peerless+Assassin+120) |',
      '',
      '**Total:** $2,532',
      '',
      `Prices as of ${dataDate}. Full build: https://airigbuilder.com/`
    ].join('\n');

    assert.equal(actual, expected, 'markdown export matches golden fixture exactly');

    // Dual-GPU part is a single $1,698 row
    assert.match(actual, /\| GPU \(Primary \+ Secondary\): 2x NVIDIA GeForce RTX 3090 24GB \| 48GB Total GDDR6X, 936 GB\/s, NVLink compatible \| \$1,698 \|/);

    // Total equals sheet displayed total
    const displayedTotal = tier.parts.reduce((s, p) => s + p.price, 0);
    assert.equal(displayedTotal, 2532);
    assert.match(actual, /\*\*Total:\*\* \$2,532/);
  });

  it('catalog consistency: total equals parts sum, all URLs carry over, and no extraneous figures across all 56 models', () => {
    let totalTiersChecked = 0;

    for (const model of MODELS_DATA) {
      const sheet = BUILDS_DATA[model.id];
      if (!sheet) continue;

      const canonicalUrl = `${SITE_URL}${buildPath(model.id)}`;

      for (const tier of sheet.tiers) {
        totalTiersChecked++;
        const md = buildPartsListMarkdown(model, tier, canonicalUrl);
        assert.ok(md.length > 0, `Markdown produced for ${model.id} ${tier.id}`);

        // Heading format
        assert.ok(md.startsWith(`**${model.name} — ${tier.name}**`), `Heading matches model and tier name for ${model.id} ${tier.id}`);

        // Fit line verification
        if (tier.fit?.status === 'none') {
          assert.match(md, /Fit: Won't fit/, `No-fit tier shows won't fit for ${model.id} ${tier.id}`);
        } else if (tier.fit?.quant) {
          const escapedQuant = tier.fit.quant.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          assert.match(md, new RegExp(`Fit: ${escapedQuant} \\(${tier.fit.status}\\)`), `Fit line contains quant and status for ${model.id} ${tier.id}`);
        }

        // Speed line verification
        if (tier.speedLine) {
          assert.ok(md.includes(tier.speedLine), `Speed line included verbatim for ${model.id} ${tier.id}`);
        }

        // Parts rows & Buy links
        const partsSum = tier.parts.reduce((sum, p) => sum + (p.price || 0), 0);
        for (const part of tier.parts) {
          const spec = part.spec || '-';
          assert.ok(md.includes(spec), `Spec included for ${part.name} on ${model.id} ${tier.id}`);

          if (part.price > 0) {
            assert.ok(md.includes(`$${part.price.toLocaleString('en-US')}`), `Price formatted for ${part.name}`);
          } else {
            assert.ok(md.includes('Included'), `Zero-dollar part marked Included for ${part.name}`);
          }

          if (part.url && part.url !== '#') {
            assert.ok(md.includes(`[${part.merchant || 'Link'}](${part.url})`), `Buy link matches for ${part.name}`);
          }
        }

        // Total line verification
        const expectedTotalStr = `**Total:** $${partsSum.toLocaleString('en-US')}`;
        assert.ok(md.includes(expectedTotalStr), `Total line matches sum of parts ($${partsSum}) for ${model.id} ${tier.id}`);

        // Closing line verification
        const expectedClosing = `Prices as of ${dataDate}. Full build: ${canonicalUrl}`;
        assert.ok(md.endsWith(expectedClosing), `Closing line has date and canonical URL for ${model.id} ${tier.id}`);
      }
    }

    assert.ok(totalTiersChecked >= 168, `Checked at least 168 tiers across 56 models (actual: ${totalTiersChecked})`);
  });

  it('renders Copy parts list button with correct ID and label on build sheet cards', () => {
    const html = renderModelPickerHtml({ activeModelId: 'llama-3.3-70b', activeTierId: 'tier-budget-used' });
    assert.match(html, /id="btn-copy-parts-list"/, 'has #btn-copy-parts-list button');
    assert.match(html, /Copy parts list/, 'button label is Copy parts list');
    assert.doesNotMatch(html, /id="btn-copy-build-reddit"/, 'old Reddit button ID removed');
    assert.doesNotMatch(html, /Copy for Reddit \/ Discord/, 'old button text removed');
  });

  it('handles non-fitting tiers gracefully in export', () => {
    // Mixtral 8x22B on tier-budget-used (status = none)
    const model = MODELS_DATA.find(m => m.id === 'mixtral-8x22b');
    const sheet = BUILDS_DATA['mixtral-8x22b'];
    const noFitTier = sheet.tiers.find(t => t.fit?.status === 'none');
    assert.ok(noFitTier, 'found non-fitting tier on mixtral-8x22b');

    const md = buildPartsListMarkdown(model, noFitTier, 'https://airigbuilder.com/builds/mixtral-8x22b');
    assert.match(md, /Fit: Won't fit/);
    assert.match(md, /\*\*Total:\*\*/);
    assert.match(md, /Full build: https:\/\/airigbuilder.com\/builds\/mixtral-8x22b/);
  });
});
