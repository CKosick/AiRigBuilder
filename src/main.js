import './style.css';
import { renderShell } from './components/shell.js';
import { createModelPicker } from './components/modelPicker.js';
import { createBreakEvenCalc } from './components/breakEvenCalc.js';
import { createPriceTracker } from './components/priceTracker.js';
import { createHardwareGuide } from './components/hardwareGuide.js';
import { createGpuDetail } from './components/gpuDetail.js';
import { createBuildsIndex } from './components/buildsIndex.js';
import { renderHomeFaqHtml } from './components/homeFaq.js';
import { parseRoute, legacyHashRoute, pageMeta, tabViewFor, buildPath, SECTIONS, DEFAULT_MODEL_ID } from './routes.js';

document.addEventListener('DOMContentLoaded', () => {
  const app = document.getElementById('app');

  // Old single-page links (/#tracker) move to their real path; unknown paths show the home view
  const legacy = legacyHashRoute(window.location.hash);
  let route = legacy || parseRoute(window.location.pathname) || parseRoute('/');
  if (legacy) history.replaceState(null, '', legacy.path);

  // Production pages arrive pre-rendered (scripts/prerender.js); the dev server serves an empty #app
  if (!app.querySelector('.header-container')) {
    app.innerHTML = renderShell(route);
  }

  // Views & Navigation Controller
  const viewBuilds = document.getElementById('view-builds');
  const viewCalculator = document.getElementById('view-calculator');
  const viewTracker = document.getElementById('view-tracker');
  const viewGuide = document.getElementById('view-guide');
  const trackerRoot = document.getElementById('tracker-root');
  const gpuDetailRoot = document.getElementById('gpu-detail-root');
  const buildsIndexRoot = document.getElementById('builds-index-root');
  const modelPickerRoot = document.getElementById('model-picker-root');
  const homeFaqRoot = document.getElementById('home-faq-root');

  // Initialize Subcomponents
  let breakEvenController = null;

  const modelPickerController = createModelPicker(modelPickerRoot, (rigData) => {
    navigate(parseRoute('/calculator'));
    if (breakEvenController) {
      breakEvenController.preloadRig(rigData);
    }
  }, {
    initialModelId: route.modelId,
    // Picking a model gives the page its shareable /builds/:model URL (the home page for the default
    // model) without adding history entries
    onModelChange: (modelId) => {
      if (route.view === 'builds') navigate(parseRoute(buildPath(modelId)), { replace: true, scroll: false });
    }
  });

  breakEvenController = createBreakEvenCalc(viewCalculator);
  createPriceTracker(trackerRoot);
  createHardwareGuide(viewGuide);
  createBuildsIndex(buildsIndexRoot);
  const gpuDetailController = createGpuDetail(gpuDetailRoot);

  // Tab switching logic
  const tabButtons = document.querySelectorAll('.nav-tab-btn');
  const views = [
    { id: 'view-builds', view: 'builds', el: viewBuilds },
    { id: 'view-calculator', view: 'calculator', el: viewCalculator },
    { id: 'view-tracker', view: 'tracker', el: viewTracker },
    { id: 'view-guide', view: 'guide', el: viewGuide }
  ];

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function setMeta(selector, attr, value) {
    const el = document.head.querySelector(selector);
    if (el) el.setAttribute(attr, value);
  }

  // Shows the view for a route; does not touch the URL
  function showRoute(next) {
    route = next;
    const targetViewId = `view-${tabViewFor(next)}`;

    tabButtons.forEach(btn => {
      const isActive = btn.getAttribute('data-view') === targetViewId;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-selected', String(isActive));
      btn.tabIndex = isActive ? 0 : -1;
    });

    views.forEach(v => {
      const isActive = v.id === targetViewId;
      v.el.classList.toggle('active', isActive);
      v.el.hidden = !isActive;
    });

    const isGpu = next.view === 'gpu';
    trackerRoot.hidden = isGpu;
    gpuDetailRoot.hidden = !isGpu;
    if (isGpu) gpuDetailController.show(next.gpuId);
    buildsIndexRoot.hidden = !next.index;
    // The FAQ belongs to the home page only; pages entered elsewhere fill it on first visit home
    if (next.home && !homeFaqRoot.firstElementChild) homeFaqRoot.innerHTML = renderHomeFaqHtml();
    homeFaqRoot.hidden = !next.home;
    modelPickerRoot.hidden = Boolean(next.index);
    // The home page always shows the default model's build sheet
    if (next.view === 'builds' && !next.index) modelPickerController.selectModel(next.modelId || DEFAULT_MODEL_ID);

    const meta = pageMeta(next);
    document.title = meta.title;
    setMeta('meta[name="description"]', 'content', meta.description);
    setMeta('link[rel="canonical"]', 'href', meta.canonical);
  }

  /**
   * Moves to a route with the History API.
   * replace: rewrite the current entry instead of adding one; scroll: jump back to the top.
   */
  function navigate(next, { replace = false, scroll = true } = {}) {
    if (!next) return;
    if (next.path !== window.location.pathname) {
      history[replace ? 'replaceState' : 'pushState'](null, '', next.path);
    }
    showRoute(next);
    if (scroll) window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
  }

  // The Build Sheets tab opens the build sheet for the model you were looking at
  // (the /builds index is reached through its links: footer, breadcrumbs, the picker)
  function routeForTab(viewId) {
    const section = SECTIONS.find(s => `view-${s.view}` === viewId);
    if (section.view === 'builds') return parseRoute(buildPath(modelPickerController.getModelId()));
    return parseRoute(section.path);
  }

  tabButtons.forEach((btn, idx) => {
    btn.addEventListener('click', () => {
      navigate(routeForTab(btn.getAttribute('data-view')));
    });

    // Arrow keys / Home / End move between tabs (WAI-ARIA tabs pattern).
    // They replace the history entry so arrowing across tabs doesn't fill the back button.
    btn.addEventListener('keydown', (e) => {
      const last = tabButtons.length - 1;
      const next = { ArrowRight: idx === last ? 0 : idx + 1, ArrowLeft: idx === 0 ? last : idx - 1, Home: 0, End: last }[e.key];
      if (next === undefined) return;
      e.preventDefault();
      tabButtons[next].focus();
      navigate(routeForTab(tabButtons[next].getAttribute('data-view')), { replace: true });
    });
  });

  document.getElementById('skip-link').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('main-content').focus();
  });

  document.getElementById('btn-why-used').addEventListener('click', () => {
    navigate(parseRoute('/guide'));
  });

  // Same-site links (logo, footer, breadcrumbs, GPU names) navigate without a page load.
  // Focus moves to the main content so screen readers start at the new page.
  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const link = e.target.closest('a[href]');
    if (!link || link.target || link.hasAttribute('download') || link.getAttribute('href').startsWith('#')) return;
    const url = new URL(link.href);
    if (url.origin !== window.location.origin) return;
    const next = parseRoute(url.pathname);
    if (!next) return;
    e.preventDefault();
    navigate(next);
    document.getElementById('main-content').focus({ preventScroll: true });
  });

  // Back / forward between pages
  window.addEventListener('popstate', () => {
    showRoute(parseRoute(window.location.pathname) || parseRoute('/'));
  });

  // In-page links to the old #section anchors still work
  window.addEventListener('hashchange', () => {
    const next = legacyHashRoute(window.location.hash);
    if (next) navigate(next, { replace: true });
  });

  showRoute(route);
});
