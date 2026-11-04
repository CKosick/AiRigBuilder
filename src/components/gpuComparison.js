// Head-to-head GPU comparison component (/compare/:a-vs-:b)
// Pure HTML shared by browser router and scripts/prerender.js.
import { GPUS_DATA } from '../data/gpus.js';
import { MODELS_DATA } from '../data/models.js';
import { tierFit } from '../utils/tierFit.js';
import { estimateSpeedToks } from '../utils/speedEstimate.js';
import { gpuPath, buildPath, shortGpuName } from '../routes.js';
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

/** Pure HTML for one GPU vs GPU comparison page. */
export function renderGpuComparisonHtml(gpuIdA, gpuIdB) {
  const gpuA = GPUS_DATA.find(g => g.id === gpuIdA);
  const gpuB = GPUS_DATA.find(g => g.id === gpuIdB);
  if (!gpuA || !gpuB) return '';

  const nameA = shortGpuName(gpuA);
  const nameB = shortGpuName(gpuB);

  // Compute model support metrics
  let singleA = 0;
  let singleB = 0;
  let dualA = 0;
  let dualB = 0;
  let onlyOneRuns = 0;

  const modelRows = MODELS_DATA.map(model => {
    const fitA = tierFit(model, { memoryGb: gpuA.vram }, { contextK: 8, kvScale: 1 });
    const fitB = tierFit(model, { memoryGb: gpuB.vram }, { contextK: 8, kvScale: 1 });
    const fitDualA = tierFit(model, { memoryGb: gpuA.vram * 2 }, { contextK: 8, kvScale: 1 });
    const fitDualB = tierFit(model, { memoryGb: gpuB.vram * 2 }, { contextK: 8, kvScale: 1 });

    const runsA = fitA.status !== 'none';
    const runsB = fitB.status !== 'none';
    if (runsA) singleA++;
    if (runsB) singleB++;
    if (fitDualA.status !== 'none') dualA++;
    if (fitDualB.status !== 'none') dualB++;

    const isDifferent = (runsA !== runsB) || (fitA.status !== fitB.status) || (fitA.quant !== fitB.quant);
    if (runsA !== runsB) onlyOneRuns++;

    const speedA = formatToksSpeed(model, fitA.quant, gpuA.bandwidth);
    const speedB = formatToksSpeed(model, fitB.quant, gpuB.bandwidth);

    return {
      model,
      fitA,
      fitB,
      speedA,
      speedB,
      isDifferent
    };
  });

  return `
    <article class="compare-detail" aria-labelledby="compare-detail-title">
      <nav class="breadcrumbs" aria-label="Breadcrumb">
        <ol>
          <li><a href="/">Home</a></li>
          <li><a href="/tracker">GPU Price Tracker</a></li>
          <li aria-current="page">${nameA} vs ${nameB}</li>
        </ol>
      </nav>

      <div class="tracker-header-row">
        <div class="tracker-title">
          <h1 id="compare-detail-title">${gpuA.name} vs ${gpuB.name}</h1>
          <p>Head-to-head comparison for local LLM inference: specs, used prices, and model fit speeds across all ${MODELS_DATA.length} models.</p>
        </div>
        <div class="compare-header-links">
          <a href="${gpuPath(gpuA.id)}" class="btn-secondary">
            ${icon('monitor')}View ${nameA} Page →
          </a>
          <a href="${gpuPath(gpuB.id)}" class="btn-secondary">
            ${icon('monitor')}View ${nameB} Page →
          </a>
        </div>
      </div>

      <!-- Spec Comparison Table -->
      <section class="compare-card" aria-labelledby="compare-specs-title">
        <h2 id="compare-specs-title" class="section-title">Hardware Specifications &amp; Pricing</h2>
        <div class="parts-table-wrap">
          <table class="parts-table stack-table">
            <thead>
              <tr>
                <th scope="col" class="col-spec">Specification</th>
                <th scope="col" class="col-gpu">${nameA}</th>
                <th scope="col" class="col-gpu">${nameB}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="stack-head"><strong>VRAM</strong></td>
                <td class="part-price-cell" data-label="${nameA}">${gpuA.vram} GB ${gpuA.vramType}</td>
                <td class="part-price-cell" data-label="${nameB}">${gpuB.vram} GB ${gpuB.vramType}</td>
              </tr>
              <tr>
                <td class="stack-head"><strong>Memory Bandwidth</strong></td>
                <td class="part-price-cell" data-label="${nameA}">${gpuA.bandwidth} GB/s</td>
                <td class="part-price-cell" data-label="${nameB}">${gpuB.bandwidth} GB/s</td>
              </tr>
              <tr>
                <td class="stack-head"><strong>TDP / Power Draw</strong></td>
                <td class="part-price-cell" data-label="${nameA}">${gpuA.tdp}W</td>
                <td class="part-price-cell" data-label="${nameB}">${gpuB.tdp}W</td>
              </tr>
              <tr>
                <td class="stack-head"><strong>Average Used Street Price</strong></td>
                <td class="part-price-cell" data-label="${nameA}">$${gpuA.usedStreetPrice.toLocaleString('en-US')}</td>
                <td class="part-price-cell" data-label="${nameB}">$${gpuB.usedStreetPrice.toLocaleString('en-US')}</td>
              </tr>
              <tr>
                <td class="stack-head"><strong>Used Price Range (eBay)</strong></td>
                <td class="part-price-cell" data-label="${nameA}">$${gpuA.usedPriceLow}–$${gpuA.usedPriceHigh}</td>
                <td class="part-price-cell" data-label="${nameB}">$${gpuB.usedPriceLow}–$${gpuB.usedPriceHigh}</td>
              </tr>
              <tr>
                <td class="stack-head"><strong>Price per GB VRAM</strong></td>
                <td class="part-price-cell" data-label="${nameA}">$${gpuA.pricePerGb.toFixed(2)} / GB</td>
                <td class="part-price-cell" data-label="${nameB}">$${gpuB.pricePerGb.toFixed(2)} / GB</td>
              </tr>
              <tr>
                <td class="stack-head"><strong>Multi-GPU Score</strong></td>
                <td class="part-price-cell" data-label="${nameA}">${gpuA.multiGpuScore !== undefined ? `${gpuA.multiGpuScore}/10` : '—'}</td>
                <td class="part-price-cell" data-label="${nameB}">${gpuB.multiGpuScore !== undefined ? `${gpuB.multiGpuScore}/10` : '—'}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- Summary Model Counts KPI Grid -->
      <section class="compare-card" aria-labelledby="compare-summary-title">
        <h2 id="compare-summary-title" class="section-title">Model Support Summary (8K Context, FP16 KV)</h2>
        <div class="kpi-row compare-kpi-row">
          <div class="kpi-card">
            <div class="kpi-label">${nameA} (Single-GPU)</div>
            <div class="kpi-value kpi-value-md">${singleA} of ${MODELS_DATA.length}</div>
            <div class="kpi-sub">Models runnable in ${gpuA.vram}GB VRAM</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">${nameB} (Single-GPU)</div>
            <div class="kpi-value kpi-value-md">${singleB} of ${MODELS_DATA.length}</div>
            <div class="kpi-sub">Models runnable in ${gpuB.vram}GB VRAM</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">${nameA} (Dual-GPU, 2x)</div>
            <div class="kpi-value kpi-value-md">${dualA} of ${MODELS_DATA.length}</div>
            <div class="kpi-sub">Models runnable in ${gpuA.vram * 2}GB VRAM</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">${nameB} (Dual-GPU, 2x)</div>
            <div class="kpi-value kpi-value-md">${dualB} of ${MODELS_DATA.length}</div>
            <div class="kpi-sub">Models runnable in ${gpuB.vram * 2}GB VRAM</div>
          </div>
        </div>
        <p class="compare-diff-callout">
          <strong>Single-card difference:</strong> ${onlyOneRuns} of ${MODELS_DATA.length} catalog models run on only one of these two cards at default 8K context.
        </p>
      </section>

      <!-- Full Per-Model Comparison Table -->
      <section class="compare-card" aria-labelledby="compare-models-title">
        <h2 id="compare-models-title" class="section-title">Per-Model Fit &amp; Speed Comparison</h2>
        <p class="section-desc">Evaluated at default 8K context and FP16 KV cache precision. Highlighted rows indicate models where the two cards produce different fit statuses or quantization tiers.</p>
        <div class="parts-table-wrap">
          <table class="parts-table stack-table">
            <thead>
              <tr>
                <th scope="col" class="col-model">Model</th>
                <th scope="col" class="col-fit">${nameA} Fit</th>
                <th scope="col" class="col-speed">${nameA} Speed</th>
                <th scope="col" class="col-fit">${nameB} Fit</th>
                <th scope="col" class="col-speed">${nameB} Speed</th>
              </tr>
            </thead>
            <tbody>
              ${modelRows.map(row => `
                <tr class="${row.isDifferent ? 'row-different' : ''}">
                  <td class="stack-head"><a href="${buildPath(row.model.id)}">${row.model.name}</a></td>
                  <td data-label="${nameA} Fit">${statusBadge(row.fitA)}</td>
                  <td class="part-price-cell" data-label="${nameA} Speed">${row.speedA}</td>
                  <td data-label="${nameB} Fit">${statusBadge(row.fitB)}</td>
                  <td class="part-price-cell" data-label="${nameB} Speed">${row.speedB}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </section>
    </article>
  `;
}

export function createGpuComparison(container) {
  let shownSlug = null;
  return {
    show(gpuIdA, gpuIdB) {
      const slug = `${gpuIdA}-vs-${gpuIdB}`;
      if (shownSlug !== slug) {
        container.innerHTML = renderGpuComparisonHtml(gpuIdA, gpuIdB);
        shownSlug = slug;
      }
    }
  };
}
