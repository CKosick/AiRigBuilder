import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { renderHomeHeroHtml } from '../src/components/homeHero.js';
import { renderModelPickerHtml } from '../src/components/modelPicker.js';
import { renderPage } from '../scripts/prerender.js';
import { parseRoute, DEFAULT_MODEL_ID } from '../src/routes.js';
import { siteFacts, usd } from '../src/utils/siteFacts.js';
import { MODELS_DATA } from '../src/data/models.js';

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TEMPLATE = fs.readFileSync(path.join(ROOT_DIR, 'index.html'), 'utf-8');

describe('Home first screen answers the main question', () => {
  const hero = renderHomeHeroHtml();
  const f = siteFacts();

  it('states the answer with the current rig cost, payoff and cloud rate', () => {
    assert.match(hero, /What's the cheapest way to run a 70B model at home\?/);
    assert.ok(hero.includes(`Two used RTX 3090s: <span class="hero-highlight">about ${usd(f.dual3090RigEst)}</span>`));
    assert.ok(hero.includes(`~${f.payoffMonths4h} months</strong> to pay for itself vs RunPod ($${f.runpodDual3090.hourlyRate.toFixed(2)}/hr)`));
  });

  it('quotes the same speed as the model card below it', () => {
    const model = MODELS_DATA.find(m => m.id === DEFAULT_MODEL_ID);
    const [lo, hi] = model.typicalSpeedDual3090.match(/\d+/g);
    assert.ok(hero.includes(`<strong>${lo}–${hi} tokens/sec</strong> on ${model.name} at ${model.sweetSpotQuant}`));
    assert.ok(renderModelPickerHtml({ activeModelId: DEFAULT_MODEL_ID }).includes(`${lo} - ${hi} tokens/sec`));
  });

  it('"See the parts list" points at the parts list on the same page', () => {
    assert.match(hero, /<a class="btn-primary" href="#parts-list">/);
    assert.match(renderModelPickerHtml({ activeModelId: DEFAULT_MODEL_ID }), /<div class="build-sheet-card" id="parts-list">/);
  });

  it('appears on the home page only, at the top of the main content', () => {
    const home = renderPage(TEMPLATE, parseRoute('/'));
    assert.match(home, /<main class="main-wrapper" id="main-content" tabindex="-1">\s*<div id="home-hero-root">\s*<section class="hero-banner"/);
    for (const p of ['/tracker', '/calculator', '/guide', '/builds', '/builds/llama-3.1-8b', '/gpu/rtx-3090']) {
      const html = renderPage(TEMPLATE, parseRoute(p));
      assert.ok(!html.includes('hero-answer'), `${p} has no home hero`);
      assert.match(html, /<div id="home-hero-root" hidden><\/div>/, `${p} keeps an empty, hidden slot for client-side navigation`);
    }
  });
});
