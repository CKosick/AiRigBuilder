// Cloud Break-Even Calculator Component (airigbuilder.com)
// The backlink and traffic engine comparing used local AI rigs vs RunPod/Vast.ai
import { CLOUD_PROVIDERS } from '../data/providers.js';
import { computeBreakEven, BASELINE_RIG } from '../utils/breakEven.js';
import { Chart, LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend } from 'chart.js';

// Register Chart.js components
Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend);

export const BREAK_EVEN_DEFAULTS = {
  rigUpfrontCost: BASELINE_RIG.cost, // $ (Dual used 3090 rig build sheet)
  dailyUsageHours: 4, // hrs/day
  selectedProviderId: 'runpod-dual-3090',
  hourlyCloudRate: 0.88, // $/hr
  monthlyDiskFee: 7.00, // $/mo
  systemWatts: BASELINE_RIG.watts, // Watts
  kwhRate: 0.14, // $/kWh
  resaleRetentionPct: 65 // % residual value after 2 years
};

function calculateBreakEven(s) {
  return computeBreakEven({
    rigUpfrontCost: s.rigUpfrontCost,
    dailyUsageHours: s.dailyUsageHours,
    hourlyCloudRate: s.hourlyCloudRate,
    monthlyDiskFee: s.monthlyDiskFee,
    systemWatts: s.systemWatts,
    kwhRate: s.kwhRate,
    resaleRetentionPct: s.resaleRetentionPct
  });
}

const money = (n) => `${n < 0 ? '-' : ''}$${Math.abs(Math.round(n)).toLocaleString()}`;
const signedMoney = (n) => `${n >= 0 ? '+' : ''}${money(n)}`;
const paysOff = (stats) => Number.isFinite(stats.breakEvenMonths) && stats.breakEvenMonths <= 60;

function kpiHtml(stats) {
  return `
    <div class="kpi-card hero-kpi">
      <div class="kpi-label">Break-Even Point</div>
      <div class="kpi-value">${paysOff(stats) ? `${stats.breakEvenMonths.toFixed(1)} mo` : (Number.isFinite(stats.breakEvenMonths) ? '> 5 yrs' : 'Never')}</div>
      <div class="kpi-sub">${paysOff(stats) ? `~${stats.breakEvenDays} calendar days` : (Number.isFinite(stats.breakEvenMonths) ? 'Low usage' : 'Power costs more than cloud')}</div>
    </div>

    <div class="kpi-card">
      <div class="kpi-label">Monthly Cloud Bill</div>
      <div class="kpi-value is-warn">$${Math.round(stats.monthlyCloudTotal)}/mo</div>
      <div class="kpi-sub">Rent + persistent disk</div>
    </div>

    <div class="kpi-card">
      <div class="kpi-label">Monthly Local Power</div>
      <div class="kpi-value">$${Math.round(stats.monthlyLocalPower)}/mo</div>
      <div class="kpi-sub">Just $${stats.localHourlyPower.toFixed(2)}/hr active</div>
    </div>

    <div class="kpi-card">
      <div class="kpi-label">2-Year Net Savings</div>
      <div class="kpi-value ${stats.netCashSavings24Mo >= 0 ? 'is-good' : 'is-bad'}">${signedMoney(stats.netCashSavings24Mo)}</div>
      <div class="kpi-sub">${signedMoney(stats.netEquitySavings24Mo)} with resale equity</div>
    </div>
  `;
}

