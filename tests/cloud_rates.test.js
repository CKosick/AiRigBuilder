import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { CLOUD_RATES, CLOUD_PROVIDERS } from '../src/data/providers.js';
import { MODELS_DATA } from '../src/data/models.js';
import { cloudAlternative } from '../src/utils/siteFacts.js';
import { renderModelPickerHtml } from '../src/components/modelPicker.js';

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

describe('Cloud rates are stored once', () => {
  it('every rate in the table is a positive hourly price with a label', () => {
    for (const [id, offer] of Object.entries(CLOUD_RATES)) {
      assert.ok(offer.label, `${id} label`);
      assert.ok(offer.hourlyRate > 0, `${id} rate`);
    }
  });

  it("the calculator's providers read their rate from the table", () => {
    for (const p of CLOUD_PROVIDERS) {
      assert.ok(CLOUD_RATES[p.id], `${p.id} is in CLOUD_RATES`);
      assert.equal(p.hourlyRate, CLOUD_RATES[p.id].hourlyRate, p.id);
    }
    const src = fs.readFileSync(path.join(ROOT_DIR, 'src', 'data', 'providers.js'), 'utf-8');
    const providersBlock = src.slice(src.indexOf('export const CLOUD_PROVIDERS'));
    assert.deepEqual(providersBlock.match(/hourlyRate:\s*[\d.]/g) || [], [], 'no typed-in rates in CLOUD_PROVIDERS');
  });

  it('every model points at known offers and no longer types a rate', () => {
    for (const m of MODELS_DATA) {
      assert.ok(Array.isArray(m.cloudOffers) && m.cloudOffers.length > 0, `${m.id} has cloud offers`);
      for (const id of m.cloudOffers) assert.ok(CLOUD_RATES[id], `${m.id}: unknown offer ${id}`);
      assert.equal(m.cloudEquivalent, undefined, `${m.id} still has the old typed string`);
    }
    const src = fs.readFileSync(path.join(ROOT_DIR, 'src', 'data', 'models.js'), 'utf-8');
    assert.ok(!/\$\d+(\.\d+)?\s*(-\s*\$\d+(\.\d+)?)?\/hr/.test(src), 'models.js has no hourly prices');
  });

  it('shows a range when a model lists several offers, and follows a rate change', () => {
    const llama = MODELS_DATA.find(m => m.id === 'llama-3.3-70b');
    assert.deepEqual(cloudAlternative(llama), { rate: '$0.88 - $1.60/hr', label: 'RunPod 2x RTX 3090 / RunPod 2x RTX A6000' });
    const saved = CLOUD_RATES['runpod-dual-3090'].hourlyRate;
    CLOUD_RATES['runpod-dual-3090'].hourlyRate = 0.79;
    try {
      assert.equal(cloudAlternative(llama).rate, '$0.79 - $1.60/hr');
      assert.match(renderModelPickerHtml({ activeModelId: 'llama-3.3-70b' }), /spec-badge-cost">\$0\.79 - \$1\.60\/hr</);
    } finally {
      CLOUD_RATES['runpod-dual-3090'].hourlyRate = saved;
    }
    const r1 = MODELS_DATA.find(m => m.id === 'deepseek-r1-full');
    assert.equal(cloudAlternative(r1).label, 'Vast.ai 8x H100, or the DeepSeek API');
    assert.throws(() => cloudAlternative({ id: 'x', cloudOffers: ['nope'] }), /unknown cloud offer/);
  });
});
