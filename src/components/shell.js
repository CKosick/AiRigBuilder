// Page shell: ticker, header with section tabs, home hero, tab panels and footer.
// Pure HTML shared by the browser (src/main.js) and the build-time prerender (scripts/prerender.js).
import { GPUS_DATA } from '../data/gpus.js';
import { MODELS_DATA } from '../data/models.js';
import { siteFacts } from '../utils/siteFacts.js';
import { renderHomeFaqHtml } from './homeFaq.js';
import { renderHomeHeroHtml } from './homeHero.js';
import { SECTIONS, tabViewFor, buildPath, gpuPath } from '../routes.js';
import { icon } from './icons.js';

const TAB_LABELS = {
  builds: { icon: 'monitor', text: 'Build Sheets' },
  calculator: { icon: 'calculator', text: 'Break-Even ROI' },
  tracker: { icon: 'chart', text: 'GPU Price Tracker' },
  guide: { icon: 'book', text: 'Hardware Guide' }
};

// The 7d trend is null until the price log has a price from about a week earlier
function tickerTrendHtml(pct) {
  if (typeof pct !== 'number') return '<span class="ticker-note">7d trend n/a</span>';
  const up = pct >= 0;
  return `<span class="ticker-trend ${up ? 'is-up' : 'is-down'}">${up ? '▲' : '▼'} ${Math.abs(pct)}% (7d)</span>`;
}

/**
 * @param route  a route from parseRoute(); decides which tab and panel are active
 * @param panels optional pre-rendered panel HTML keyed by view ('buildsIndex', 'builds', 'calculator', 'tracker', 'guide', 'gpu')
 */
export function renderShell(route, panels = {}) {
  const { rtx3090, teslaP40, dual3090RigEst, runpodDual3090, payoffMonths4h: payoffMonths } = siteFacts();
  const activeTab = tabViewFor(route);
  const isGpu = route.view === 'gpu';
  const isBuildsIndex = Boolean(route.index);

  const tabs = SECTIONS.map(s => {
    const active = s.view === activeTab;
    return `
          <button class="nav-tab-btn${active ? ' active' : ''}" id="tab-${s.view}" role="tab" aria-selected="${active}" aria-controls="view-${s.view}"${active ? '' : ' tabindex="-1"'} data-view="view-${s.view}">
            <span>${icon(TAB_LABELS[s.view].icon)}${TAB_LABELS[s.view].text}</span>
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
          ${tickerTrendHtml(rtx3090.trend7d)}
        </div>
        <div class="ticker-item">
          <span>Dual-3090 70B Rig:</span>
          <span class="ticker-val">~$${dual3090RigEst.toLocaleString('en-US')}</span>
          <span class="ticker-note">[Q4_K_M @ ~20 tok/s]</span>
        </div>
        <div class="ticker-item">
          <span>Cloud 70B Break-Even:</span>
          <span class="ticker-val">~${payoffMonths} Months</span>
          <span class="ticker-note">(4 hrs/day vs RunPod $${runpodDual3090.hourlyRate.toFixed(2)}/hr)</span>
        </div>
        <div class="ticker-item">
          <span>Cheapest 24GB:</span>
          <span class="ticker-val ticker-good">Tesla P40 ($${teslaP40.usedStreetPrice})</span>
          <span class="ticker-note">[$${teslaP40.pricePerGb}/GB]</span>
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
            ${icon('bulb')}Why Used 3090?
          </button>
        </div>
      </nav>
    </header>

    <!-- Main Workspace Container -->
    <main class="main-wrapper" id="main-content" tabindex="-1">
      <div id="home-hero-root"${route.home ? '' : ' hidden'}>${route.home ? renderHomeHeroHtml() : ''}</div>
      ${panel('builds', `<div id="builds-index-root"${isBuildsIndex ? '' : ' hidden'}>${panels.buildsIndex || ''}</div><div id="model-picker-root"${isBuildsIndex ? ' hidden' : ''}>${panels.builds || ''}</div><div id="home-faq-root"${route.home ? '' : ' hidden'}>${route.home ? renderHomeFaqHtml() : ''}</div>`)}
      ${panel('calculator', panels.calculator || '')}
      ${panel('tracker', `<div id="tracker-root"${isGpu ? ' hidden' : ''}>${panels.tracker || ''}</div><div id="gpu-detail-root"${isGpu ? '' : ' hidden'}>${panels.gpu || ''}</div>`)}
      ${panel('guide', panels.guide || '')}
    </main>

    <!-- Footer -->
    <footer class="footer-container">
      <div class="footer-content">
        <div class="footer-disclaimer">
          <strong class="footer-title">
            airigbuilder.com — Independent Local AI Hardware Intelligence
          </strong>
          Used GPU prices are aggregated from real eBay sold listings. When you buy components through our merchant links (Amazon Associates, B&H Photo, eBay Partner Network), we may earn a small referral commission at no additional cost to you. True electricity costs assume continuous model evaluation cycles.
        </div>
        <nav aria-label="Footer" class="footer-nav">
          <a href="/builds" class="footer-link">Build Sheets</a>
          <a href="/calculator" class="footer-link">Break-Even Calc</a>
          <a href="/tracker" class="footer-link">GPU Tracker</a>
          <a href="/guide" class="footer-link">Hardware Gotchas</a>
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
