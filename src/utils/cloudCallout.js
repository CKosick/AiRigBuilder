// Cloud rental callout for build-sheet hardware tiers.
// Matches a tier's GPU configuration against an explicit table of CLOUD_RATES offer IDs
// and computes the rental-fees-only equivalence at 4 hrs/day.
import { CLOUD_RATES, CLOUD_RATES_AS_OF } from '../data/providers.js';
import { AFFILIATE_LINK_REL, getCloudReferralUrl } from '../config/affiliates.js';

export const CLOUD_CALLOUT_DAILY_HOURS = 4;
export const CLOUD_CALLOUT_DAYS_PER_MONTH = 30.44;

// Complete, explicit match table (GPU configuration -> CLOUD_RATES ids).
export const TIER_CLOUD_MATCH_TABLE = [
  {
    configId: 'dual-rtx-3090',
    gpuPartNames: [
      '2x NVIDIA GeForce RTX 3090 24GB',
      '2x NVIDIA GeForce RTX 3090 24GB (or 2x RTX A5000)'
    ],
    cloudRateIds: ['vast-dual-3090', 'runpod-dual-3090']
  },
  {
    configId: 'single-rtx-3090',
    gpuPartNames: ['1x NVIDIA GeForce RTX 3090 24GB'],
    cloudRateIds: ['vast-single-3090', 'runpod-single-3090']
  },
  {
    configId: 'single-rtx-3080-10gb',
    gpuPartNames: ['NVIDIA GeForce RTX 3080 10GB'],
    cloudRateIds: ['vast-single-3080']
  },
  {
    configId: 'single-rtx-3060-12gb',
    gpuPartNames: ['NVIDIA GeForce RTX 3060 12GB'],
    cloudRateIds: ['vast-single-3060']
  },
  {
    configId: 'single-rtx-4090-24gb',
    gpuPartNames: ['NVIDIA GeForce RTX 4090 24GB'],
    cloudRateIds: ['vast-single-4090', 'runpod-single-4090']
  }
];

/**
 * Matches a build-sheet tier against TIER_CLOUD_MATCH_TABLE.
 * Explicitly excludes the RAM-offload tier (tier-ram-offload) even though it carries a 3090 part.
 */
export function matchTierCloudConfig(tier) {
  if (!tier || tier.id === 'tier-ram-offload' || !Array.isArray(tier.parts)) {
    return null;
  }
  const gpuPart = tier.parts.find(p => p.category && p.category.startsWith('GPU'));
  if (!gpuPart) {
    return null;
  }
  const entry = TIER_CLOUD_MATCH_TABLE.find(row => row.gpuPartNames.includes(gpuPart.name));
  if (!entry) {
    return null;
  }
  const offers = entry.cloudRateIds
    .map(id => (CLOUD_RATES[id] ? { id, ...CLOUD_RATES[id] } : null))
    .filter(Boolean);
  if (!offers.length) {
    return null;
  }
  const cheapestOffer = offers.reduce(
    (min, cur) => (cur.hourlyRate < min.hourlyRate ? cur : min),
    offers[0]
  );
  const tierTotal = tier.parts.reduce((sum, p) => sum + (p.price || 0), 0);

  return {
    configId: entry.configId,
    gpuPartName: gpuPart.name,
    cloudRateIds: entry.cloudRateIds,
    offers,
    cheapestOffer,
    tierTotal
  };
}

/**
 * Computes the rental-fees-only equivalence and formatted callout lines.
 * months = tierTotal / (rate * 4 hrs/day * 30.44 days)
 */
export function computeCloudRentalCallout(tierTotal, hourlyRate, label, asOf = CLOUD_RATES_AS_OF) {
  const monthlyRental = hourlyRate * CLOUD_CALLOUT_DAILY_HOURS * CLOUD_CALLOUT_DAYS_PER_MONTH;
  const rawMonths = tierTotal / monthlyRental;

  let equivalencePhrase;
  if (rawMonths < 12) {
    equivalencePhrase = `about ${rawMonths.toFixed(1)} months of rental fees`;
  } else if (Math.round(rawMonths) <= 60) {
    equivalencePhrase = `about ${Math.round(rawMonths)} months of rental fees`;
  } else {
    equivalencePhrase = 'more than 5 years of rental fees';
  }

  const line = `Rent the same GPUs instead: from $${hourlyRate.toFixed(2)}/hr (${label}). At ${CLOUD_CALLOUT_DAILY_HOURS} hrs/day, this rig's price equals ${equivalencePhrase}.`;
  const subLine = `Cloud rates checked ${asOf}`;

  return {
    tierTotal,
    hourlyRate,
    label,
    rawMonths,
    equivalencePhrase,
    line,
    subLine
  };
}

/**
 * Returns the full cloud callout data for a build-sheet tier, or null if unmatched.
 */
export function getTierCloudCallout(tier) {
  const match = matchTierCloudConfig(tier);
  if (!match) return null;
  const callout = computeCloudRentalCallout(
    match.tierTotal,
    match.cheapestOffer.hourlyRate,
    match.cheapestOffer.label
  );
  return { ...match, ...callout };
}

function cloudReferralLinkMeta(offerId) {
  const href = getCloudReferralUrl(offerId);
  if (!href) return null;
  if (offerId.startsWith('runpod-')) {
    return { href, merchant: 'RunPod', label: 'Rent on RunPod' };
  }
  if (offerId.startsWith('vast-')) {
    return { href, merchant: 'Vast', label: 'Rent on Vast.ai' };
  }
  return null;
}

/**
 * Renders the HTML callout block for a matched tier, or empty string if unmatched.
 */
export function renderTierCloudCalloutHtml(tier) {
  const callout = getTierCloudCallout(tier);
  if (!callout) return '';
  const linksHtml = callout.offers
    .map(offer => {
      const meta = cloudReferralLinkMeta(offer.id);
      if (!meta) return '';
      return `<a href="${meta.href}" target="_blank" rel="${AFFILIATE_LINK_REL}" class="btn-secondary btn-text-sm" data-click-merchant="${meta.merchant}" data-click-id="${offer.id}">${meta.label}</a>`;
    })
    .filter(Boolean)
    .join('\n            ');
  return `
        <div class="tier-cloud-callout">
          <div class="tier-cloud-callout-line">${callout.line}</div>
          <div class="tier-cloud-callout-sub">${callout.subLine}</div>${linksHtml ? `
          <div class="tier-cloud-callout-actions">
            ${linksHtml}
          </div>` : ''}
        </div>`;
}

