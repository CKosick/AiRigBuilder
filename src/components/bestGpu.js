// Best GPU rankings component (/best-gpu/:model)
// Pure HTML shared by browser router and scripts/prerender.js.
import { GPUS_DATA } from '../data/gpus.js';
import { MODELS_DATA } from '../data/models.js';
import { TIER_MAC_M5_ULTRA_256, TIER_MAC_M5_ULTRA_512 } from '../data/builds.js';
import { INTEGRATED_SYSTEM_IDS } from './rigPlayground.js';
import { tierFit } from '../utils/tierFit.js';
import { estimateSpeedToks } from '../utils/speedEstimate.js';
import { formatAffiliateUrl, AFFILIATE_LINK_REL } from '../config/affiliates.js';
import { buildPath, gpuPath, shortGpuName } from '../routes.js';
import { icon } from './icons.js';

const UNIFIED_BUILD_TIERS = [TIER_MAC_M5_ULTRA_256, TIER_MAC_M5_ULTRA_512];

function evaluateMemoryConfig(model, memoryGb, bandwidth) {
  const fit = tierFit(model, { memoryGb }, { contextK: 8, kvScale: 1 });
  const quantObj = fit.quant ? model.quants?.find(q => q.name.split(' ')[0] === fit.quant) : null;
  const speed = quantObj ? estimateSpeedToks(model, quantObj, bandwidth) : null;
  return {
    fit,
    speed,
    speedStr: speed ? `~${speed.low}-${speed.high} tok/s` : '—'
  };
}

function statusBadge(fit) {
  if (!fit || fit.status === 'none') {
    return '<span class="status-badge badge-nofit">Won\'t fit</span>';
  }
  if (fit.status === 'reduced') {
    return `<span class="status-badge badge-reduced">Reduced (${fit.quant})</span>`;
  }
  return `<span class="status-badge badge-fits">Fits (${fit.quant})</span>`;
}

/**
 * Evaluates discrete GPU configurations and unified-memory candidates for a model.
 * Reused by renderBestGpuHtml and Open Graph image generator.
 *
 * @param {string} modelId
 */
