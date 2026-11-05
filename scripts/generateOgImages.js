import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Resvg } from '@resvg/resvg-js';
import { MODELS_DATA } from '../src/data/models.js';
import { BUILDS_DATA } from '../src/data/builds.js';
import { GPUS_DATA } from '../src/data/gpus.js';
import { COMPARISON_PAIRS, BEST_GPU_MODELS } from '../src/data/comparisons.js';
import { evaluateBestGpu } from '../src/components/bestGpu.js';
import { shortGpuName } from '../src/routes.js';
import {
  renderBuildSheetSvg,
  renderGpuPageSvg,
  renderComparisonSvg,
  renderBestGpuSvg
} from './ogImageTemplates.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FONT_PATH = path.resolve(__dirname, 'assets/Inter.ttf');

let cachedFontBuffer = null;

function getFontBuffer() {
  if (!cachedFontBuffer) {
    if (!fs.existsSync(FONT_PATH)) {
      throw new Error(`OG image font not found at ${FONT_PATH}`);
    }
    cachedFontBuffer = fs.readFileSync(FONT_PATH);
  }
  return cachedFontBuffer;
}

/**
 * Checks if a route represents one of the 93 entity pages.
 */
export function isEntityRoute(route) {
  if (!route) return false;
  if (route.view === 'builds' && route.modelId) return true;
  if (route.view === 'gpu' && route.gpuId) return true;
  if (route.view === 'compare' && route.gpuIdA && route.gpuIdB) return true;
  if (route.view === 'best-gpu' && route.modelId) return true;
  return false;
}

/**
 * Determines the OG image slug for an entity route.
 */
export function ogSlugForRoute(route) {
  if (!isEntityRoute(route)) return null;
  if (route.view === 'builds' && route.modelId) return `build-${route.modelId}`;
  if (route.view === 'gpu' && route.gpuId) return `gpu-${route.gpuId}`;
  if (route.view === 'compare') return `compare-${route.gpuIdA}-vs-${route.gpuIdB}`;
  if (route.view === 'best-gpu') return `best-gpu-${route.modelId}`;
  return null;
}

/**
 * Generates the alt text for an entity route's OG card.
 */
export function ogAltForRoute(route) {
  if (!isEntityRoute(route)) return null;
  if (route.view === 'builds' && route.modelId) {
    const model = MODELS_DATA.find(m => m.id === route.modelId);
    return `${model?.name || route.modelId} local AI hardware build sheet and requirements`;
  }
  if (route.view === 'gpu' && route.gpuId) {
    const gpu = GPUS_DATA.find(g => g.id === route.gpuId);
    return `${gpu?.name || route.gpuId} used price tracking and local AI specifications`;
  }
  if (route.view === 'compare') {
    const gpuA = GPUS_DATA.find(g => g.id === route.gpuIdA);
    const gpuB = GPUS_DATA.find(g => g.id === route.gpuIdB);
    const nameA = gpuA ? shortGpuName(gpuA) : route.gpuIdA;
    const nameB = gpuB ? shortGpuName(gpuB) : route.gpuIdB;
    return `${nameA} vs ${nameB} local AI performance, specs, and price comparison`;
  }
  if (route.view === 'best-gpu') {
    const model = MODELS_DATA.find(m => m.id === route.modelId);
    return `Best GPU configurations and price rankings for ${model?.name || route.modelId}`;
  }
  return null;
}

/**
 * Generates the pure SVG string for an entity route.
 */
export function generateOgSvg(route) {
  if (!isEntityRoute(route)) return null;

  if (route.view === 'builds' && route.modelId) {
    const model = MODELS_DATA.find(m => m.id === route.modelId);
    const sheet = BUILDS_DATA[route.modelId];
    if (!model || !sheet) return null;
    return renderBuildSheetSvg(model, sheet);
  }

  if (route.view === 'gpu' && route.gpuId) {
    const gpu = GPUS_DATA.find(g => g.id === route.gpuId);
    if (!gpu) return null;
    return renderGpuPageSvg(gpu);
  }

  if (route.view === 'compare') {
    const gpuA = GPUS_DATA.find(g => g.id === route.gpuIdA);
    const gpuB = GPUS_DATA.find(g => g.id === route.gpuIdB);
    if (!gpuA || !gpuB) return null;
    return renderComparisonSvg(gpuA, gpuB);
  }

  if (route.view === 'best-gpu') {
    const model = MODELS_DATA.find(m => m.id === route.modelId);
    if (!model) return null;
    const bestGpuPick = evaluateBestGpu(route.modelId);
    return renderBestGpuSvg(model, bestGpuPick);
  }

  return null;
}

/**
 * Rasterizes an SVG string into a 1200x630 PNG buffer using bundled Inter font.
 */
export function renderSvgToPng(svg) {
  const fontBuffer = getFontBuffer();
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: 1200 },
    font: {
      loadSystemFonts: false,
      fontBuffers: [fontBuffer],
      defaultFontFamily: 'Inter'
    }
  });

  return resvg.render().asPng();
}

/**
 * Builds all 93 entity OG images.
 * Returns an array of objects: { slug, fileName, svg, buffer, route, alt }
 */
export function generateAllOgImages() {
  const list = [];

  // 1. 56 build sheets
  for (const model of MODELS_DATA) {
    if (!BUILDS_DATA[model.id]) continue;
    const route = { view: 'builds', path: `/builds/${model.id}`, modelId: model.id };
    const slug = ogSlugForRoute(route);
    const svg = generateOgSvg(route);
    const buffer = renderSvgToPng(svg);
    const alt = ogAltForRoute(route);
    list.push({ slug, fileName: `og/${slug}.png`, svg, buffer, route, alt });
  }

  // 2. 19 GPU pages
  for (const gpu of GPUS_DATA) {
    const route = { view: 'gpu', path: `/gpu/${gpu.id}`, gpuId: gpu.id };
    const slug = ogSlugForRoute(route);
    const svg = generateOgSvg(route);
    const buffer = renderSvgToPng(svg);
    const alt = ogAltForRoute(route);
    list.push({ slug, fileName: `og/${slug}.png`, svg, buffer, route, alt });
  }

  // 3. 10 comparison pages
  for (const [a, b] of COMPARISON_PAIRS) {
    const route = { view: 'compare', path: `/compare/${a}-vs-${b}`, gpuIdA: a, gpuIdB: b };
    const slug = ogSlugForRoute(route);
    const svg = generateOgSvg(route);
    const buffer = renderSvgToPng(svg);
    const alt = ogAltForRoute(route);
    list.push({ slug, fileName: `og/${slug}.png`, svg, buffer, route, alt });
  }

  // 4. 8 best-GPU pages
  for (const modelId of BEST_GPU_MODELS) {
    const route = { view: 'best-gpu', path: `/best-gpu/${modelId}`, modelId };
    const slug = ogSlugForRoute(route);
    const svg = generateOgSvg(route);
    const buffer = renderSvgToPng(svg);
    const alt = ogAltForRoute(route);
    list.push({ slug, fileName: `og/${slug}.png`, svg, buffer, route, alt });
  }

  return list;
}

