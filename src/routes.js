// URL structure shared by the browser router (src/main.js) and the build-time prerender
// (scripts/prerender.js): which paths exist, which view each shows, and each page's <head> text.
import { GPUS_DATA } from './data/gpus.js';
import { MODELS_DATA } from './data/models.js';
import { BUILDS_DATA } from './data/builds.js';

export const SITE_URL = 'https://airigbuilder.com';
export const SITE_NAME = 'AI Rig Builder';

// The model the home page shows. Its /builds page would duplicate the home page, so it points there.
export const DEFAULT_MODEL_ID = 'llama-3.3-70b';

// The four tabbed sections. GPU detail pages live under the tracker tab.
export const SECTIONS = [
  { view: 'builds', path: '/builds', label: 'Build Sheets' },
  { view: 'calculator', path: '/calculator', label: 'Break-Even Calculator' },
  { view: 'tracker', path: '/tracker', label: 'GPU Price Tracker' },
  { view: 'guide', path: '/guide', label: 'Hardware Guide' }
];

/** Canonical URL path of a model's build sheet (the default model's is the home page). */
export const buildPath = (modelId) => (modelId === DEFAULT_MODEL_ID ? '/' : `/builds/${modelId}`);
export const gpuPath = (gpuId) => `/gpu/${gpuId}`;

/** The tab a route belongs to ('gpu' pages sit under the tracker tab). */
export const tabViewFor = (route) => (route.view === 'gpu' ? 'tracker' : route.view);

/**
 * Maps a pathname to a route, or null when no page exists at that path.
 * Tolerates a trailing slash and a .html suffix so /tracker/ and /tracker.html resolve too.
 */