export function evaluateBestGpu(modelId) {
  const model = MODELS_DATA.find(m => m.id === modelId);
  if (!model) return null;

  const discreteGpus = GPUS_DATA.filter(g => !INTEGRATED_SYSTEM_IDS.includes(g.id));

  // Evaluate all single and dual discrete configurations
  const allConfigs = [];
  for (const gpu of discreteGpus) {
    for (const count of [1, 2]) {
      const memoryGb = gpu.vram * count;
      const { fit, speed, speedStr } = evaluateMemoryConfig(model, memoryGb, gpu.bandwidth);
      allConfigs.push({
        gpu,
        count,
        name: `${count}x ${shortGpuName(gpu)}`,
        fullName: `${count}x ${gpu.name}`,
        memoryGb,
        totalPrice: gpu.usedStreetPrice * count,
        fit,
        speed,
        speedStr
      });
    }
  }

  // Configurations that run the model
  const runningConfigs = allConfigs.filter(c => c.fit.status !== 'none');
  const fullFitConfigs = runningConfigs.filter(c => c.fit.status === 'fits');

  // 1. Cheapest that runs it: lowest total price with status fits or reduced
  const cheapestThatRuns = [...runningConfigs].sort((a, b) => a.totalPrice - b.totalPrice || (b.speed?.high || 0) - (a.speed?.high || 0))[0] || null;

  // 2. Best value full fit: lowest total price with status fits at recommended quant
  const bestValueFullFit = [...fullFitConfigs].sort((a, b) => a.totalPrice - b.totalPrice || (b.speed?.high || 0) - (a.speed?.high || 0))[0] || null;

  // 3. Fastest: highest computed speed range among fitting configurations
  const fastest = [...runningConfigs].sort((a, b) => (b.speed?.high || 0) - (a.speed?.high || 0) || a.totalPrice - b.totalPrice)[0] || null;

  // Integrated systems check (tracked GPUS_DATA entries + build-sheet M5 Ultra templates)
  const runningSystems = INTEGRATED_SYSTEM_IDS
    .map(id => GPUS_DATA.find(g => g.id === id))
    .filter(g => g && tierFit(model, { memoryGb: g.vram }, { contextK: 8, kvScale: 1 }).status !== 'none');

  const unifiedCandidates = [
    ...runningSystems.map(g => ({
      id: g.id,
      name: g.name,
      fullName: g.name,
      memoryGb: g.vram,
      bandwidth: g.bandwidth,
      totalPrice: g.usedStreetPrice
    })),
    ...UNIFIED_BUILD_TIERS.map(tier => ({
      id: tier.id,
      name: tier.name,
      fullName: tier.name,
      memoryGb: tier.memoryGb,
      bandwidth: tier.bandwidthGbs,
      totalPrice: tier.parts.reduce((sum, part) => sum + (part.price || 0), 0)
    }))
  ];

  const unifiedConfigs = unifiedCandidates
    .map(sys => ({
      ...sys,
      ...evaluateMemoryConfig(model, sys.memoryGb, sys.bandwidth)
    }))
    .filter(c => c.fit.status !== 'none');

  const unifiedPick = [...unifiedConfigs].sort(
    (a, b) => a.totalPrice - b.totalPrice || (b.speed?.high || 0) - (a.speed?.high || 0)
  )[0] || null;

  const showUnifiedPick = Boolean(
    unifiedPick && (
      !cheapestThatRuns ||
      !bestValueFullFit ||
      !fastest ||
      unifiedPick.totalPrice < cheapestThatRuns.totalPrice
    )
  );

  // Best configuration for each of the 15 discrete GPUs
  const gpuRows = discreteGpus.map(gpu => {
    const c1 = allConfigs.find(c => c.gpu.id === gpu.id && c.count === 1);
    const c2 = allConfigs.find(c => c.gpu.id === gpu.id && c.count === 2);

    let best = c1;
    if (c1.fit.status === 'none' && c2.fit.status !== 'none') {
      best = c2;
    } else if (c1.fit.status === 'reduced' && c2.fit.status === 'fits') {
      best = c2;
    } else if (c1.fit.status === 'fits') {
      best = c1;
    } else if (c1.fit.status === 'reduced' && c2.fit.status === 'reduced') {
      best = c1;
    }
    return best;
  });

  // Sort rows: running GPUs first (by total price asc), then non-fitting GPUs (by price asc)
  gpuRows.sort((a, b) => {
    const aRuns = a.fit.status !== 'none';
    const bRuns = b.fit.status !== 'none';
    if (aRuns && !bRuns) return -1;
    if (!aRuns && bRuns) return 1;
    return a.totalPrice - b.totalPrice;
  });

  return {
    model,
    discreteGpus,
    allConfigs,
    runningConfigs,
    fullFitConfigs,
    cheapestThatRuns,
    bestValueFullFit,
    fastest,
    runningSystems,
    unifiedPick,
    showUnifiedPick,
    gpuRows
  };
}

/**
 * Groups the three discrete best-GPU picks by configuration (GPU ID + card count)
 * so duplicate configurations render once in the position of their first pick
 * with combined labels, appending the unified-memory pick when applicable.
 */
