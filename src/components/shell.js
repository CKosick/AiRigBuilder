// Page shell: ticker, header with section tabs, hero, tab panels and footer.
// Pure HTML shared by the browser (src/main.js) and the build-time prerender (scripts/prerender.js).
import { GPUS_DATA } from '../data/gpus.js';
import { MODELS_DATA } from '../data/models.js';
import { CLOUD_PROVIDERS } from '../data/providers.js';
import { computeBreakEven, BASELINE_RIG } from '../utils/breakEven.js';
import { SECTIONS, tabViewFor, buildPath, gpuPath } from '../routes.js';

const TAB_LABELS = {
  builds: { icon: '🖥️', text: 'Build Sheets' },
  calculator: { icon: '⚡', text: 'Break-Even ROI' },
  tracker: { icon: '📊', text: 'GPU Price Tracker' },
  guide: { icon: '🛠️', text: 'Hardware Guide' }
};

function headlineStats() {
  const rtx3090 = GPUS_DATA.find(g => g.id === 'rtx-3090') || { usedStreetPrice: 718, trend7d: 3.3 };
  const teslaP40 = GPUS_DATA.find(g => g.id === 'tesla-p40') || { usedStreetPrice: 273, pricePerGb: 11.38 };
  const dual3090RigEst = BASELINE_RIG.cost;
  // Headline payoff uses the same defaults as the Break-Even calculator (4 hrs/day, $0.14/kWh)
  const runpodDual3090 = CLOUD_PROVIDERS.find(p => p.id === 'runpod-dual-3090');
  const headlinePayoff = computeBreakEven({
    rigUpfrontCost: dual3090RigEst,
    dailyUsageHours: 4,
    hourlyCloudRate: runpodDual3090.hourlyRate,
    monthlyDiskFee: runpodDual3090.storageCostPerMonth,
    systemWatts: BASELINE_RIG.watts,
    kwhRate: 0.14
  });
  return { rtx3090, teslaP40, dual3090RigEst, runpodDual3090, payoffMonths: Math.round(headlinePayoff.breakEvenMonths) };
}

/**
 * @param route  a route from parseRoute(); decides which tab and panel are active
 * @param panels optional pre-rendered panel HTML keyed by view ('builds', 'calculator', 'tracker', 'guide', 'gpu')
 */
