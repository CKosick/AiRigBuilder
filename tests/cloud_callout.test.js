import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { BUILDS_DATA } from '../src/data/builds.js';
import { CLOUD_RATES, CLOUD_RATES_AS_OF } from '../src/data/providers.js';
import {
  AFFILIATE_LINK_REL,
  RUNPOD_REFERRAL_URL,
  VAST_REFERRAL_URL
} from '../src/config/affiliates.js';
import {
  TIER_CLOUD_MATCH_TABLE,
  matchTierCloudConfig,
  computeCloudRentalCallout,
  getTierCloudCallout,
  renderTierCloudCalloutHtml
} from '../src/utils/cloudCallout.js';
import { renderModelPickerHtml } from '../src/components/modelPicker.js';

describe('Cloud rental callout on tier cards', () => {
  it('classifies every tier in BUILDS_DATA: 112 of 220 matched, all 56 sheets have >= 1 match, and offload/Mac/Strix/5090/PRO6000/4060Ti are unmatched', () => {
    let totalTiers = 0;
    let matchedTiers = 0;
    let unmatchedTiers = 0;
    let sheetsWithMatch = 0;
    let offloadTiers = 0;
    const byConfig = new Map();

    const modelIds = Object.keys(BUILDS_DATA);
    assert.equal(modelIds.length, 56);

    for (const [, sheet] of Object.entries(BUILDS_DATA)) {
      let sheetMatches = 0;
      for (const tier of sheet.tiers) {
        totalTiers++;
        const match = matchTierCloudConfig(tier);
        if (tier.id === 'tier-ram-offload') {
          offloadTiers++;
          assert.equal(match, null, 'RAM offload tier must be unmatched despite carrying a 3090 part');
          assert.equal(renderTierCloudCalloutHtml(tier), '');
        }
        if (match) {
          matchedTiers++;
          sheetMatches++;
          byConfig.set(match.configId, (byConfig.get(match.configId) || 0) + 1);
        } else {
          unmatchedTiers++;
          assert.equal(renderTierCloudCalloutHtml(tier), '');
        }
      }
      assert.ok(sheetMatches >= 1, 'Every build sheet has at least one matched tier');
      if (sheetMatches >= 1) sheetsWithMatch++;
    }

    assert.equal(totalTiers, 220);
    assert.equal(matchedTiers, 112);
    assert.equal(unmatchedTiers, 108);
    assert.equal(sheetsWithMatch, 56);
    assert.equal(offloadTiers, 6);

    assert.equal(byConfig.get('dual-rtx-3090'), 44);
    assert.equal(byConfig.get('single-rtx-3090'), 26);
    assert.equal(byConfig.get('single-rtx-3080-10gb'), 8);
    assert.equal(byConfig.get('single-rtx-3060-12gb'), 8);
    assert.equal(byConfig.get('single-rtx-4090-24gb'), 26);
    assert.equal(TIER_CLOUD_MATCH_TABLE.length, 5);
  });

  it('selects the cheapest rate from CLOUD_RATES for multi-offer GPU configs', () => {
    const llamaDual3090 = BUILDS_DATA['llama-3.3-70b'].tiers.find(t => t.id === 'tier-budget-used');
    const dualMatch = matchTierCloudConfig(llamaDual3090);
    assert.equal(dualMatch.cheapestOffer.id, 'vast-dual-3090');
    assert.equal(dualMatch.cheapestOffer.hourlyRate, 0.42);
    assert.equal(dualMatch.cheapestOffer.label, 'Vast.ai 2x RTX 3090');

    const qwenSingle3090 = BUILDS_DATA['qwen-2.5-coder-32b'].tiers.find(t => t.id === 'tier-budget-used');
    const single3090Match = matchTierCloudConfig(qwenSingle3090);
    assert.equal(single3090Match.cheapestOffer.id, 'vast-single-3090');
    assert.equal(single3090Match.cheapestOffer.hourlyRate, 0.21);

    const qwenSingle4090 = BUILDS_DATA['qwen-2.5-coder-32b'].tiers.find(t => t.id === 'tier-best-new');
    const single4090Match = matchTierCloudConfig(qwenSingle4090);
    assert.equal(single4090Match.cheapestOffer.id, 'vast-single-4090');
    assert.equal(single4090Match.cheapestOffer.hourlyRate, 0.48);
  });

  it('formats rental-fees equivalence across <12m (1 decimal), 12-60m (whole months), and >60m (more than 5 years)', () => {
    // Golden Llama 3.3 70B budget dual-3090 tier ($2,532 at $0.42/hr)
    const llamaBudget = BUILDS_DATA['llama-3.3-70b'].tiers.find(t => t.id === 'tier-budget-used');
    const llamaCallout = getTierCloudCallout(llamaBudget);
    assert.equal(llamaCallout.tierTotal, 2532);
    assert.equal(Math.round(llamaCallout.rawMonths), 50);
    assert.equal(
      llamaCallout.line,
      "Rent the same GPUs instead: from $0.42/hr (Vast.ai 2x RTX 3090). At 4 hrs/day, this rig's price equals about 50 months of rental fees."
    );
    assert.equal(llamaCallout.subLine, `Cloud rates checked ${CLOUD_RATES_AS_OF}`);

    // Under 12 months: one decimal ("about 8.4 months of rental fees")
    const under12 = computeCloudRentalCallout(430, 0.42, 'Vast.ai 2x RTX 3090');
    assert.equal(
      under12.line,
      "Rent the same GPUs instead: from $0.42/hr (Vast.ai 2x RTX 3090). At 4 hrs/day, this rig's price equals about 8.4 months of rental fees."
    );

    // Over 60 months: "more than 5 years of rental fees"
    const over60 = computeCloudRentalCallout(3373, 0.42, 'Vast.ai 2x RTX 3090');
    assert.equal(
      over60.line,
      "Rent the same GPUs instead: from $0.42/hr (Vast.ai 2x RTX 3090). At 4 hrs/day, this rig's price equals more than 5 years of rental fees."
    );
  });

  it('renders in prerendered HTML for matched default tiers, updates on tier switch, renders tracked referral links, and preserves the Cloud Alternative badge', () => {
    const llamaDefaultHtml = renderModelPickerHtml({ activeModelId: 'llama-3.3-70b' });
    assert.ok(llamaDefaultHtml.includes('class="tier-cloud-callout"'));
    assert.ok(
      llamaDefaultHtml.includes(
        "Rent the same GPUs instead: from $0.42/hr (Vast.ai 2x RTX 3090). At 4 hrs/day, this rig's price equals about 50 months of rental fees."
      )
    );
    assert.ok(llamaDefaultHtml.includes(`Cloud rates checked ${CLOUD_RATES_AS_OF}`));
    assert.ok(llamaDefaultHtml.includes('<div class="spec-badge-label">Cloud Alternative</div>'));

    // Matched dual-3090 tier renders both provider referral links with sponsored rel and click tracking
    const calloutChunk = renderTierCloudCalloutHtml(
      BUILDS_DATA['llama-3.3-70b'].tiers.find(t => t.id === 'tier-budget-used')
    );
    assert.ok(
      calloutChunk.includes(
        `<a href="${VAST_REFERRAL_URL}" target="_blank" rel="${AFFILIATE_LINK_REL}" class="btn-secondary btn-text-sm" data-click-merchant="Vast" data-click-id="vast-dual-3090">Rent on Vast.ai</a>`
      ),
      'Dual-3090 callout renders tracked Vast.ai referral link'
    );
    assert.ok(
      calloutChunk.includes(
        `<a href="${RUNPOD_REFERRAL_URL}" target="_blank" rel="${AFFILIATE_LINK_REL}" class="btn-secondary btn-text-sm" data-click-merchant="RunPod" data-click-id="runpod-dual-3090">Rent on RunPod</a>`
      ),
      'Dual-3090 callout renders tracked RunPod referral link'
    );

    // Single-provider matched tier (e.g. RTX 3060 12GB) renders only Vast.ai link
    const single3060Tier = Object.values(BUILDS_DATA)
      .flatMap(s => s.tiers)
      .find(t => matchTierCloudConfig(t)?.configId === 'single-rtx-3060-12gb');
    assert.ok(single3060Tier, 'Found a single-rtx-3060-12gb tier');
    const single3060Callout = renderTierCloudCalloutHtml(single3060Tier);
    assert.ok(single3060Callout.includes('Rent on Vast.ai'));
    assert.ok(single3060Callout.includes('data-click-id="vast-single-3060"'));
    assert.ok(!single3060Callout.includes('Rent on RunPod'));

    // Switching to unmatched Mac Studio M2 Ultra tier omits the callout and links
    const llamaMacHtml = renderModelPickerHtml({
      activeModelId: 'llama-3.3-70b',
      activeTierId: 'tier-best-new'
    });
    assert.ok(!llamaMacHtml.includes('class="tier-cloud-callout"'));
    assert.ok(!llamaMacHtml.includes('Rent on RunPod'));
    assert.ok(!llamaMacHtml.includes('Rent on Vast.ai'));

    // Switching to matched balanced dual-3090 tier ($3,373 -> more than 5 years)
    const llamaBalancedHtml = renderModelPickerHtml({
      activeModelId: 'llama-3.3-70b',
      activeTierId: 'tier-balanced-mix'
    });
    assert.ok(
      llamaBalancedHtml.includes(
        "Rent the same GPUs instead: from $0.42/hr (Vast.ai 2x RTX 3090). At 4 hrs/day, this rig's price equals more than 5 years of rental fees."
      )
    );
  });
});