export function groupBestGpuPicks({
  cheapestThatRuns,
  bestValueFullFit,
  fastest,
  unifiedPick = null,
  showUnifiedPick = false
}) {
  const rawSlots = [
    {
      role: 'cheapest',
      cardClass: 'pick-cheapest',
      label: 'Cheapest That Runs It',
      isGreen: false,
      config: cheapestThatRuns,
      emptyText: 'No discrete GPU configuration runs this model at default settings.',
      fitMetaHtml: cheapestThatRuns
        ? `<span>Fit: <strong>${cheapestThatRuns.fit.status === 'fits' ? 'Full Fit' : 'Reduced Fit'} (${cheapestThatRuns.fit.quant})</strong></span>`
        : ''
    },
    {
      role: 'value',
      cardClass: 'pick-value',
      label: 'Best Value Full Fit',
      isGreen: true,
      config: bestValueFullFit,
      emptyText: 'No discrete GPU configuration achieves a full recommended quant fit.',
      fitMetaHtml: bestValueFullFit
        ? `<span>Recommended Quant: <strong>${bestValueFullFit.fit.quant}</strong></span>`
        : ''
    },
    {
      role: 'fastest',
      cardClass: 'pick-fastest',
      label: 'Fastest Discrete Rig',
      isGreen: false,
      config: fastest,
      emptyText: 'No discrete GPU configuration runs this model.',
      fitMetaHtml: fastest
        ? `<span>Fit: <strong>${fastest.fit.quant} (${fastest.fit.status})</strong></span>`
        : ''
    }
  ];

  const hasDiscreteRunner = Boolean(cheapestThatRuns || bestValueFullFit || fastest);
  const omitEmptyDiscrete = Boolean(showUnifiedPick && unifiedPick && !hasDiscreteRunner);

  const grouped = [];
  const byConfigKey = new Map();

  for (const slot of rawSlots) {
    if (!slot.config) {
      if (omitEmptyDiscrete) continue;
      grouped.push({
        roles: [slot.role],
        cardClasses: [slot.cardClass],
        labels: [slot.label],
        combinedLabel: slot.label,
        isGreen: slot.isGreen,
        config: null,
        emptyText: slot.emptyText,
        fitMetaHtml: ''
      });
      continue;
    }

    const key = `${slot.config.gpu.id}:${slot.config.count}`;
    const existing = byConfigKey.get(key);
    if (existing) {
      existing.roles.push(slot.role);
      existing.cardClasses.push(slot.cardClass);
      existing.labels.push(slot.label);
      existing.combinedLabel = existing.labels.join(' · ');
      if (slot.isGreen) existing.isGreen = true;
    } else {
      const card = {
        key,
        isUnified: false,
        roles: [slot.role],
        cardClasses: [slot.cardClass],
        labels: [slot.label],
        combinedLabel: slot.label,
        isGreen: slot.isGreen,
        config: slot.config,
        emptyText: slot.emptyText,
        fitMetaHtml: slot.fitMetaHtml
      };
      byConfigKey.set(key, card);
      grouped.push(card);
    }
  }

  if (showUnifiedPick && unifiedPick) {
    grouped.push({
      key: `unified:${unifiedPick.id}`,
      isUnified: true,
      roles: ['unified'],
      cardClasses: ['pick-unified'],
      labels: ['Unified-Memory Pick'],
      combinedLabel: 'Unified-Memory Pick',
      isGreen: unifiedPick.fit.status === 'fits',
      config: unifiedPick,
      emptyText: '',
      fitMetaHtml: `<span>Fit: <strong>${unifiedPick.fit.status === 'fits' ? 'Full Fit' : 'Reduced Fit'} (${unifiedPick.fit.quant})</strong></span>`
    });
  }

  return grouped;
}

