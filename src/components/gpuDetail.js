// GPU detail page (/gpu/:id): price, range, $/GB, history and build notes for one tracked GPU.
// Rendered at build time into a static page; in the browser the chart is drawn on top.
import { GPUS_DATA, GPUS_UPDATED_AT } from '../data/gpus.js';
import { formatAffiliateUrl, AFFILIATE_LINK_REL } from '../config/affiliates.js';
import { fillMonthGaps } from '../utils/priceHistory.js';
import { trendBadgeHtml } from '../utils/priceTrends.js';
import { gpuSummary } from '../utils/siteFacts.js';
import { gpuPath, shortGpuName } from '../routes.js';
import { drawPriceHistoryChart } from './priceHistoryChart.js';
import { icon } from './icons.js';

const formatDate = (iso) => new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });

/** Pure HTML for one GPU's page, shared by the browser and scripts/prerender.js. */
export function renderGpuDetailHtml(gpu) {
  const { missingMonths } = fillMonthGaps(gpu.history);
  const historyRows = [...gpu.history].reverse().map((h, i, rows) => {
    const prev = rows[i + 1];
    const change = prev ? h.price - prev.price : null;
    return `
              <tr>
                <td>${h.date}</td>
                <td class="part-price-cell">$${h.price.toLocaleString('en-US')}</td>
                <td>${change === null ? '<span class="text-dim">—</span>' : `${change > 0 ? '+' : change < 0 ? '−' : '±'}$${Math.abs(change)}`}</td>
              </tr>`;
  }).join('');
  const others = [...GPUS_DATA].filter(g => g.id !== gpu.id).sort((a, b) => a.pricePerGb - b.pricePerGb);

  return `
    <article class="gpu-detail" aria-labelledby="gpu-detail-title">
      <nav class="breadcrumbs" aria-label="Breadcrumb">
        <ol>
          <li><a href="/">Home</a></li>
          <li><a href="/tracker">GPU Price Tracker</a></li>
          <li aria-current="page">${shortGpuName(gpu)}</li>
        </ol>
      </nav>

      <div class="tracker-header-row">
        <div class="tracker-title">
          <h1 id="gpu-detail-title">${gpu.name} Used Price</h1>
          <p>${gpu.aiRating} · ${gpu.vram} GB ${gpu.vramType} · Prices last updated ${formatDate(GPUS_UPDATED_AT)}</p>
        </div>
        <a href="${formatAffiliateUrl(gpu.ebaySoldUrl, 'eBay Sold')}" target="_blank" rel="${AFFILIATE_LINK_REL}" class="btn-primary">
          ${icon('search')}View Live eBay Sold Listings →
        </a>
      </div>

      <div class="kpi-row">
        <div class="kpi-card hero-kpi">
          <div class="kpi-label">Avg Used Street Price</div>
          <div class="kpi-value">$${gpu.usedStreetPrice.toLocaleString('en-US')}</div>
          <div class="kpi-sub">From verified eBay sold listings</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Typical Range</div>
          <div class="kpi-value kpi-value-md">$${gpu.usedPriceLow}–$${gpu.usedPriceHigh}</div>
          <div class="kpi-sub">${gpu.newPrice ? `New: $${gpu.newPrice.toLocaleString('en-US')}` : 'No longer sold new'}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Price / GB VRAM</div>
          <div class="kpi-value is-good">$${gpu.pricePerGb.toFixed(2)}</div>
          <div class="kpi-sub">${gpu.vram} GB ${gpu.vramType}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Price Trend</div>
          <div class="kpi-value kpi-value-sm">${trendBadgeHtml(gpu.trend7d)} <span class="kpi-sub">7d</span></div>
          <div class="kpi-sub">${trendBadgeHtml(gpu.trend30d)} 30d</div>
        </div>
      </div>

      <p class="gpu-detail-summary">${gpuSummary(gpu)}</p>

      <section class="gpu-detail-card" aria-labelledby="gpu-chart-title">
        <h3 id="gpu-chart-title">Monthly Average Sold Price</h3>
        <div class="gpu-detail-chart">
          <canvas id="gpu-detail-chart" role="img" aria-label="Monthly average sold price chart for ${gpu.name}. The same data is in the price history table below."></canvas>
        </div>
        ${missingMonths > 0 ? `<p class="gpu-detail-note">Gaps in the chart are months with no recorded sold-price data (${missingMonths} months).</p>` : ''}
      </section>

      <div class="gpu-detail-grid">
        <section class="gpu-detail-card" aria-labelledby="gpu-specs-title">
          <h3 id="gpu-specs-title">Specs for Local AI</h3>
          <table class="gpu-detail-specs">
            <tbody>
              <tr><th scope="row">VRAM</th><td>${gpu.vram} GB ${gpu.vramType}</td></tr>
              <tr><th scope="row">Memory bandwidth</th><td>${gpu.bandwidth} GB/s</td></tr>
              <tr><th scope="row">TDP</th><td>${gpu.tdp} W</td></tr>
              <tr><th scope="row">Multi-GPU score</th><td>${gpu.multiGpuScore} / 10</td></tr>
              <tr><th scope="row">New price</th><td>${gpu.newPrice ? `$${gpu.newPrice.toLocaleString('en-US')}` : 'Discontinued'}</td></tr>
            </tbody>
          </table>
        </section>
        <section class="gpu-detail-card gpu-detail-pros" aria-labelledby="gpu-pros-title">
          <h3 id="gpu-pros-title">${icon('check')}AI Strengths</h3>
          <ul>${gpu.pros.map(p => `<li>${p}</li>`).join('')}</ul>
        </section>
        <section class="gpu-detail-card gpu-detail-cons" aria-labelledby="gpu-cons-title">
          <h3 id="gpu-cons-title">${icon('alert')}Build Gotchas</h3>
          <ul>${gpu.cons.map(c => `<li>${c}</li>`).join('')}</ul>
        </section>
      </div>

      <section class="gpu-detail-card" aria-labelledby="gpu-history-title">
        <h3 id="gpu-history-title">${shortGpuName(gpu)} Price History</h3>
        <div class="parts-table-wrap">
          <table class="parts-table">
            <thead>
              <tr>
                <th scope="col">Month</th>
                <th scope="col">Avg Sold Price</th>
                <th scope="col">Change vs Previous Month on Record</th>
              </tr>
            </thead>
            <tbody>${historyRows}
            </tbody>
          </table>
        </div>
      </section>

      <section class="gpu-detail-card" aria-labelledby="gpu-others-title">
        <h3 id="gpu-others-title">Other Tracked GPUs</h3>
        <ul class="gpu-detail-others">
          ${others.map(g => `<li><a href="${gpuPath(g.id)}">${g.name}</a> <span>$${g.usedStreetPrice.toLocaleString('en-US')} · $${g.pricePerGb.toFixed(2)}/GB</span></li>`).join('')}
        </ul>
        <p class="gpu-detail-back"><a href="/tracker" class="btn-secondary">← Compare all GPUs and set a price-drop alert</a></p>
      </section>
    </article>
  `;
}

export function createGpuDetail(container) {
  let chart = null;
  let shownId = null;

  return {
    show(gpuId) {
      const gpu = GPUS_DATA.find(g => g.id === gpuId);
      if (!gpu) return;
      if (shownId !== gpuId) {
        container.innerHTML = renderGpuDetailHtml(gpu);
        shownId = gpuId;
      }
      if (chart) chart.destroy();
      chart = drawPriceHistoryChart(container.querySelector('#gpu-detail-chart'), gpu).chart;
    }
  };
}