function narrativeHtml(stats, { dailyUsageHours, rigUpfrontCost }) {
  const usage = `Running at <strong>${dailyUsageHours} hrs/day</strong>, your <strong>$${rigUpfrontCost.toLocaleString()}</strong> home rig`;
  if (!Number.isFinite(stats.breakEvenMonths)) {
    return `${usage} never pays for itself: its electricity costs more per month than renting in the cloud. At this usage, cloud is the cheaper option.`;
  }
  if (!paysOff(stats)) {
    return `${usage} takes about <strong>${(stats.breakEvenMonths / 12).toFixed(0)} years</strong> to pay for itself at this usage. Over 2 years you'd be <strong>${money(-stats.netCashSavings24Mo)} behind</strong> renting in cash (${signedMoney(stats.netEquitySavings24Mo)} once you count resale value).`;
  }
  if (stats.netCashSavings24Mo < 0) {
    return `${usage} pays for itself in <strong>${stats.breakEvenMonths.toFixed(1)} months</strong>. Over 2 years you'd still be <strong>${money(-stats.netCashSavings24Mo)} behind</strong> renting in cash (${signedMoney(stats.netEquitySavings24Mo)} once you count resale value).`;
  }
  return `${usage} pays for itself in <strong>${stats.breakEvenMonths.toFixed(1)} months</strong>. Over 2 years, you pocket <strong>${money(stats.netCashSavings24Mo)} in cash</strong> while maintaining 100% data privacy and offline autonomy.`;
}

/**
 * Pure HTML for the calculator in a given state. The component renders it in the browser
 * and scripts/prerender.js renders it at build time, so both produce the same markup.
 */
export function renderBreakEvenHtml(state = {}) {
  const s = { ...BREAK_EVEN_DEFAULTS, ...state };
  const {
    rigUpfrontCost, dailyUsageHours, selectedProviderId, hourlyCloudRate, monthlyDiskFee, systemWatts, kwhRate, resaleRetentionPct
  } = s;
  const stats = calculateBreakEven(s);

  return `
    <div class="calc-grid">
      <!-- Inputs Column -->
      <div class="calc-inputs-card">
        <div class="calc-section-title">
          <span>⚙️ Hardware & Usage Parameters</span>
        </div>
        <div class="calc-section-desc">
          Compare your local AI hardware investment against rented GPU cloud hours.
        </div>

        <!-- Rig Upfront Purchase Cost -->
        <div class="calc-input-block">
          <div class="calc-input-label">
            <span>Local AI Rig Total Build Cost</span>
            <span class="calc-badge-val" id="badge-rig-cost">$${rigUpfrontCost.toLocaleString()}</span>
          </div>
          <input type="range" id="input-rig-cost" aria-label="Local AI rig total build cost (dollars)" min="400" max="4500" step="10" value="${rigUpfrontCost}">
          <div class="sub-note">
            Includes used GPUs, motherboard, PSU, RAM, storage
          </div>
        </div>

        <!-- Daily Usage Hours -->
        <div class="calc-input-block">
          <div class="calc-input-label">
            <span>Average Daily Usage</span>
            <span class="calc-badge-val" id="badge-daily-hours">${dailyUsageHours} hrs / day</span>
          </div>
          <input type="range" id="input-daily-hours" aria-label="Average daily usage (hours per day)" min="1" max="24" step="0.5" value="${dailyUsageHours}">
          <div class="sub-note">
            Active prompt eval + token streaming + batch agents
          </div>
        </div>

        <!-- Cloud Provider Preset -->
        <div class="calc-input-block">
          <div class="calc-input-label">
            <span>Cloud Provider Comparison</span>
          </div>
          <select class="calc-select" id="select-provider" aria-label="Cloud provider comparison">
            ${CLOUD_PROVIDERS.map(p => `
              <option value="${p.id}" ${p.id === selectedProviderId ? 'selected' : ''}>
                ${p.name} ($${p.hourlyRate.toFixed(2)}/hr)
              </option>
            `).join('')}
            <option value="custom">Custom Hourly Rate...</option>
          </select>
        </div>

        <!-- Hourly Rate & Disk Fee -->
        <div class="calc-pair-grid">
          <div>
            <div class="calc-input-label">
              <span>Cloud $/hr</span>
            </div>
            <input type="number" class="calc-text-input" id="input-hourly-rate" aria-label="Cloud price (dollars per hour)" step="0.05" min="0.10" max="10.00" value="${hourlyCloudRate.toFixed(2)}">
          </div>
          <div>
            <div class="calc-input-label">
              <span>Storage $/mo</span>
            </div>
            <input type="number" class="calc-text-input" id="input-disk-fee" aria-label="Cloud storage (dollars per month)" step="1" min="0" max="50" value="${monthlyDiskFee.toFixed(2)}">
          </div>
        </div>

        <!-- Rig Power Draw & Electricity Rate -->
        <div class="calc-input-block">
          <div class="calc-input-label">
            <span>Rig Load Power Draw</span>
            <span class="calc-badge-val" id="badge-watts">${systemWatts} Watts</span>
          </div>
          <input type="range" id="input-system-watts" aria-label="Rig load power draw (watts)" min="150" max="1400" step="25" value="${systemWatts}">
        </div>

        <div class="calc-input-block">
          <div class="calc-input-label">
            <span>Electricity Cost</span>
            <span class="calc-badge-val" id="badge-kwh">$${kwhRate.toFixed(2)} / kWh</span>
          </div>
          <input type="range" id="input-kwh" aria-label="Electricity cost (dollars per kWh)" min="0.06" max="0.38" step="0.01" value="${kwhRate}">
        </div>

        <!-- Resale Equity Retention -->
        <div class="calc-input-block">
          <div class="calc-input-label">
            <span>Used Hardware Resale Value (2 Yrs)</span>
            <span class="calc-badge-val" id="badge-resale">${resaleRetentionPct}%</span>
          </div>
          <input type="range" id="input-resale" aria-label="Used hardware resale value after 2 years (percent)" min="30" max="85" step="5" value="${resaleRetentionPct}">
          <div class="sub-note">
            Used RTX 3090 cards historically hold ~65-75% value over 24 months
          </div>
        </div>
      </div>

      <!-- Results & Chart Column -->
      <div class="calc-results-card">
        <!-- KPI Row -->
        <div class="kpi-row" id="calc-kpis">${kpiHtml(stats)}</div>

        <!-- Chart Area -->
        <div class="chart-header">
          <div class="chart-title">Cumulative Spend Timeline: Local Rig vs Cloud (24 Months)</div>
          <div class="chart-legend-row">
            <div class="legend-item">
              <div class="legend-dot legend-cloud"></div>
              <span>Cloud Rental</span>
            </div>
            <div class="legend-item">
              <div class="legend-dot legend-local"></div>
              <span>Local Rig Cash Outlay</span>
            </div>
            <div class="legend-item">
              <div class="legend-dot legend-equity"></div>
              <span>Net After Resale Equity</span>
            </div>
          </div>
        </div>

        <div class="chart-canvas-container">
          <canvas id="break-even-chart" role="img" aria-label="Cumulative spend over 24 months: cloud rental versus local rig"></canvas>
        </div>

        <!-- Bottom Narrative & Sharing -->
        <div class="calc-narrative-box">
          <div class="calc-narrative-text" id="calc-narrative">${narrativeHtml(stats, s)}</div>
          <button class="btn-secondary btn-nowrap" id="btn-copy-calc-reddit">
            📋 Copy Summary
          </button>
        </div>
      </div>
    </div>
  `;
}

