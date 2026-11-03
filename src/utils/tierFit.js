// Does a model fit a build tier? Computed from the model's quant sizes (MODELS_DATA[].quants)
// and the tier's usable GPU / unified memory (BUILDS_DATA tiers' memoryGb).

// Reserved for the CUDA / Metal runtime and compute buffers
export const RUNTIME_OVERHEAD_GB = 1;
// A quant only counts as fitting if it also leaves room for this much context
export const MIN_CONTEXT_K = 8;
// Context room above this is shown as "32K+" (models' max context isn't in the data)
const CONTEXT_DISPLAY_CAP_K = 32;

const shortQuant = (q) => q.name.split(' ')[0];

/**
 * Returns how a model fits a tier:
 *   status 'fits'    — the recommended quant fits with at least the requested context
 *   status 'reduced' — only a smaller quant fits
 *   status 'none'    — no listed quant fits
 * plus the chosen quant, its size, and the context room left (in K tokens).
 *
 * @param {object} model
 * @param {object} tier
 * @param {{ contextK?: number, kvScale?: number }} [options]
 */
export function tierFit(model, tier, { contextK: reqContextK = MIN_CONTEXT_K, kvScale = 1 } = {}) {
  const usable = tier.memoryGb - RUNTIME_OVERHEAD_GB;
  const effectivePer8k = (model.contextCostPer8k || 0) * kvScale;
  const perK = effectivePer8k / 8;
  const fitsWithContext = (q) => q.vram + perK * reqContextK <= usable;

  const quants = [...model.quants].sort((a, b) => b.vram - a.vram);
  const recommended = model.quants.find(q => q.recommended) || quants[quants.length - 1];
  const smallest = quants[quants.length - 1];

  let status;
  let quant;
  if (fitsWithContext(recommended)) {
    status = 'fits';
    quant = recommended;
  } else {
    quant = quants.find(fitsWithContext);
    status = quant ? 'reduced' : 'none';
  }

  const isDefault = reqContextK === MIN_CONTEXT_K && kvScale === 1;
  const displayCap = Math.max(CONTEXT_DISPLAY_CAP_K, reqContextK);
  const remainingK = quant ? (perK > 0 ? Math.floor((usable - quant.vram) / perK / 8) * 8 : displayCap) : 0;
  const contextLabel = remainingK >= displayCap ? `${displayCap}K+` : `~${remainingK}K`;

  const evalQuant = quant || smallest;
  const weightsGb = evalQuant.vram;
  const contextGb = Number((perK * reqContextK).toFixed(1));
  const overheadGb = RUNTIME_OVERHEAD_GB;
  const capacityGb = tier.memoryGb;
  const needsGb = Number((weightsGb + contextGb + overheadGb).toFixed(1));
  const headroomGb = Math.max(0, Number((capacityGb - needsGb).toFixed(1)));
  const shortfallGb = Math.max(0, Number((needsGb - capacityGb).toFixed(1)));
  const evalQuantName = shortQuant(evalQuant);

  const breakdown = {
    weightsGb,
    contextGb,
    overheadGb,
    capacityGb,
    needsGb,
    headroomGb,
    shortfallGb,
    quantName: evalQuantName
  };

  return {
    status,
    memoryGb: tier.memoryGb,
    quant: quant ? shortQuant(quant) : null,
    quantVram: quant ? quant.vram : null,
    contextK: remainingK,
    contextLabel,
    recommendedQuant: shortQuant(recommended),
    recommendedVram: recommended.vram,
    smallestQuant: shortQuant(smallest),
    smallestVram: smallest.vram,
    selectedContextK: reqContextK,
    kvScale,
    isDefault,
    tierId: tier.id,
    weightsGb,
    contextGb,
    overheadGb,
    capacityGb,
    needsGb,
    headroomGb,
    shortfallGb,
    evalQuantName,
    breakdown
  };
}

/** One-line verdict for a tier card. */
export function fitHeadline(model, fit) {
  if (fit.status === 'none') return `Won't fit ${model.name}: needs ${fit.smallestVram}+ GB, this rig has ${fit.memoryGb} GB`;
  const contextStr = fit.isDefault ? fit.contextLabel : `${fit.selectedContextK}K`;
  if (fit.status === 'reduced') return `Runs ${model.name} at ${fit.quant} (not the recommended ${fit.recommendedQuant}) with ${contextStr} context`;
  return `Runs ${model.name} at ${fit.quant} with ${contextStr} context`;
}

/** Fuller explanation for the GPU line and the tier summary. */
export function fitDetail(model, fit) {
  const reqContext = fit.selectedContextK || MIN_CONTEXT_K;
  if (fit.status === 'none') {
    return `Won't fit: even ${model.name}'s smallest listed quant (${fit.smallestQuant}, ${fit.smallestVram} GB) plus ${reqContext}K context needs more than this tier's ${fit.memoryGb} GB of usable memory. Pick a larger tier or a smaller model.`;
  }
  const head = `${model.name} at ${fit.quant} uses ${fit.quantVram} GB of this tier's ${fit.memoryGb} GB, leaving room for ${fit.contextLabel} tokens of context.`;
  if (fit.status === 'reduced') {
    return `${head} The recommended ${fit.recommendedQuant} (${fit.recommendedVram} GB) doesn't fit with ${reqContext}K context here, so expect slightly lower output quality.`;
  }
  return head;
}

