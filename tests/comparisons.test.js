import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { COMPARISON_PAIRS, BEST_GPU_MODELS, comparePath, bestGpuPath, getComparisonsForGpu, isBestGpuModel } from '../src/data/comparisons.js';
import { GPUS_DATA } from '../src/data/gpus.js';
import { MODELS_DATA } from '../src/data/models.js';
import { INTEGRATED_SYSTEM_IDS } from '../src/components/rigPlayground.js';
import { parseRoute, tabViewFor, buildPath, gpuPath } from '../src/routes.js';
import { renderGpuComparisonHtml } from '../src/components/gpuComparison.js';
import { renderBestGpuHtml, evaluateBestGpu } from '../src/components/bestGpu.js';
import { renderGpuDetailHtml } from '../src/components/gpuDetail.js';
import { renderModelPickerHtml } from '../src/components/modelPicker.js';
import { TIER_MAC_M5_ULTRA_256, TIER_MAC_M5_ULTRA_512 } from '../src/data/builds.js';
import { AFFILIATE_LINK_REL } from '../src/config/affiliates.js';
import { tierFit } from '../src/utils/tierFit.js';

describe('Curated Comparisons & Best-GPU Data Integrity', () => {
  it('defines exactly 12 discrete GPU comparison pairs', () => {
    assert.equal(COMPARISON_PAIRS.length, 12);
    const seen = new Set();
    for (const [a, b] of COMPARISON_PAIRS) {
      assert.notEqual(a, b, 'cannot compare GPU to itself');
      const gpuA = GPUS_DATA.find(g => g.id === a);
      const gpuB = GPUS_DATA.find(g => g.id === b);
      assert.ok(gpuA, `GPU ${a} must exist in GPUS_DATA`);
      assert.ok(gpuB, `GPU ${b} must exist in GPUS_DATA`);
      assert.ok(!INTEGRATED_SYSTEM_IDS.includes(a), `${a} must be a discrete GPU`);
      assert.ok(!INTEGRATED_SYSTEM_IDS.includes(b), `${b} must be a discrete GPU`);

      const key = `${a}:${b}`;
      const reversedKey = `${b}:${a}`;
      assert.ok(!seen.has(key), `duplicate pair ${key}`);
      assert.ok(!seen.has(reversedKey), `reversed pair ${reversedKey} must not exist`);
      seen.add(key);
    }
  });

  it('defines exactly 18 models for best-GPU pages', () => {
    assert.equal(BEST_GPU_MODELS.length, 18);
    const seen = new Set();
    for (const id of BEST_GPU_MODELS) {
      assert.ok(MODELS_DATA.some(m => m.id === id), `model ${id} must exist in MODELS_DATA`);
      assert.ok(!seen.has(id), `duplicate model ${id}`);
      seen.add(id);
    }
  });
});

describe('Router & Path Resolution', () => {
  it('parses compare routes and rejects reversed pairs or invalid GPUs', () => {
    for (const [a, b] of COMPARISON_PAIRS) {
      const p = comparePath(a, b);
      assert.equal(p, `/compare/${a}-vs-${b}`);
      const route = parseRoute(p);
      assert.ok(route, `parseRoute should resolve ${p}`);
      assert.equal(route.view, 'compare');
      assert.equal(route.gpuIdA, a);
      assert.equal(route.gpuIdB, b);
      assert.equal(tabViewFor(route), 'tracker');

      // Reversed URL must not exist
      const reversed = `/compare/${b}-vs-${a}`;
      assert.equal(parseRoute(reversed), null, `reversed path ${reversed} must return null`);
    }

    assert.equal(parseRoute('/compare/unknown-vs-rtx-3090'), null);
    assert.equal(parseRoute('/compare/rtx-3090-vs-unknown'), null);
  });

  it('parses best-gpu routes and rejects uncurated models', () => {
    for (const id of BEST_GPU_MODELS) {
      const p = bestGpuPath(id);
      assert.equal(p, `/best-gpu/${id}`);
      const route = parseRoute(p);
      assert.ok(route, `parseRoute should resolve ${p}`);
      assert.equal(route.view, 'best-gpu');
      assert.equal(route.modelId, id);
      assert.equal(tabViewFor(route), 'builds');
    }

    assert.equal(parseRoute('/best-gpu/llama-3.1-8b'), null, 'uncurated model returns null');
    assert.equal(parseRoute('/best-gpu/unknown-model'), null);
  });
});

