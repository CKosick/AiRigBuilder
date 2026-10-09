import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GPUS_DATA } from '../src/data/gpus.js';
import { MODELS_DATA } from '../src/data/models.js';
import { siteFacts, gpuSummary, homeFaq, usd, fillGpuPrices } from '../src/utils/siteFacts.js';
import { renderModelPickerHtml } from '../src/components/modelPicker.js';
import { renderHardwareGuideHtml } from '../src/components/hardwareGuide.js';
import { renderGpuDetailHtml } from '../src/components/gpuDetail.js';
import { renderPriceTrackerHtml } from '../src/components/priceTracker.js';
import { renderShell } from '../src/components/shell.js';
import { homeStructuredData } from '../scripts/prerender.js';
import { parseRoute } from '../src/routes.js';

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TEMPLATE = fs.readFileSync(path.join(ROOT_DIR, 'index.html'), 'utf-8');
const rtx3090 = GPUS_DATA.find(g => g.id === 'rtx-3090');

/** Runs fn with the RTX 3090's price temporarily changed, as a weekly update would. */
function withRtx3090Price(price, fn) {
  const saved = rtx3090.usedStreetPrice;
  rtx3090.usedStreetPrice = price;
  try { return fn(); } finally { rtx3090.usedStreetPrice = saved; }
}