/** First tier the model actually fits, so pages never open on a rig that can't run it. */
export function defaultTierId(sheet) {
  return (sheet.tiers.find(t => t.fit && t.fit.status !== 'none') || sheet.tiers[0]).id;
}

/** Cheapest tier that runs the model, or null when none does. */
export function cheapestFittingTotal(sheet) {
  const totals = sheet.tiers
    .filter(t => !t.fit || t.fit.status !== 'none')
    .map(t => t.parts.reduce((sum, p) => sum + (p.price || 0), 0));
  return totals.length ? Math.min(...totals) : null;
}

/**
 * Pure HTML for the VRAM allocation breakdown bar.
 * Renders demand segments against capacity or shortfall when overflowing.
 * Returns empty string for the system RAM offload tier (tier-ram-offload).
 *
 * @param {object} fit - result from tierFit
 * @param {object|string} [tier] - tier object or tierId
 */
export function renderVramBreakdownBarHtml(fit, tier) {
  if (!fit) return '';
  const tierId = (typeof tier === 'string' ? tier : tier?.id) || fit.tierId;
  if (tierId === 'tier-ram-offload') return '';

  const {
    weightsGb = 0,
    contextGb = 0,
    overheadGb = RUNTIME_OVERHEAD_GB,
    capacityGb = fit.memoryGb || 0,
    needsGb = 0,
    headroomGb = 0,
    shortfallGb = 0,
    quantName = fit.quant || fit.smallestQuant || ''
  } = fit.breakdown || fit;

  const isOverflow = fit.status === 'none';

  if (!isOverflow) {
    const weightsPct = capacityGb > 0 ? (weightsGb / capacityGb) * 100 : 0;
    const contextPct = capacityGb > 0 ? (contextGb / capacityGb) * 100 : 0;
    const overheadPct = capacityGb > 0 ? (overheadGb / capacityGb) * 100 : 0;
    const headroomPct = capacityGb > 0 ? (headroomGb / capacityGb) * 100 : 0;

    return `
      <div class="vram-breakdown" role="region" aria-label="VRAM Allocation Breakdown">
        <div class="vram-breakdown-header">
          <span class="vram-breakdown-title">VRAM Allocation</span>
          <span class="vram-breakdown-summary"><span class="vram-num">${needsGb.toFixed(1)} GB</span> of <span class="vram-num">${capacityGb.toFixed(1)} GB</span> used (<span class="vram-num">${headroomGb.toFixed(1)} GB</span> free)</span>
        </div>
        <div class="vram-bar" role="progressbar" aria-valuenow="${needsGb.toFixed(1)}" aria-valuemin="0" aria-valuemax="${capacityGb.toFixed(1)}" aria-label="VRAM usage: ${needsGb.toFixed(1)} GB of ${capacityGb.toFixed(1)} GB">
          <div class="vram-bar-segment vram-segment-weights" style="width: ${weightsPct.toFixed(2)}%;" title="Model weights (${quantName}): ${weightsGb.toFixed(1)} GB">
            <span class="vram-segment-label">Weights ${weightsGb.toFixed(1)} GB</span>
          </div>
          ${contextGb > 0 ? `
          <div class="vram-bar-segment vram-segment-kv" style="width: ${contextPct.toFixed(2)}%;" title="KV cache: ${contextGb.toFixed(1)} GB">
            <span class="vram-segment-label">KV cache ${contextGb.toFixed(1)} GB</span>
          </div>` : ''}
          <div class="vram-bar-segment vram-segment-overhead" style="width: ${overheadPct.toFixed(2)}%;" title="Runtime overhead: ${overheadGb.toFixed(1)} GB">
            <span class="vram-segment-label">Runtime overhead ${overheadGb.toFixed(1)} GB</span>
          </div>
          <div class="vram-bar-segment vram-segment-headroom" style="width: ${headroomPct.toFixed(2)}%;" title="Free memory: ${headroomGb.toFixed(1)} GB">
            <span class="vram-segment-label">Free ${headroomGb.toFixed(1)} GB</span>
          </div>
        </div>
        <div class="vram-breakdown-legend">
          <div class="vram-legend-item">
            <span class="vram-legend-swatch vram-swatch-weights" aria-hidden="true"></span>
            <span class="vram-legend-label">Model weights (${quantName}):</span>
            <span class="vram-legend-val">${weightsGb.toFixed(1)} GB</span>
          </div>
          ${contextGb > 0 ? `
          <div class="vram-legend-item">
            <span class="vram-legend-swatch vram-swatch-kv" aria-hidden="true"></span>
            <span class="vram-legend-label">KV cache:</span>
            <span class="vram-legend-val">${contextGb.toFixed(1)} GB</span>
          </div>` : ''}
          <div class="vram-legend-item">
            <span class="vram-legend-swatch vram-swatch-overhead" aria-hidden="true"></span>
            <span class="vram-legend-label">Runtime overhead:</span>
            <span class="vram-legend-val">${overheadGb.toFixed(1)} GB</span>
          </div>
          <div class="vram-legend-item">
            <span class="vram-legend-swatch vram-swatch-headroom" aria-hidden="true"></span>
            <span class="vram-legend-label">Free memory:</span>
            <span class="vram-legend-val">${headroomGb.toFixed(1)} GB</span>
          </div>
        </div>
      </div>
    `.trim();
  }

  // When overflowing (status === 'none')
  const weightsPct = needsGb > 0 ? (weightsGb / needsGb) * 100 : 0;
  const contextPct = needsGb > 0 ? (contextGb / needsGb) * 100 : 0;
  const overheadPct = needsGb > 0 ? (overheadGb / needsGb) * 100 : 0;
  const capacityPct = needsGb > 0 ? (capacityGb / needsGb) * 100 : 0;
  const shortfallPct = needsGb > 0 ? (shortfallGb / needsGb) * 100 : 0;

  return `
    <div class="vram-breakdown is-overflow" role="region" aria-label="VRAM Allocation Breakdown">
      <div class="vram-breakdown-header">
        <span class="vram-breakdown-title">VRAM Allocation</span>
        <span class="vram-breakdown-summary is-shortfall">Needs <span class="vram-num">${needsGb.toFixed(1)} GB</span> vs <span class="vram-num">${capacityGb.toFixed(1)} GB</span> capacity (<span class="vram-num">${shortfallGb.toFixed(1)} GB</span> shortfall)</span>
      </div>
      <div class="vram-bar vram-bar-overflow" role="progressbar" aria-valuenow="${capacityGb.toFixed(1)}" aria-valuemin="0" aria-valuemax="${needsGb.toFixed(1)}" aria-label="VRAM required: ${needsGb.toFixed(1)} GB exceeds ${capacityGb.toFixed(1)} GB capacity by ${shortfallGb.toFixed(1)} GB">
        <div class="vram-bar-segment vram-segment-weights" style="width: ${weightsPct.toFixed(2)}%;" title="Model weights (${quantName}): ${weightsGb.toFixed(1)} GB">
          <span class="vram-segment-label">Weights ${weightsGb.toFixed(1)} GB</span>
        </div>
        ${contextGb > 0 ? `
        <div class="vram-bar-segment vram-segment-kv" style="width: ${contextPct.toFixed(2)}%;" title="KV cache: ${contextGb.toFixed(1)} GB">
          <span class="vram-segment-label">KV cache ${contextGb.toFixed(1)} GB</span>
        </div>` : ''}
        <div class="vram-bar-segment vram-segment-overhead" style="width: ${overheadPct.toFixed(2)}%;" title="Runtime overhead: ${overheadGb.toFixed(1)} GB">
          <span class="vram-segment-label">Runtime overhead ${overheadGb.toFixed(1)} GB</span>
        </div>
        <div class="vram-capacity-marker" style="left: ${capacityPct.toFixed(2)}%;" aria-hidden="true">
          <div class="vram-capacity-line"></div>
          <div class="vram-capacity-badge">Capacity: ${capacityGb.toFixed(1)} GB</div>
        </div>
        <div class="vram-shortfall-zone" style="left: ${capacityPct.toFixed(2)}%; width: ${shortfallPct.toFixed(2)}%;" title="Shortfall: ${shortfallGb.toFixed(1)} GB over capacity">
          <span class="vram-shortfall-tag">Shortfall +${shortfallGb.toFixed(1)} GB</span>
        </div>
      </div>
      <div class="vram-breakdown-legend">
        <div class="vram-legend-item">
          <span class="vram-legend-swatch vram-swatch-weights" aria-hidden="true"></span>
          <span class="vram-legend-label">Model weights (${quantName}):</span>
          <span class="vram-legend-val">${weightsGb.toFixed(1)} GB</span>
        </div>
        ${contextGb > 0 ? `
        <div class="vram-legend-item">
          <span class="vram-legend-swatch vram-swatch-kv" aria-hidden="true"></span>
          <span class="vram-legend-label">KV cache:</span>
          <span class="vram-legend-val">${contextGb.toFixed(1)} GB</span>
        </div>` : ''}
        <div class="vram-legend-item">
          <span class="vram-legend-swatch vram-swatch-overhead" aria-hidden="true"></span>
          <span class="vram-legend-label">Runtime overhead:</span>
          <span class="vram-legend-val">${overheadGb.toFixed(1)} GB</span>
        </div>
        <div class="vram-legend-item is-shortfall">
          <span class="vram-legend-swatch vram-swatch-shortfall" aria-hidden="true"></span>
          <span class="vram-legend-label">Shortfall:</span>
          <span class="vram-legend-val">+${shortfallGb.toFixed(1)} GB</span>
        </div>
      </div>
    </div>
  `.trim();
}