export function createBreakEvenCalc(container) {
  let rigUpfrontCost = BREAK_EVEN_DEFAULTS.rigUpfrontCost;
  let dailyUsageHours = BREAK_EVEN_DEFAULTS.dailyUsageHours;
  let selectedProviderId = BREAK_EVEN_DEFAULTS.selectedProviderId;
  let hourlyCloudRate = BREAK_EVEN_DEFAULTS.hourlyCloudRate;
  let monthlyDiskFee = BREAK_EVEN_DEFAULTS.monthlyDiskFee;
  let systemWatts = BREAK_EVEN_DEFAULTS.systemWatts;
  let kwhRate = BREAK_EVEN_DEFAULTS.kwhRate;
  let resaleRetentionPct = BREAK_EVEN_DEFAULTS.resaleRetentionPct;

  let chartInstance = null;

  const currentState = () => ({
    rigUpfrontCost, dailyUsageHours, selectedProviderId, hourlyCloudRate, monthlyDiskFee, systemWatts, kwhRate, resaleRetentionPct
  });
  const calculate = () => calculateBreakEven(currentState());

  // Updates numbers and chart in place, so sliders keep working mid-drag
  function update() {
    const stats = calculate();
    const setText = (id, text) => {
      const el = container.querySelector(`#${id}`);
      if (el) el.textContent = text;
    };
    setText('badge-rig-cost', `$${rigUpfrontCost.toLocaleString()}`);
    setText('badge-daily-hours', `${dailyUsageHours} hrs / day`);
    setText('badge-watts', `${systemWatts} Watts`);
    setText('badge-kwh', `$${kwhRate.toFixed(2)} / kWh`);
    setText('badge-resale', `${resaleRetentionPct}%`);
    container.querySelector('#calc-kpis').innerHTML = kpiHtml(stats);
    container.querySelector('#calc-narrative').innerHTML = narrativeHtml(stats, { dailyUsageHours, rigUpfrontCost });
    renderChart(stats);
  }

  function render() {
    container.innerHTML = renderBreakEvenHtml(currentState());

    attachEvents();
    renderChart(calculate());
  }

  function renderChart(stats) {
    const canvas = container.querySelector('#break-even-chart');
    if (!canvas) return;

    const months = Array.from({ length: 25 }, (_, i) => `M${i}`);
    
    // Cloud cumulative data: monthlyCloudTotal * month
    const cloudData = months.map((_, i) => Math.round(stats.monthlyCloudTotal * i));

    // Local cumulative data: upfront + (monthlyLocalPower * month)
    const localData = months.map((_, i) => Math.round(rigUpfrontCost + (stats.monthlyLocalPower * i)));

    // Net Equity data: local cumulative - (resale value amortized)
    const equityData = months.map((_, i) => {
      const depreciationFactor = Math.max(0.3, 1 - (i / 24) * (1 - resaleRetentionPct / 100));
      const currentAssetValue = rigUpfrontCost * depreciationFactor;
      return Math.round(rigUpfrontCost + (stats.monthlyLocalPower * i) - currentAssetValue);
    });

    if (chartInstance && chartInstance.canvas === canvas) {
      chartInstance.data.datasets[0].data = cloudData;
      chartInstance.data.datasets[1].data = localData;
      chartInstance.data.datasets[2].data = equityData;
      chartInstance.update('none');
      return;
    }
    if (chartInstance) chartInstance.destroy();

    chartInstance = new Chart(canvas, {
      type: 'line',
      data: {
        labels: months,
        datasets: [
          {
            label: 'Cloud Rental Cumulative',
            data: cloudData,
            borderColor: '#f59e0b',
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
            borderWidth: 2.5,
            pointRadius: 2,
            tension: 0.1
          },
          {
            label: 'Local Rig Cumulative Spend',
            data: localData,
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            borderWidth: 2.5,
            pointRadius: 2,
            tension: 0.1
          },
          {
            label: 'Net Outlay (After Hardware Equity)',
            data: equityData,
            borderColor: '#94a3b8', // neutral: the third series is context, not a verdict
            borderDash: [5, 5],
            borderWidth: 2,
            pointRadius: 0,
            tension: 0.1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#121824',
            titleColor: '#f1f5f9',
            bodyColor: '#94a3b8',
            borderColor: 'rgba(255, 255, 255, 0.1)',
            borderWidth: 1,
            padding: 10,
            callbacks: {
              label: (context) => ` ${context.dataset.label}: $${context.parsed.y.toLocaleString()}`
            }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { color: '#64748b', font: { family: 'JetBrains Mono', size: 10 } }
          },
          y: {
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: {
              color: '#64748b',
              font: { family: 'JetBrains Mono', size: 10 },
              callback: (val) => `$${val}`
            }
          }
        }
      }
    });
  }

  function attachEvents() {
    // Sliders
    const inputRigCost = container.querySelector('#input-rig-cost');
    if (inputRigCost) {
      inputRigCost.addEventListener('input', (e) => {
        rigUpfrontCost = parseInt(e.target.value, 10);
        update();
      });
    }

    const inputHours = container.querySelector('#input-daily-hours');
    if (inputHours) {
      inputHours.addEventListener('input', (e) => {
        dailyUsageHours = parseFloat(e.target.value);
        update();
      });
    }

    const selectProvider = container.querySelector('#select-provider');
    if (selectProvider) {
      selectProvider.addEventListener('change', (e) => {
        selectedProviderId = e.target.value;
        const prov = CLOUD_PROVIDERS.find(p => p.id === selectedProviderId);
        if (prov) {
          hourlyCloudRate = prov.hourlyRate;
          monthlyDiskFee = prov.storageCostPerMonth;
          container.querySelector('#input-hourly-rate').value = hourlyCloudRate.toFixed(2);
          container.querySelector('#input-disk-fee').value = monthlyDiskFee.toFixed(2);
        }
        update();
      });
    }

    const inputHourly = container.querySelector('#input-hourly-rate');
    if (inputHourly) {
      inputHourly.addEventListener('change', (e) => {
        hourlyCloudRate = parseFloat(e.target.value) || 0.88;
        selectedProviderId = 'custom';
        if (selectProvider) selectProvider.value = 'custom';
        update();
      });
    }

    const inputDisk = container.querySelector('#input-disk-fee');
    if (inputDisk) {
      inputDisk.addEventListener('change', (e) => {
        monthlyDiskFee = parseFloat(e.target.value) || 0;
        update();
      });
    }

    const inputWatts = container.querySelector('#input-system-watts');
    if (inputWatts) {
      inputWatts.addEventListener('input', (e) => {
        systemWatts = parseInt(e.target.value, 10);
        update();
      });
    }

    const inputKwh = container.querySelector('#input-kwh');
    if (inputKwh) {
      inputKwh.addEventListener('input', (e) => {
        kwhRate = parseFloat(e.target.value);
        update();
      });
    }

    const inputResale = container.querySelector('#input-resale');
    if (inputResale) {
      inputResale.addEventListener('input', (e) => {
        resaleRetentionPct = parseInt(e.target.value, 10);
        update();
      });
    }

    // Copy Reddit Summary
    const btnCopyReddit = container.querySelector('#btn-copy-calc-reddit');
    if (btnCopyReddit) {
      btnCopyReddit.addEventListener('click', () => {
        const stats = calculate();
        let md = `### [airigbuilder.com] Local AI vs Cloud GPU Break-Even Analysis\n\n`;
        md += `* **Local AI Rig Upfront Cost:** $${rigUpfrontCost.toLocaleString()}\n`;
        md += `* **Daily Usage:** ${dailyUsageHours} hrs/day\n`;
        md += `* **Cloud Provider Baseline:** $${hourlyCloudRate.toFixed(2)}/hr + $${monthlyDiskFee}/mo disk\n`;
        md += `* **Monthly Cloud Cost:** $${Math.round(stats.monthlyCloudTotal)}/mo\n`;
        md += `* **Monthly Local Electricity (${systemWatts}W @ $${kwhRate}/kWh):** $${Math.round(stats.monthlyLocalPower)}/mo\n`;
        md += Number.isFinite(stats.breakEvenMonths)
          ? `* **Break-Even Payoff Point:** **${stats.breakEvenMonths.toFixed(1)} Months** (~${stats.breakEvenDays} days)\n`
          : `* **Break-Even Payoff Point:** Never (electricity costs more than cloud rental)\n`;
        md += `* **2-Year Net Cash Savings:** **${signedMoney(stats.netCashSavings24Mo)}**\n\n`;
        md += `*Generated via airigbuilder.com — The used-hardware price layer for local AI.*`;

        navigator.clipboard.writeText(md).then(() => {
          showToast('Copied break-even analysis to clipboard!');
        });
      });
    }
  }

  function showToast(msg) {
    const existing = document.querySelector('.toast-container');
    if (existing) existing.remove();

    const toastBox = document.createElement('div');
    toastBox.className = 'toast-container';
    toastBox.setAttribute('role', 'status');
    toastBox.innerHTML = `
      <div class="toast">
        <span>✓</span>
        <span>${msg}</span>
      </div>
    `;
    document.body.appendChild(toastBox);
    setTimeout(() => {
      toastBox.remove();
    }, 3200);
  }

  render();

  return {
    preloadRig: (params) => {
      if (params.upfrontCost) rigUpfrontCost = params.upfrontCost;
      if (params.systemWatts) systemWatts = params.systemWatts;
      if (params.dailyHours) dailyUsageHours = params.dailyHours;
      if (params.kwhRate) kwhRate = params.kwhRate;
      render();
    }
  };
}