describe('Price-derived copy is generated from the data files', () => {
  it('GPU summaries use {price}/{dualPrice} placeholders, never hard-coded dollar amounts', () => {
    for (const gpu of GPUS_DATA) {
      assert.ok(!/\$\d/.test(gpu.summary), `${gpu.id} summary hard-codes a price: ${gpu.summary}`);
      const text = gpuSummary(gpu);
      assert.ok(!/[{}]/.test(text), `${gpu.id} summary has an unfilled placeholder: ${text}`);
    }
  });

  it('GPU tags (aiRating) make no price claims', () => {
    // Tags are short labels shown on the tracker; a price in one goes stale with the next update
    for (const gpu of GPUS_DATA) {
      assert.ok(!/\$\d/.test(gpu.aiRating), `${gpu.id} aiRating hard-codes a price: ${gpu.aiRating}`);
    }
  });

  it('model descriptions use {price:<gpu-id>} placeholders, never hard-coded dollar amounts', () => {
    for (const model of MODELS_DATA) {
      assert.ok(!/\$\d/.test(model.description || ''), `${model.id} description hard-codes a price: ${model.description}`);
      const text = fillGpuPrices(model.description || '');
      assert.ok(!/[{}]/.test(text), `${model.id} description has an unfilled placeholder: ${text}`);
    }
    assert.throws(() => fillGpuPrices('{price:no-such-gpu}'), /no-such-gpu/);
  });

  it('the model picker shows model descriptions with current GPU prices', () => {
    const rtx3060 = GPUS_DATA.find(g => g.id === 'rtx-3060-12gb');
    const html = renderModelPickerHtml({ activeModelId: 'llama-3.1-8b' });
    assert.ok(html.includes(`RTX 3060 12GB (about ${usd(rtx3060.usedStreetPrice)} used)`));
    assert.ok(!html.includes('{price:'));
  });

  it('the RTX 3090 summary quotes the current dual-card GPU cost', () => {
    assert.ok(gpuSummary(rtx3090).includes(`about ${usd(rtx3090.usedStreetPrice * 2)} total GPU spend`));
    assert.ok(withRtx3090Price(650, () => gpuSummary(rtx3090)).includes('about $1,300 total GPU spend'));
  });

  it('GPU page and tracker show the filled summary', () => {
    const p40 = GPUS_DATA.find(g => g.id === 'tesla-p40');
    assert.ok(renderGpuDetailHtml(p40).includes(gpuSummary(p40)));
    assert.ok(!renderGpuDetailHtml(p40).includes('{price}'));
  });

  it('the hardware guide quotes the current new RTX 4090 and dual used 3090 prices', () => {
    const { rtx4090, dual3090GpuCost } = siteFacts();
    assert.equal(typeof rtx4090.newPrice, 'number', 'the guide compares against the new RTX 4090 price');
    const html = renderHardwareGuideHtml();
    assert.ok(html.includes(`one new RTX 4090 (${usd(rtx4090.newPrice)})`));
    assert.ok(html.includes(`two used 3090s (~${usd(dual3090GpuCost)})`));
    assert.ok(withRtx3090Price(650, renderHardwareGuideHtml).includes('two used 3090s (~$1,300)'));
  });

  it('the home FAQ quotes the same price, rig cost and payoff months as the header', () => {
    const f = siteFacts();
    const [cheapest, , payoff] = homeFaq();
    assert.ok(cheapest.answer.includes(`(~${usd(f.rtx3090.usedStreetPrice)} each on eBay)`));
    assert.ok(cheapest.answer.includes(`about ${usd(f.dual3090RigEst)} for the complete build`));
    assert.ok(payoff.answer.includes(`roughly ${f.payoffMonths4h} months`));
    assert.ok(payoff.answer.includes(`about ${f.payoffMonths12h} months`));
    assert.ok(payoff.answer.includes(`$${f.runpodDual3090.hourlyRate.toFixed(2)}/hr`));

    const shell = renderShell(parseRoute('/'));
    assert.ok(shell.includes(`~$${f.dual3090RigEst.toLocaleString('en-US')}`), 'header rig cost matches');
    assert.ok(shell.includes(`~${f.payoffMonths4h} Months`), 'header payoff matches');
  });

  it('the prerendered home JSON-LD FAQ follows a price change', () => {
    const faqText = () => homeStructuredData(TEMPLATE)['@graph']
      .find(n => n['@type'] === 'FAQPage').mainEntity.map(q => q.acceptedAnswer.text).join(' ');
    assert.ok(faqText().includes(`~${usd(rtx3090.usedStreetPrice)} each`));
    assert.ok(withRtx3090Price(650, faqText).includes('~$650 each'));
  });

  it('the home page shows the FAQ readers see word for word as the FAQPage JSON-LD says it', async () => {
    const { renderPage } = await import('../scripts/prerender.js');
    const home = renderPage(TEMPLATE, parseRoute('/'));
    const faq = JSON.parse(home.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])['@graph']
      .find(n => n['@type'] === 'FAQPage');
    const visible = [...home.matchAll(/<div class="home-faq-item">\s*<h3>([^<]*)<\/h3>\s*<p>([^<]*)<\/p>/g)]
      .map(m => ({ question: m[1], answer: m[2] }));
    assert.equal(visible.length, faq.mainEntity.length, 'one visible Q&A per FAQPage entry');
    faq.mainEntity.forEach((q, i) => {
      assert.equal(visible[i].question, q.name);
      assert.equal(visible[i].answer, q.acceptedAnswer.text);
    });
    assert.ok(/<div id="home-faq-root">/.test(home), 'FAQ is not hidden on the home page');

    // Only the home page carries the FAQ, in markup and in structured data
    for (const p of ['/tracker', '/guide', '/builds/llama-3.3-70b']) {
      const html = renderPage(TEMPLATE, parseRoute(p));
      assert.ok(!html.includes('home-faq-item'), `${p} has no FAQ text`);
      assert.ok(!html.includes('"FAQPage"'), `${p} has no FAQPage JSON-LD`);
    }
  });

  it('unavailable trends show as n/a on the tracker, GPU page and header ticker', () => {
    const gpu = { ...rtx3090, trend7d: null, trend30d: null };
    const detail = renderGpuDetailHtml(gpu);
    assert.equal((detail.match(/>n\/a</g) || []).length, 2, '7d and 30d both n/a');
    assert.ok(!/NaN|null%|undefined%/.test(detail));

    const saved = { trend7d: rtx3090.trend7d, trend30d: rtx3090.trend30d };
    Object.assign(rtx3090, { trend7d: null, trend30d: null });
    try {
      assert.ok(renderShell(parseRoute('/')).includes('7d trend n/a'));
      assert.ok(!/NaN|null%/.test(renderPriceTrackerHtml()));
    } finally {
      Object.assign(rtx3090, saved);
    }
  });
});
