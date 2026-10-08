import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { GPUS_DATA } from '../src/data/gpus.js';
import { MODELS_DATA } from '../src/data/models.js';
import { BUILDS_DATA } from '../src/data/builds.js';
import { CLOUD_PROVIDERS } from '../src/data/providers.js';
import { formatAffiliateUrl } from '../src/config/affiliates.js';

describe('Data Integrity & Consistency Contracts', () => {
  describe('GPUS_DATA Contract', () => {
    it('contains exactly the 10 tracked GPUs with unique IDs', () => {
      assert.equal(GPUS_DATA.length, 10);
      const ids = GPUS_DATA.map(g => g.id);
      const uniqueIds = new Set(ids);
      assert.equal(uniqueIds.size, 10, 'All GPU IDs must be unique');
    });

    it('ensures each GPU has valid pricing bounds and mathematical consistency', () => {
      for (const gpu of GPUS_DATA) {
        assert.ok(gpu.name, `GPU ${gpu.id} missing name`);
        assert.ok(gpu.vram > 0, `GPU ${gpu.id} invalid VRAM`);
        assert.ok(gpu.usedStreetPrice > 0, `GPU ${gpu.id} street price must be > 0`);
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
        assert.ok(Array.isArray(gpu.history) && gpu.history.length >= 2, `GPU ${gpu.id} must have >= 2 history points`);
        const lastHistory = gpu.history[gpu.history.length - 1];
        assert.equal(lastHistory.date, 'Current', `GPU ${gpu.id} last history point must be 'Current'`);
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
  });

  describe('BUILDS_DATA Contract', () => {
    it('maps every model in MODELS_DATA to 3 hardware tiers in BUILDS_DATA', () => {
      for (const model of MODELS_DATA) {
        const buildEntry = BUILDS_DATA[model.id];
        assert.ok(buildEntry, `Missing build entry for model ID: ${model.id}`);
        assert.ok(Array.isArray(buildEntry.tiers), `Tiers must be an array for ${model.id}`);
        assert.equal(buildEntry.tiers.length, 3, `Model ${model.id} must have exactly 3 build tiers (Budget, Balanced, Best)`);

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
