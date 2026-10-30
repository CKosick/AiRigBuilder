// Method-based token generation speed estimator for airigbuilder.com.
//
// Method (published site basis from catalog refresh batch 1):
//   bytesPerToken = activeParamsB * (quant.vram / totalParamsB)
//   speed range   = [0.5, 0.75] * bandwidthGbs / bytesPerToken
//   if MoE (activeParamsB < totalParamsB): halve the range again (* 0.5)
//
// Constants:
//   - 0.50 (low) and 0.75 (high): sustained memory-bandwidth efficiency bounds for local
//     single-stream autoregressive decoding.
//   - 0.50 MoE factor: accounts for expert routing and per-token scatter/gather overhead on
//     sparse Mixture-of-Experts models.
//   - 936 GB/s: reference memory bandwidth for the 2x RTX 3090 baseline (single-card GDDR6X
//     bandwidth; multi-GPU tensor/pipeline split uses the single-card figure per site convention).
//
// Validation anchor:
//   Qwen 3 30B-A3B (totalParamsB = 30.5, activeParamsB = 3.3) at Q4_K_M (vram = 18.6 GB)
//   on 936 GB/s:
//     bytesPerToken = 3.3 * (18.6 / 30.5) = 2.012459 GB/tok
//     low  = round(0.50 * 936 / 2.012459 * 0.5) = round(116.276) = 116 tok/s
//     high = round(0.75 * 936 / 2.012459 * 0.5) = round(174.414) = 174 tok/s
//     formatted: "~116-174 tok/s on 2x 3090 (bandwidth-bound est.)"
//
// Note: These figures are theoretical memory-bandwidth-bound estimates, not hardware benchmarks.
// Real-world token throughput varies with runtime engine, context length, batch size, and
// interconnect overhead.

export const DUAL_3090_BANDWIDTH_GBS = 936;
export const EFFICIENCY_LOW = 0.5;
export const EFFICIENCY_HIGH = 0.75;
export const MOE_FACTOR = 0.5;

/**
 * Computes the bandwidth-bound token generation speed range (in whole tok/s) for a model,
 * quantization entry, and memory bandwidth (in GB/s).
 *
 * @param {{ totalParamsB?: number, activeParamsB?: number }} model
 * @param {{ vram?: number }} quant
 * @param {number | null | undefined} bandwidthGbs
 * @returns {{ low: number, high: number } | null}
 */
export function estimateSpeedToks(model, quant, bandwidthGbs) {
  if (!model || !quant) return null;
  if (typeof bandwidthGbs !== 'number' || !Number.isFinite(bandwidthGbs) || bandwidthGbs <= 0) {
    return null;
  }
  const { totalParamsB, activeParamsB } = model;
  if (typeof totalParamsB !== 'number' || !Number.isFinite(totalParamsB) || totalParamsB <= 0) {
    return null;
  }
  if (
    typeof activeParamsB !== 'number' ||
    !Number.isFinite(activeParamsB) ||
    activeParamsB <= 0 ||
    activeParamsB > totalParamsB
  ) {
    return null;
  }
  if (typeof quant.vram !== 'number' || !Number.isFinite(quant.vram) || quant.vram <= 0) {
    return null;
  }

  const bytesPerToken = activeParamsB * (quant.vram / totalParamsB);
  const moeFactor = activeParamsB < totalParamsB ? MOE_FACTOR : 1;
  const low = Math.round(((EFFICIENCY_LOW * bandwidthGbs) / bytesPerToken) * moeFactor);
  const high = Math.round(((EFFICIENCY_HIGH * bandwidthGbs) / bytesPerToken) * moeFactor);

  return { low, high };
}

/**
 * Formats a { low, high } speed range into the batch 1 stored quant speed string on 2x RTX 3090.
 *
 * @param {{ low: number, high: number } | null | undefined} range
 * @returns {string | null}
 */
export function formatSpeedRange(range) {
  if (!range || typeof range.low !== 'number' || typeof range.high !== 'number') {
    return null;
  }
  return `~${range.low}-${range.high} tok/s on 2x 3090 (bandwidth-bound est.)`;
}

/**
 * Formats a per-tier speed estimate line for a fitted quantization level on a build sheet tier card.
 *
 * @param {string} quantLabel - Short quant name (e.g. "Q4_K_M")
 * @param {{ low: number, high: number } | null | undefined} range
 * @returns {string | null}
 */
export function formatTierSpeedLine(quantLabel, range) {
  if (!quantLabel || !range || typeof range.low !== 'number' || typeof range.high !== 'number') {
    return null;
  }
  return `Estimated speed at ${quantLabel}: ~${range.low}-${range.high} tok/s (bandwidth-bound estimate)`;
}