describe('Computed Spot Check 1: RTX 3090 vs RTX 5090', () => {
  it('matches expected model fit counts and single-card difference', () => {
    const gpu3090 = GPUS_DATA.find(g => g.id === 'rtx-3090');
    const gpu5090 = GPUS_DATA.find(g => g.id === 'rtx-5090');

    let single3090 = 0;
    let single5090 = 0;
    let dual3090 = 0;
    let dual5090 = 0;
    const diffModels = [];

    for (const model of MODELS_DATA) {
      const fit3090 = tierFit(model, { memoryGb: gpu3090.vram }, { contextK: 8, kvScale: 1 });
      const fit5090 = tierFit(model, { memoryGb: gpu5090.vram }, { contextK: 8, kvScale: 1 });
      const fitDual3090 = tierFit(model, { memoryGb: gpu3090.vram * 2 }, { contextK: 8, kvScale: 1 });
      const fitDual5090 = tierFit(model, { memoryGb: gpu5090.vram * 2 }, { contextK: 8, kvScale: 1 });

      const runs3090 = fit3090.status !== 'none';
      const runs5090 = fit5090.status !== 'none';
      if (runs3090) single3090++;
      if (runs5090) single5090++;
      if (fitDual3090.status !== 'none') dual3090++;
      if (fitDual5090.status !== 'none') dual5090++;

      if (runs3090 !== runs5090) diffModels.push(model.id);
    }

    assert.equal(single3090, 37);
    assert.equal(single5090, 38);
    assert.equal(dual3090, 45);
    assert.equal(dual5090, 48);
    assert.deepEqual(diffModels, ['mixtral-8x7b']);

    const html = renderGpuComparisonHtml('rtx-3090', 'rtx-5090');
    assert.ok(html.includes('37 of 70'));
    assert.ok(html.includes('38 of 70'));
    assert.ok(html.includes('45 of 70'));
    assert.ok(html.includes('48 of 70'));
    assert.ok(html.includes('1 of 70 catalog models run on only one of these two cards'));
  });
});

describe('Computed Spot Check 2: Best GPU for Llama 3.3 70B', () => {
  it('computes correct labeled picks and integrated systems note', () => {
    const html = renderBestGpuHtml('llama-3.3-70b');

    // Cheapest: 2x Tesla P40 ($598)
    assert.ok(html.includes('Cheapest That Runs It'));
    assert.ok(html.includes('2x NVIDIA Tesla P40 24GB'));
    assert.ok(html.includes('$598'));

    // Best Value Full Fit: 2x Tesla P40 ($598)
    assert.ok(html.includes('Best Value Full Fit'));

    // Fastest: 2x RTX 5090 ($12,000)
    assert.ok(html.includes('Fastest Discrete Rig'));
    assert.ok(html.includes('2x NVIDIA GeForce RTX 5090'));
    assert.ok(html.includes('$12,000'));

    // Integrated systems note (aside-only case: discrete $598 < unified $3,100)
    assert.ok(!html.includes('Unified-Memory Pick'));
    assert.ok(html.includes('Integrated Unified-Memory Systems'));
    assert.ok(html.includes('Apple Mac Studio M2 Ultra'));
    assert.ok(html.includes('Apple Mac Studio M3 Ultra'));
    assert.ok(html.includes('AMD Ryzen AI Max+ 395 Mini PC'));
    assert.ok(html.includes('NVIDIA DGX Spark'));

    // Link back to build sheet
    assert.ok(html.includes('href="/"'));
  });
});