export function renderShell(route, panels = {}) {
  const { rtx3090, teslaP40, dual3090RigEst, runpodDual3090, payoffMonths } = headlineStats();
  const trendArrow = rtx3090.trend7d >= 0 ? `▲ ${rtx3090.trend7d}%` : `▼ ${Math.abs(rtx3090.trend7d)}%`;
  const trendClass = rtx3090.trend7d >= 0 ? 'ticker-val' : 'ticker-drop';
  const activeTab = tabViewFor(route);
  const isGpu = route.view === 'gpu';

  const tabs = SECTIONS.map(s => {
    const active = s.view === activeTab;
    return `
          <button class="nav-tab-btn${active ? ' active' : ''}" id="tab-${s.view}" role="tab" aria-selected="${active}" aria-controls="view-${s.view}"${active ? '' : ' tabindex="-1"'} data-view="view-${s.view}">
            <span><span aria-hidden="true">${TAB_LABELS[s.view].icon} </span>${TAB_LABELS[s.view].text}</span>
          </button>`;
  }).join('');

  const panel = (view, inner) => {
    const active = view === activeTab;
    return `<div id="view-${view}" class="view-section${active ? ' active' : ''}" role="tabpanel" aria-labelledby="tab-${view}"${active ? '' : ' hidden'}>${inner}</div>`;
  };

  return `
    <a href="#main-content" class="skip-link" id="skip-link">Skip to main content</a>

    <!-- Top Market Ticker -->
    <header class="header-container">
      <div class="market-ticker">
        <div class="ticker-item">
          <span class="ticker-tag">Live Market</span>
          <span>RTX 3090 24GB Avg:</span>
          <span class="ticker-val">$${rtx3090.usedStreetPrice}</span>
          <span class="${trendClass}" style="color: ${rtx3090.trend7d >= 0 ? '#34d399' : '#f87171'}">${trendArrow} (7d)</span>
        </div>
        <div class="ticker-item">
          <span>Dual-3090 70B Rig:</span>
          <span class="ticker-val">~$${dual3090RigEst.toLocaleString('en-US')}</span>
          <span style="color: var(--text-dim);">[Q4_K_M @ ~20 tok/s]</span>
        </div>
        <div class="ticker-item">
          <span>Cloud 70B Break-Even:</span>
          <span class="ticker-val" style="color: var(--cyan);">~${payoffMonths} Months</span>
          <span style="color: var(--text-dim);">(4 hrs/day vs RunPod $${runpodDual3090.hourlyRate.toFixed(2)}/hr)</span>
        </div>
        <div class="ticker-item">
          <span>Cheapest 24GB:</span>
          <span class="ticker-val" style="color: #34d399;">Tesla P40 ($${teslaP40.usedStreetPrice})</span>
          <span style="color: var(--text-dim);">[$${teslaP40.pricePerGb}/GB]</span>
        </div>
      </div>

      <!-- Main Navigation Bar -->
      <nav class="nav-bar">
        <a href="/" class="brand-wrapper" id="brand-logo-btn" aria-label="AIRigBuilder.com home: Build Sheets">
          <div class="brand-icon-box">
            <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="4" y="4" width="16" height="16" rx="2"/>
              <rect x="9" y="9" width="6" height="6"/>
              <line x1="9" y1="1" x2="9" y2="4"/>
              <line x1="15" y1="1" x2="15" y2="4"/>
              <line x1="9" y1="20" x2="9" y2="23"/>
              <line x1="15" y1="20" x2="15" y2="23"/>
              <line x1="20" y1="9" x2="23" y2="9"/>
              <line x1="20" y1="14" x2="23" y2="14"/>
              <line x1="1" y1="9" x2="4" y2="9"/>
              <line x1="1" y1="14" x2="4" y2="14"/>
            </svg>
          </div>
          <div class="brand-title-group">
            <h1>AIRigBuilder<span class="domain-suffix">.com</span></h1>
            <div class="brand-tagline">The Used-Hardware Price Layer for Local AI</div>
          </div>
        </a>

        <!-- Navigation Tabs -->
        <div class="nav-tabs" role="tablist" aria-label="Site sections">${tabs}
        </div>

        <div class="header-actions">
          <button class="btn-secondary" id="btn-why-used">
            <span aria-hidden="true">💡 </span>Why Used 3090?
          </button>
        </div>
      </nav>
    </header>

    <!-- Hero Banner -->
    <section class="hero-banner">
      <div class="hero-card">
        <div class="hero-text">
          <h2>The Smartest Way to Run <span class="hero-highlight">70B Local AI Models</span></h2>
          <p>
            Nobody answers <em>"what is the cheapest way to run 70B models at home"</em> with real used-market street prices, true total-build electricity costs, and the exact cloud break-even point. We track verified eBay sold prices so you never overpay.
          </p>
        </div>
        <div class="hero-stats">
          <div class="hero-stat-pill">
            <div class="hero-stat-val">48 GB</div>
            <div class="hero-stat-lbl">Dual 3090 VRAM</div>
          </div>
          <div class="hero-stat-pill">
            <div class="hero-stat-val">~$${dual3090RigEst.toLocaleString('en-US')}</div>
            <div class="hero-stat-lbl">Full 70B Rig Cost</div>
          </div>
          <div class="hero-stat-pill">
            <div class="hero-stat-val">~${payoffMonths} Mo</div>
            <div class="hero-stat-lbl">Cloud Payoff @ 4 hrs/day</div>
          </div>
        </div>
      </div>
    </section>

    <!-- Main Workspace Container -->
    <main class="main-wrapper" id="main-content" tabindex="-1">
      ${panel('builds', panels.builds || '')}
      ${panel('calculator', panels.calculator || '')}
      ${panel('tracker', `<div id="tracker-root"${isGpu ? ' hidden' : ''}>${panels.tracker || ''}</div><div id="gpu-detail-root"${isGpu ? '' : ' hidden'}>${panels.gpu || ''}</div>`)}
      ${panel('guide', panels.guide || '')}
    </main>

    <!-- Footer -->
    <footer class="footer-container">
      <div class="footer-content">
        <div class="footer-disclaimer">
          <strong style="color: var(--text-main); display: block; margin-bottom: 4px;">
            airigbuilder.com — Independent Local AI Hardware Intelligence
          </strong>
          Used GPU prices are aggregated from real eBay sold listings. When you buy components through our merchant links (Amazon Associates, B&H Photo, eBay Partner Network), we may earn a small referral commission at no additional cost to you. True electricity costs assume continuous model evaluation cycles.
        </div>
        <nav aria-label="Footer" style="display: flex; gap: 1.5rem; font-family: var(--font-mono); font-size: 0.78rem;">
          <a href="/builds" class="footer-link" style="color: var(--text-muted); text-decoration: none;">Build Sheets</a>
          <a href="/calculator" class="footer-link" style="color: var(--text-muted); text-decoration: none;">Break-Even Calc</a>
          <a href="/tracker" class="footer-link" style="color: var(--text-muted); text-decoration: none;">GPU Tracker</a>
          <a href="/guide" class="footer-link" style="color: var(--text-muted); text-decoration: none;">Hardware Gotchas</a>
        </nav>
      </div>
      <details class="footer-directory">
        <summary>All build sheets and tracked GPUs</summary>
        <div class="footer-directory-cols">
          <nav aria-label="Build sheets by model">
            <h2>Build Sheets</h2>
            <ul>${MODELS_DATA.map(m => `<li><a href="${buildPath(m.id)}">${m.name}</a></li>`).join('')}</ul>
          </nav>
          <nav aria-label="Tracked GPUs">
            <h2>Used GPU Prices</h2>
            <ul>${GPUS_DATA.map(g => `<li><a href="${gpuPath(g.id)}">${g.name}</a></li>`).join('')}</ul>
          </nav>
        </div>
      </details>
    </footer>
  `;
}