/** Pure HTML for one model's best GPU rankings page. */
export function renderBestGpuHtml(modelId) {
  const evalResult = evaluateBestGpu(modelId);
  if (!evalResult) return '';
  const { model, cheapestThatRuns, bestValueFullFit, fastest, runningSystems, unifiedPick, showUnifiedPick, gpuRows } = evalResult;
  const pickCards = groupBestGpuPicks({ cheapestThatRuns, bestValueFullFit, fastest, unifiedPick, showUnifiedPick });

  return `
    <article class="best-gpu-detail" aria-labelledby="best-gpu-title">
      <nav class="breadcrumbs" aria-label="Breadcrumb">
        <ol>
          <li><a href="/">Home</a></li>
          <li><a href="/builds">Build Sheets</a></li>
          <li aria-current="page">Best GPU for ${model.name}</li>
        </ol>
      </nav>

      <div class="tracker-header-row">
        <div class="tracker-title">
          <h1 id="best-gpu-title">Best GPU for ${model.name}</h1>
          <p>Discrete GPU configurations (single and dual-card) ranked for running ${model.name} locally. Evaluated at default 8K context and FP16 KV precision.</p>
        </div>
        <div class="compare-header-links">
          <a href="${buildPath(model.id)}" class="btn-primary">
            ${icon('monitor')}View ${model.name} Build Sheet →
          </a>
        </div>
      </div>

      <!-- Labeled Picks (grouped when one configuration holds multiple picks) -->
      <section class="best-gpu-picks-section" aria-labelledby="picks-title">
        <h2 id="picks-title" class="section-title">Top Recommended Configurations</h2>
        <div class="best-gpu-picks-grid">
          ${pickCards.map(card => `
          <div class="best-gpu-pick-card ${card.cardClasses.join(' ')}"${card.key ? ` data-config-key="${card.key}"` : ''}>
            <div class="pick-badge${card.isGreen ? ' pick-badge-green' : ''}">${card.combinedLabel}</div>
            ${card.config ? `
              <h3 class="pick-name">${card.config.fullName}</h3>
              <div class="pick-price">$${card.config.totalPrice.toLocaleString('en-US')}</div>
              <div class="pick-meta">
                <span>Memory: <strong>${card.config.memoryGb} GB</strong></span>
                ${card.fitMetaHtml}
                <span>Speed: <strong>${card.config.speedStr}</strong></span>
              </div>
              <div class="pick-action">
                ${card.isUnified ? `
                <a href="${buildPath(model.id)}" class="btn-secondary">View ${model.name} Build Sheet →</a>
                ` : `
                <a href="${gpuPath(card.config.gpu.id)}" class="btn-secondary">View ${shortGpuName(card.config.gpu)} Details →</a>
                ${card.config.gpu.amazonSearchUrl ? `
                <a href="${formatAffiliateUrl(card.config.gpu.amazonSearchUrl, 'Amazon', `gpu-${card.config.gpu.id}`)}" target="_blank" rel="${AFFILIATE_LINK_REL}" class="btn-secondary" data-click-merchant="Amazon" data-click-id="gpu:${card.config.gpu.id}:amazon" data-gpu-id="${card.config.gpu.id}" data-link-kind="amazon">${icon('cart')}Buy on Amazon →</a>` : ''}
                `}
              </div>
            ` : `
              <p class="pick-none">${card.emptyText}</p>
            `}
          </div>`).join('')}
        </div>
      </section>

      <!-- Integrated Systems Note (if applicable and no unified pick card is shown) -->
      ${!showUnifiedPick && runningSystems.length > 0 ? `
      <aside class="integrated-system-note" aria-label="Integrated systems note">
        ${icon('bulb')}
        <div>
          <strong>Integrated Unified-Memory Systems:</strong>
          Unified systems (${runningSystems.map(s => `${s.name} with ${s.vram}GB`).join(', ')}) also run ${model.name}, but are excluded from discrete GPU rankings. Check the <a href="${buildPath(model.id)}">${model.name} build sheet</a> for unified platform parts lists and power estimates.
        </div>
      </aside>` : ''}

      <!-- Full Ranked Table -->
      <section class="compare-card" aria-labelledby="best-gpu-table-title">
        <h2 id="best-gpu-table-title" class="section-title">All Tracked GPUs: Best Configuration for ${model.name}</h2>
        <p class="section-desc">Shows each discrete card in its optimal configuration (1x single card or 2x dual identical pair). Dual-card configurations sum usable VRAM and reflect 2x the average used eBay card price.</p>
        <div class="parts-table-wrap">
          <table class="parts-table stack-table">
            <thead>
              <tr>
                <th scope="col" class="col-gpu">GPU Configuration</th>
                <th scope="col" class="col-vram">Usable VRAM</th>
                <th scope="col" class="col-fit">Fit Status</th>
                <th scope="col" class="col-quant">Quant</th>
                <th scope="col" class="col-speed">Estimated Speed</th>
                <th scope="col" class="col-price">Total Card Cost</th>
                <th scope="col" class="col-link">Details</th>
              </tr>
            </thead>
            <tbody>
              ${gpuRows.map(row => `
                <tr class="${row.fit.status !== 'none' ? 'row-fit' : 'row-nofit'}">
                  <td class="stack-head">
                    <a href="${gpuPath(row.gpu.id)}"><strong>${row.name}</strong></a>
                  </td>
                  <td class="part-price-cell" data-label="Usable VRAM">${row.memoryGb} GB</td>
                  <td data-label="Fit Status">${statusBadge(row.fit)}</td>
                  <td data-label="Quant">${row.fit.quant || '—'}</td>
                  <td class="part-price-cell" data-label="Estimated Speed">${row.speedStr}</td>
                  <td class="part-price-cell" data-label="Total Card Cost">$${row.totalPrice.toLocaleString('en-US')}</td>
                  <td class="stack-action" data-label="Details">
                    <a href="${gpuPath(row.gpu.id)}" class="table-link">View GPU →</a>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </section>
    </article>
  `;
}

export function createBestGpu(container) {
  let shownModelId = null;
  return {
    show(modelId) {
      if (shownModelId !== modelId) {
        container.innerHTML = renderBestGpuHtml(modelId);
        shownModelId = modelId;
      }
    }
  };
}