describe('Best-GPU Unified-Memory Pick & Amazon Action', () => {
  const tierPrice = (tier) => tier.parts.reduce((s, p) => s + (p.price || 0), 0);

  it('derives M5 Ultra candidate values directly from builds.js tiers and populates glm-5.3 and kimi-k2.7-code with zero empty slots', () => {
    for (const modelId of ['glm-5.3', 'kimi-k2.7-code']) {
      const ev = evaluateBestGpu(modelId);
      assert.equal(ev.runningConfigs.length, 0, `${modelId} has no fitting discrete GPU`);
      assert.ok(ev.unifiedPick, `${modelId} has a unifiedPick`);
      assert.equal(ev.unifiedPick.id, TIER_MAC_M5_ULTRA_512.id);
      assert.equal(ev.unifiedPick.memoryGb, TIER_MAC_M5_ULTRA_512.memoryGb);
      assert.equal(ev.unifiedPick.totalPrice, tierPrice(TIER_MAC_M5_ULTRA_512));
      assert.equal(ev.showUnifiedPick, true);

      const html = renderBestGpuHtml(modelId);
      assert.ok(html.includes('Unified-Memory Pick'));
      assert.ok(html.includes(TIER_MAC_M5_ULTRA_512.name));
      assert.ok(html.includes(`$${ev.unifiedPick.totalPrice.toLocaleString('en-US')}`));
      assert.ok(html.includes(`href="${buildPath(modelId)}" class="btn-secondary"`));
      assert.ok(!html.includes('class="pick-none"'), `${modelId} must omit empty discrete placeholder cards`);
      assert.ok(!html.includes('class="integrated-system-note"'), `${modelId} must drop the aside when unified card renders`);
    }
  });

  it('renders M5 Ultra 256GB unified card on deepseek-r1-full and qwen-3-coder-480b-a35b while preserving discrete empty slot only when discrete runs it', () => {
    for (const modelId of ['deepseek-r1-full', 'qwen-3-coder-480b-a35b']) {
      const ev = evaluateBestGpu(modelId);
      assert.ok(ev.runningConfigs.length > 0);
      assert.equal(ev.unifiedPick.id, TIER_MAC_M5_ULTRA_256.id);
      assert.equal(ev.unifiedPick.memoryGb, TIER_MAC_M5_ULTRA_256.memoryGb);
      assert.equal(ev.unifiedPick.totalPrice, tierPrice(TIER_MAC_M5_ULTRA_256));
      assert.equal(ev.showUnifiedPick, true);

      const html = renderBestGpuHtml(modelId);
      assert.ok(html.includes('Unified-Memory Pick'));
      assert.ok(html.includes(TIER_MAC_M5_ULTRA_256.name));
      assert.ok(html.includes('$9,499'));
      assert.ok(html.includes('$31,800'));
      assert.ok(!html.includes('class="integrated-system-note"'));
    }

    // deepseek-r1-full has full discrete fit too -> 0 empty slots
    assert.ok(!renderBestGpuHtml('deepseek-r1-full').includes('class="pick-none"'));
    // qwen-3-coder-480b-a35b runs on discrete 2x PRO 6000 (reduced), lacks discrete full fit -> keeps Best Value Full Fit placeholder
    const qwenCoderHtml = renderBestGpuHtml('qwen-3-coder-480b-a35b');
    assert.equal((qwenCoderHtml.match(/class="pick-none"/g) || []).length, 1);
    assert.ok(qwenCoderHtml.includes('No discrete GPU configuration achieves a full recommended quant fit.'));
  });

  it('renders unified card when unified pick undercuts cheapest discrete pick and drops aside (gpt-oss-120b)', () => {
    const ev = evaluateBestGpu('gpt-oss-120b');
    assert.equal(ev.cheapestThatRuns.totalPrice, 15900);
    assert.equal(ev.unifiedPick.id, 'strix-halo-128gb');
    assert.equal(ev.unifiedPick.totalPrice, 3100);
    assert.equal(ev.showUnifiedPick, true);

    const html = renderBestGpuHtml('gpt-oss-120b');
    assert.ok(html.includes('Unified-Memory Pick'));
    assert.ok(html.includes('$3,100'));
    assert.ok(html.includes('$15,900'));
    assert.ok(!html.includes('class="integrated-system-note"'));
  });

  it('keeps aside and omits unified card when discrete picks are full and cheaper (llama-3.3-70b)', () => {
    const ev = evaluateBestGpu('llama-3.3-70b');
    assert.equal(ev.cheapestThatRuns.totalPrice, 598);
    assert.equal(ev.unifiedPick.totalPrice, 3100);
    assert.equal(ev.showUnifiedPick, false);

    const html = renderBestGpuHtml('llama-3.3-70b');
    assert.ok(!html.includes('Unified-Memory Pick'));
    assert.ok(html.includes('class="integrated-system-note"'));
  });

  it('renders tracked Amazon buy links under View GPU Details on discrete pick cards', () => {
    const html = renderBestGpuHtml('llama-3.3-70b');
    const picksSection = html.slice(html.indexOf('class="best-gpu-picks-grid"'), html.indexOf('class="integrated-system-note"'));

    for (const gpuId of ['tesla-p40', 'rtx-5090']) {
      assert.ok(
        picksSection.includes(`href="https://www.amazon.com/s?`) &&
        picksSection.includes('tag=airigbuilder-20') &&
        picksSection.includes(`rel="${AFFILIATE_LINK_REL}" class="btn-secondary" data-click-merchant="Amazon" data-click-id="gpu:${gpuId}:amazon" data-gpu-id="${gpuId}" data-link-kind="amazon"`),
        `Discrete pick card for ${gpuId} must include tracked Amazon action`
      );
    }

    // Unified pick card uses Build Sheet link and does not render a GPU Amazon link
    const glmHtml = renderBestGpuHtml('glm-5.3');
    const glmPicks = glmHtml.slice(glmHtml.indexOf('class="best-gpu-picks-grid"'), glmHtml.indexOf('class="compare-card"'));
    assert.ok(!glmPicks.includes('Buy on Amazon'));
    assert.ok(glmPicks.includes(`href="${buildPath('glm-5.3')}"`));
  });
});

