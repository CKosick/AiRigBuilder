import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { GPUS_DATA } from '../src/data/gpus.js';
import { SEARCH_TARGETS } from '../scripts/price_review.js';
import { MODELS_DATA, KV_SPECS } from '../src/data/models.js';
import { BUILDS_DATA } from '../src/data/builds.js';
import { CLOUD_PROVIDERS } from '../src/data/providers.js';
import { formatAffiliateUrl } from '../src/config/affiliates.js';

describe('Data Integrity & Consistency Contracts', () => {
  describe('GPUS_DATA Contract', () => {
    it('tracks every GPU once, each with an eBay search target in the price review', () => {
      const ids = GPUS_DATA.map(g => g.id);
      assert.equal(new Set(ids).size, ids.length, 'All GPU IDs must be unique');
      assert.deepEqual([...ids].sort(), SEARCH_TARGETS.map(t => t.id).sort(), 'GPUS_DATA and SEARCH_TARGETS must list the same GPUs');
    });

    it('ensures each GPU has valid pricing bounds and mathematical consistency', () => {
      for (const gpu of GPUS_DATA) {
        assert.ok(gpu.name, `GPU ${gpu.id} missing name`);
        assert.ok(gpu.vram > 0, `GPU ${gpu.id} invalid VRAM`);
        // A newly added row stays unpriced until its first price is approved and applied
        assert.ok(
          gpu.usedStreetPrice > 0,
          `GPU ${gpu.id} has no price yet: run npm run prices:scrape, approve its first price in data/pending_price_review.json, then npm run prices:apply`
        );
        assert.ok(gpu.usedPriceLow > 0, `GPU ${gpu.id} priceLow must be > 0`);
        assert.ok(gpu.usedPriceHigh >= gpu.usedPriceLow, `GPU ${gpu.id} priceHigh must be >= priceLow`);
        
        // Street price should be reasonable within range
        assert.ok(
          gpu.usedStreetPrice >= gpu.usedPriceLow && gpu.usedStreetPrice <= gpu.usedPriceHigh,
          `GPU ${gpu.id} street price $${gpu.usedStreetPrice} must be within [$${gpu.usedPriceLow}, $${gpu.usedPriceHigh}]`
        );

        // Price per GB must match calculation within 0.05 tolerance
        const expectedPricePerGb = parseFloat((gpu.usedStreetPrice / gpu.vram).toFixed(2));
        assert.ok(
          Math.abs(gpu.pricePerGb - expectedPricePerGb) < 0.05,
          `GPU ${gpu.id} pricePerGb ($${gpu.pricePerGb}) does not match expected ($${expectedPricePerGb})`
        );

        // History array validation
        // A newly tracked GPU starts with the one point its first applied price creates
        assert.ok(Array.isArray(gpu.history) && gpu.history.length >= 1, `GPU ${gpu.id} must have at least 1 history point`);
        const lastHistory = gpu.history[gpu.history.length - 1];
        assert.match(lastHistory.date, /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{4}$/, `GPU ${gpu.id} last history point must be a 'Mon YYYY' month label`);
        assert.equal(lastHistory.price, gpu.usedStreetPrice, `GPU ${gpu.id} last history price must match usedStreetPrice`);
      }
    });

    it('contains valid hardware specs (bandwidth, tdp, multiGpuScore)', () => {
      for (const gpu of GPUS_DATA) {
        assert.ok(gpu.bandwidth > 0, `GPU ${gpu.id} invalid memory bandwidth`);
        assert.ok(gpu.tdp > 0, `GPU ${gpu.id} invalid TDP`);
        assert.ok(gpu.multiGpuScore >= 1 && gpu.multiGpuScore <= 10, `GPU ${gpu.id} multiGpuScore must be 1-10`);
        assert.ok(gpu.summary && gpu.summary.length > 10, `GPU ${gpu.id} missing descriptive summary`);
        assert.ok(gpu.aiRating, `GPU ${gpu.id} missing AI rating tag`);
      }
    });
  });

  describe('MODELS_DATA Contract', () => {
    it('contains flagship AI models with unique IDs', () => {
      assert.ok(MODELS_DATA.length >= 30, 'Must have at least 30 model profiles');
      const ids = MODELS_DATA.map(m => m.id);
      const uniqueIds = new Set(ids);
      assert.equal(uniqueIds.size, MODELS_DATA.length, 'All model IDs must be unique');
    });

    it('verifies VRAM specs and quantization recommendations', () => {
      for (const model of MODELS_DATA) {
        assert.ok(model.minVram > 0, `Model ${model.id} minVram must be > 0`);
        assert.ok(model.recommendedVram >= model.minVram, `Model ${model.id} recommendedVram must be >= minVram`);
        assert.ok(Array.isArray(model.quants) && model.quants.length > 0, `Model ${model.id} must define quants`);
        
        const hasRecommended = model.quants.some(q => q.recommended);
        assert.ok(hasRecommended, `Model ${model.id} must have at least one recommended quantization level`);
      }
    });

    it('derives contextCostPer8k from the documented KV-cache architecture specs', () => {
      // fp16 KV cache per 8K tokens; must match KV_SPECS exactly so the figure
      // shown on build pages is never a hand-typed guess again
      const std = (layers, kvHeads, headDim, tokens = 8192) =>
        (2 * layers * kvHeads * headDim * 2 * tokens) / 1e9;
      for (const model of MODELS_DATA) {
        const spec = KV_SPECS[model.id];
        assert.ok(spec, `Model ${model.id} missing KV_SPECS entry`);
        let gb;
        if (spec.mla) {
          gb = (spec.layers * (spec.mla.kvLoraRank + spec.mla.qkRopeHeadDim) * 2 * 8192) / 1e9;
        } else if (spec.linearAttn) {
          // linear-attention layers keep a fixed-size state; only full-attention layers grow
          gb = std(spec.linearAttn.fullLayers, spec.kvHeads, spec.headDim);
        } else if (spec.swa) {
          const w = spec.swa;
          // full-attention layers may use their own kv heads / head dim (Gemma 4)
          const g = spec.globalAttn || { kvHeads: spec.kvHeads, headDim: spec.headDim };
          gb = std(w.localLayers, spec.kvHeads, spec.headDim, Math.min(8192, w.window))
             + std(w.globalLayers, g.kvHeads, g.headDim, 8192);
        } else {
          gb = std(spec.layers, spec.kvHeads, spec.headDim);
        }
        assert.equal(
          model.contextCostPer8k, Number(gb.toFixed(1)),
          `Model ${model.id} contextCostPer8k (${model.contextCostPer8k}) does not match KV-cache math (${gb.toFixed(1)})`
        );
      }
    });

    it('carries the corrected release dates (Qwen3: Apr 29 2025, Gemma 3: Mar 12 2025)', () => {
      const date = (id) => MODELS_DATA.find(m => m.id === id).releaseDate;
      assert.equal(date('qwen-3-8b'), 'Apr 2025');
      assert.equal(date('qwen-3-32b'), 'Apr 2025');
      assert.equal(date('gemma-3-12b'), 'Mar 2025');
      assert.equal(date('gemma-3-27b'), 'Mar 2025');
    });

    it('records total and active parameters separately for MoE models that declare them', () => {
      for (const m of MODELS_DATA.filter(x => x.totalParamsB !== undefined)) {
        assert.ok(m.activeParamsB > 0 && m.activeParamsB <= m.totalParamsB, `${m.id} active <= total`);
        if (m.activeParamsB < m.totalParamsB) {
          // the page must say which is which: "235.1B MoE (22B active)" or model-card headline total (e.g. "671B MoE (37B active)"), never just the active size
          assert.match(m.parameters, new RegExp(`^(\\d+(\\.\\d+)?)B MoE \\(${m.activeParamsB}B active\\)$`), `${m.id} parameters label`);
          const labelTotal = parseFloat(m.parameters);
          assert.ok(Math.abs(labelTotal - m.totalParamsB) / m.totalParamsB < 0.03, `${m.id} parameters total (${labelTotal}B) matches totalParamsB (${m.totalParamsB}B) within 3%`);
          // memory needs come from the total, so the recommended quant is far larger than the active weights
          const rec = m.quants.find(q => q.recommended);
          assert.ok(rec.vram > m.activeParamsB * 0.5, `${m.id} recommended quant size reflects total parameters`);
        }
      }
    });
  });

  describe('BUILDS_DATA Contract', () => {
    it('maps every model in MODELS_DATA to at least 3 hardware tiers in BUILDS_DATA', () => {
      for (const model of MODELS_DATA) {
        const buildEntry = BUILDS_DATA[model.id];
        assert.ok(buildEntry, `Missing build entry for model ID: ${model.id}`);
        assert.ok(Array.isArray(buildEntry.tiers), `Tiers must be an array for ${model.id}`);
        assert.ok(buildEntry.tiers.length >= 3, `Model ${model.id} must have at least 3 build tiers`);

        const tierTypes = buildEntry.tiers.map(t => t.type);
        assert.ok(tierTypes.includes('used'), `Model ${model.id} must have a used tier`);
        assert.ok(tierTypes.includes('balanced'), `Model ${model.id} must have a balanced tier`);
        assert.ok(tierTypes.includes('best') || tierTypes.includes('new'), `Model ${model.id} must have a best/new tier`);
      }
    });

    it('verifies part lists, prices, and TDP realistic values in each build tier', () => {
      for (const [modelId, buildEntry] of Object.entries(BUILDS_DATA)) {
        for (const tier of buildEntry.tiers) {
          assert.ok(tier.name, `Tier in ${modelId} missing name`);
          assert.ok(tier.estimatedTdpWatts >= 100 && tier.estimatedTdpWatts <= 1800, `Tier ${tier.name} in ${modelId} has unreal TDP: ${tier.estimatedTdpWatts}`);
          assert.ok(Array.isArray(tier.parts) && tier.parts.length >= 1, `Tier ${tier.name} in ${modelId} has no parts`);

          let subtotal = 0;
          for (const part of tier.parts) {
            assert.ok(part.category, `Part in ${tier.name} missing category`);
            assert.ok(part.name, `Part in ${tier.name} missing name`);
            assert.ok(typeof part.price === 'number' && part.price >= 0, `Part ${part.name} in ${tier.name} invalid price: ${part.price}`);
            subtotal += part.price;
          }
          assert.ok(subtotal > 300, `Total parts subtotal for ${tier.name} in ${modelId} must be realistic ($${subtotal})`);
        }
      }
    });

    it('verifies parts table URLs match merchant names without cross-merchant mismatches', () => {
      for (const [modelId, build] of Object.entries(BUILDS_DATA)) {
        for (const tier of build.tiers) {
          for (const part of tier.parts) {
            if (part.url === '#') continue;

            const urlLower = part.url.toLowerCase();
            const merchLower = (part.merchant || '').toLowerCase();

            if (urlLower.includes('ebay.')) {
              assert.ok(
                merchLower.includes('ebay'),
                `Part "${part.name}" in ${modelId}/${tier.name} links to eBay but merchant is "${part.merchant}"`
              );
            }

            if (urlLower.includes('amazon.')) {
              assert.ok(
                merchLower.includes('amazon'),
                `Part "${part.name}" in ${modelId}/${tier.name} links to Amazon but merchant is "${part.merchant}"`
              );
            }
          }
        }
      }
    });

    it('verifies motherboard row in Budget Used Dual-3090 links to eBay with valid EPN tracking', () => {
      const llamaBuild = BUILDS_DATA['llama-3.3-70b'];
      assert.ok(llamaBuild, 'llama-3.3-70b build must exist');

      const budgetTier = llamaBuild.tiers.find(t => t.name.includes('Dual-3090') || t.name.includes('Budget'));
      assert.ok(budgetTier, 'Budget Dual-3090 tier must exist');

      const mobo = budgetTier.parts.find(p => p.category === 'Motherboard');
      assert.ok(mobo, 'Motherboard part must exist');
      assert.ok(mobo.url.includes('ebay.com'), `Motherboard URL must be eBay, got: ${mobo.url}`);
      assert.ok(mobo.merchant.toLowerCase().includes('ebay'), `Motherboard merchant must be eBay, got: ${mobo.merchant}`);

      const formattedUrl = formatAffiliateUrl(mobo.url, mobo.merchant);
      const parsed = new URL(formattedUrl);
      assert.equal(parsed.searchParams.get('campid'), '5339219563', 'Motherboard link must include EPN campid');
      assert.equal(parsed.searchParams.get('mkcid'), '1', 'Motherboard link must include mkcid=1');
      assert.equal(parsed.searchParams.get('toolid'), '10001', 'Motherboard link must include toolid=10001');
    });
  });

  describe('CLOUD_PROVIDERS Contract', () => {
    it('defines valid cloud provider pricing profiles', () => {
      assert.ok(CLOUD_PROVIDERS.length >= 4, 'Must have at least 4 cloud providers');
      for (const provider of CLOUD_PROVIDERS) {
        assert.ok(provider.id, 'Provider missing ID');
        assert.ok(provider.name, 'Provider missing name');
        assert.ok(provider.category, `Provider ${provider.id} missing category`);
        assert.ok(provider.hourlyRate > 0, `Provider ${provider.id} hourly rate must be > 0`);
        assert.ok(provider.storageCostPerMonth >= 0, `Provider ${provider.id} storage cost must be >= 0`);
      }
    });
  });
});