export function parseRoute(pathname) {
  let p;
  try {
    p = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  p = p.replace(/\.html$/, '').replace(/\/index$/, '/').replace(/\/+$/, '') || '/';

  if (p === '/') return { view: 'builds', path: '/', home: true };

  if (p === '/builds') return { view: 'builds', path: p, index: true };

  const section = SECTIONS.find(s => s.path === p);
  if (section) return { view: section.view, path: p };

  let m = p.match(/^\/builds\/([^/]+)$/);
  if (m && BUILDS_DATA[m[1]]) return { view: 'builds', path: p, modelId: m[1] };

  m = p.match(/^\/gpu\/([^/]+)$/);
  if (m && GPUS_DATA.some(g => g.id === m[1])) return { view: 'gpu', path: p, gpuId: m[1] };

  return null;
}

/** Old single-page links (/#tracker etc.) map to their new paths. */
export function legacyHashRoute(hash) {
  const section = SECTIONS.find(s => `#${s.view}` === hash);
  return section ? parseRoute(section.path) : null;
}

/** Every page the site serves (including /builds/llama-3.3-70b, which exists for old links but is not canonical). */
export function allRoutes() {
  return [
    parseRoute('/'),
    ...SECTIONS.map(s => parseRoute(s.path)),
    ...GPUS_DATA.map(g => parseRoute(gpuPath(g.id))),
    ...MODELS_DATA.filter(m => BUILDS_DATA[m.id]).map(m => parseRoute(`/builds/${m.id}`))
  ];
}

export const shortGpuName = (gpu) => gpu.name.replace(/^(NVIDIA (GeForce )?|AMD |Apple )/, '');

// Keeps meta descriptions inside the ~160 characters search results show
function clampDescription(text, max = 160) {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  return `${cut.slice(0, cut.lastIndexOf(' '))}…`;
}

const HOME_META = {
  title: 'AI Rig Builder — The Used-Hardware Price Layer for Local AI | airigbuilder.com',
  description: 'Calculate the cheapest way to run 70B local AI models with real used GPU prices, true total build costs (parts + tax + power), and cloud break-even ROI.'
};

/**
 * Title, description, canonical URL and breadcrumb trail for a route.
 * The prerender writes these into each page's <head>; the router updates them on navigation.
 */
export function pageMeta(route) {
  const crumbs = [{ name: 'Home', path: '/' }];
  let meta;

  if (route.home) {
    meta = { ...HOME_META };
  } else if (route.view === 'builds' && route.modelId) {
    const model = MODELS_DATA.find(m => m.id === route.modelId);
    const sheet = BUILDS_DATA[route.modelId];
    const tierPrices = sheet.tiers.map(t => t.parts.reduce((s, p) => s + (p.price || 0), 0));
    meta = {
      title: `${model.name} Local Build: Parts & Cost | ${SITE_NAME}`,
      description: `What hardware runs ${model.name} locally? ${sheet.vramTarget}, ${sheet.tiers.length} build tiers from $${Math.min(...tierPrices).toLocaleString('en-US')} with full parts lists, power draw and first-year cost.`
    };
    crumbs.push({ name: 'Build Sheets', path: '/builds' }, { name: model.name, path: route.path });
  } else if (route.view === 'builds') {
    meta = {
      title: `Local AI Build Sheets: Hardware for ${MODELS_DATA.length} LLMs Compared | ${SITE_NAME}`,
      description: `Every local LLM build sheet in one table: VRAM needed, best quant, speed and the cheapest rig for ${MODELS_DATA.length} models from Llama 3.3 70B to Phi-4 Mini.`
    };
    crumbs.push({ name: 'Build Sheets', path: '/builds' });
  } else if (route.view === 'calculator') {
    meta = {
      title: `Local AI vs Cloud GPU Break-Even Calculator | ${SITE_NAME}`,
      description: 'When does a home AI rig pay for itself? Compare a used dual RTX 3090 build with RunPod and Vast.ai rental, including power costs and resale value.'
    };
    crumbs.push({ name: 'Break-Even Calculator', path: '/calculator' });
  } else if (route.view === 'tracker') {
    const rtx3090 = GPUS_DATA.find(g => g.id === 'rtx-3090');
    meta = {
      title: `Used GPU Prices for Local AI: RTX 3090, P40 & More | ${SITE_NAME}`,
      description: `Used prices estimated from current eBay listings for the ${GPUS_DATA.length} GPUs that matter for local LLMs, ranked by price per GB of VRAM. RTX 3090 now $${rtx3090.usedStreetPrice} ($${rtx3090.pricePerGb.toFixed(2)}/GB).`
    };
    crumbs.push({ name: 'GPU Price Tracker', path: '/tracker' });
  } else if (route.view === 'guide') {
    meta = {
      title: `Local AI Hardware Guide: Multi-GPU Gotchas | ${SITE_NAME}`,
      description: 'Avoid costly multi-GPU mistakes: RTX 3090 transient power spikes, PCIe slot spacing, x8 vs x4 bandwidth, the VRAM math formula and memory thermals.'
    };
    crumbs.push({ name: 'Hardware Guide', path: '/guide' });
  } else if (route.view === 'gpu') {
    const gpu = GPUS_DATA.find(g => g.id === route.gpuId);
    meta = {
      title: `${shortGpuName(gpu)} Used Price & History ($${gpu.usedStreetPrice}) | ${SITE_NAME}`,
      description: `${gpu.name} used price: about $${gpu.usedStreetPrice} on eBay (range $${gpu.usedPriceLow}–$${gpu.usedPriceHigh}, $${gpu.pricePerGb.toFixed(2)}/GB VRAM). Price history, pros and cons for local AI.`
    };
    crumbs.push({ name: 'GPU Price Tracker', path: '/tracker' }, { name: gpu.name, path: route.path });
  }

  return {
    ...meta,
    description: clampDescription(meta.description),
    canonical: `${SITE_URL}${route.modelId ? buildPath(route.modelId) : route.path}`,
    breadcrumbs: crumbs
  };
}

/** False for pages that point their canonical elsewhere (kept out of the sitemap). */
export const isCanonical = (route) => pageMeta(route).canonical === `${SITE_URL}${route.path}`;