describe('Internal Links', () => {
  it('links to comparison pages on GPU detail pages', () => {
    const gpu3090 = GPUS_DATA.find(g => g.id === 'rtx-3090');
    const html3090 = renderGpuDetailHtml(gpu3090);
    assert.ok(html3090.includes('Head-to-Head Comparisons'));
    const pairs3090 = getComparisonsForGpu('rtx-3090');
    assert.ok(pairs3090.length >= 5);
    for (const [a, b] of pairs3090) {
      assert.ok(html3090.includes(comparePath(a, b)), `must link to ${comparePath(a, b)}`);
    }

    // A GPU with no comparisons does not render empty section
    const arc = GPUS_DATA.find(g => g.id === 'arc-pro-b60');
    const htmlArc = renderGpuDetailHtml(arc);
    assert.ok(!htmlArc.includes('Head-to-Head Comparisons'));
  });

  it('links to best-gpu page from build sheets in BEST_GPU_MODELS', () => {
    for (const modelId of BEST_GPU_MODELS) {
      const html = renderModelPickerHtml({ activeModelId: modelId });
      assert.ok(html.includes(bestGpuPath(modelId)), `build sheet ${modelId} must link to ${bestGpuPath(modelId)}`);
    }

    // A model not in BEST_GPU_MODELS does not link to best-gpu
    const otherHtml = renderModelPickerHtml({ activeModelId: 'llama-3.1-8b' });
    assert.ok(!otherHtml.includes('/best-gpu/llama-3.1-8b'));
  });

  it('adds eBay Sold and Amazon buy actions to the Check Prices row across all comparison pairs matching gpuDetail', () => {
    for (const [a, b] of COMPARISON_PAIRS) {
      const html = renderGpuComparisonHtml(a, b);
      assert.ok(html.includes('<strong>Check Prices</strong>'), `${a}-vs-${b} renders Check Prices row`);
      const specTable = html.slice(html.indexOf('Hardware Specifications'), html.indexOf('Model Support Summary'));
      for (const gpuId of [a, b]) {
        assert.ok(
          specTable.includes(`rel="${AFFILIATE_LINK_REL}" class="btn-primary" data-click-merchant="eBay Sold" data-click-id="gpu:${gpuId}:ebay-sold" data-gpu-id="${gpuId}" data-link-kind="ebay-sold"`),
          `${a}-vs-${b} renders eBay Sold action for ${gpuId}`
        );
        assert.ok(specTable.includes(`customid=gpu-${gpuId}`), `${a}-vs-${b} carries customid=gpu-${gpuId}`);
        assert.ok(
          specTable.includes(`rel="${AFFILIATE_LINK_REL}" class="btn-secondary" data-click-merchant="Amazon" data-click-id="gpu:${gpuId}:amazon" data-gpu-id="${gpuId}" data-link-kind="amazon"`),
          `${a}-vs-${b} renders Amazon action for ${gpuId}`
        );
        assert.ok(specTable.includes('tag=airigbuilder-20'), `${a}-vs-${b} carries airigbuilder-20 Amazon tag`);
      }
    }
  });
});
