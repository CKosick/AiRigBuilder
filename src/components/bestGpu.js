// Best GPU rankings component (/best-gpu/:model)
// Pure HTML shared by browser router and scripts/prerender.js.
import { GPUS_DATA } from '../data/gpus.js';
import { MODELS_DATA } from '../data/models.js';
import { INTEGRATED_SYSTEM_IDS } from './rigPlayground.js';
import { tierFit } from '../utils/tierFit.js';
import { estimateSpeedToks } from '../utils/speedEstimate.js';
import { buildPath, gpuPath, shortGpuName } from '../routes.js';
import { icon } from './icons.js';

function formatToksSpeed(model, quantName, bandwidthGbs) {
  if (!quantName || !bandwidthGbs) return '—';
  const quantObj = model.quants?.find(q => q.name.split(' ')[0] === quantName);
  if (!quantObj) return '—';
  const speed = estimateSpeedToks(model, quantObj, bandwidthGbs);
  if (!speed) return '—';
  return `~${speed.low}-${speed.high} tok/s`;
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

/** Pure HTML for one model's best GPU rankings page. */
export function renderBestGpuHtml(modelId) {
  const model = MODELS_DATA.find(m => m.id === modelId);
  if (!model) return '';

  const discreteGpus = GPUS_DATA.filter(g => !INTEGRATED_SYSTEM_IDS.includes(g.id));

  // Evaluate all single and dual discrete configurations
  const allConfigs = [];
  for (const gpu of discreteGpus) {
    for (const count of [1, 2]) {
      const memoryGb = gpu.vram * count;
      const fit = tierFit(model, { memoryGb }, { contextK: 8, kvScale: 1 });
      const quantObj = fit.quant ? model.quants?.find(q => q.name.split(' ')[0] === fit.quant) : null;
      const speed = quantObj ? estimateSpeedToks(model, quantObj, gpu.bandwidth) : null;
      allConfigs.push({
        gpu,
        count,
        name: `${count}x ${shortGpuName(gpu)}`,
        fullName: `${count}x ${gpu.name}`,
        memoryGb,
        totalPrice: gpu.usedStreetPrice * count,
        fit,
        speed,
        speedStr: speed ? `~${speed.low}-${speed.high} tok/s` : '—'
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

  // Integrated systems check
  const runningSystems = INTEGRATED_SYSTEM_IDS
    .map(id => GPUS_DATA.find(g => g.id === id))
    .filter(g => g && tierFit(model, { memoryGb: g.vram }, { contextK: 8, kvScale: 1 }).status !== 'none');

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

      <!-- Three Labeled Picks -->
      <section class="best-gpu-picks-section" aria-labelledby="picks-title">
        <h2 id="picks-title" class="section-title">Top Recommended Configurations</h2>
        <div class="best-gpu-picks-grid">
          <div class="best-gpu-pick-card pick-cheapest">
            <div class="pick-badge">Cheapest That Runs It</div>
            ${cheapestThatRuns ? `
              <h3 class="pick-name">${cheapestThatRuns.fullName}</h3>
              <div class="pick-price">$${cheapestThatRuns.totalPrice.toLocaleString('en-US')}</div>
              <div class="pick-meta">
                <span>Memory: <strong>${cheapestThatRuns.memoryGb} GB</strong></span>
                <span>Fit: <strong>${cheapestThatRuns.fit.status === 'fits' ? 'Full Fit' : 'Reduced Fit'} (${cheapestThatRuns.fit.quant})</strong></span>
                <span>Speed: <strong>${cheapestThatRuns.speedStr}</strong></span>
              </div>
              <div class="pick-action">
                <a href="${gpuPath(cheapestThatRuns.gpu.id)}" class="btn-secondary">View ${shortGpuName(cheapestThatRuns.gpu)} Details →</a>
              </div>
            ` : `
              <p class="pick-none">No discrete GPU configuration runs this model at default settings.</p>
            `}
          </div>

          <div class="best-gpu-pick-card pick-value">
            <div class="pick-badge pick-badge-green">Best Value Full Fit</div>
            ${bestValueFullFit ? `
              <h3 class="pick-name">${bestValueFullFit.fullName}</h3>
              <div class="pick-price">$${bestValueFullFit.totalPrice.toLocaleString('en-US')}</div>
              <div class="pick-meta">
                <span>Memory: <strong>${bestValueFullFit.memoryGb} GB</strong></span>
                <span>Recommended Quant: <strong>${bestValueFullFit.fit.quant}</strong></span>
                <span>Speed: <strong>${bestValueFullFit.speedStr}</strong></span>
              </div>
              <div class="pick-action">
                <a href="${gpuPath(bestValueFullFit.gpu.id)}" class="btn-secondary">View ${shortGpuName(bestValueFullFit.gpu)} Details →</a>
              </div>
            ` : `
              <p class="pick-none">No discrete GPU configuration achieves a full recommended quant fit.</p>
            `}
          </div>

          <div class="best-gpu-pick-card pick-fastest">
            <div class="pick-badge">Fastest Discrete Rig</div>
            ${fastest ? `
              <h3 class="pick-name">${fastest.fullName}</h3>
              <div class="pick-price">$${fastest.totalPrice.toLocaleString('en-US')}</div>
              <div class="pick-meta">
                <span>Memory: <strong>${fastest.memoryGb} GB</strong></span>
                <span>Fit: <strong>${fastest.fit.quant} (${fastest.fit.status})</strong></span>
                <span>Speed: <strong>${fastest.speedStr}</strong></span>
              </div>
              <div class="pick-action">
                <a href="${gpuPath(fastest.gpu.id)}" class="btn-secondary">View ${shortGpuName(fastest.gpu)} Details →</a>
              </div>
            ` : `
              <p class="pick-none">No discrete GPU configuration runs this model.</p>
            `}
          </div>
        </div>
      </section>

      <!-- Integrated Systems Note (if applicable) -->
      ${runningSystems.length > 0 ? `
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
