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
    isDefault
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
