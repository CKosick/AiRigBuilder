// Pure SVG card templates for Open Graph 1200x630 social sharing images.
// Styled according to the site's dark palette (slate/emerald/neutral).
import { shortGpuName } from '../src/routes.js';
import { cheapestFittingTotal } from '../src/utils/tierFit.js';

// Measured per-character advance widths (in em units) for bundled Inter.ttf at weight 700.
const INTER_CHAR_WIDTHS = {
  '0': 0.667, '1': 0.481, '2': 0.621, '3': 0.652, '4': 0.666,
  '5': 0.632, '6': 0.648, '7': 0.587, '8': 0.646, '9': 0.648,
  A: 0.724, B: 0.657, C: 0.744, D: 0.724, E: 0.608, F: 0.586,
  G: 0.755, H: 0.744, I: 0.275, J: 0.561, K: 0.677, L: 0.566,
  M: 0.906, N: 0.741, O: 0.775, P: 0.643, Q: 0.776, R: 0.651,
  S: 0.649, T: 0.660, U: 0.734, V: 0.724, W: 1.007, X: 0.690,
  Y: 0.705, Z: 0.653,
  a: 0.575, b: 0.630, c: 0.577, d: 0.630, e: 0.593, f: 0.377,
  g: 0.625, h: 0.613, i: 0.261, j: 0.261, k: 0.569, l: 0.261,
  m: 0.898, n: 0.610, o: 0.608, p: 0.625, q: 0.625, r: 0.397,
  s: 0.549, t: 0.391, u: 0.608, v: 0.576, w: 0.837, x: 0.562,
  y: 0.576, z: 0.562,
  ' ': 0.248, $: 0.649, '.': 0.290, ',': 0.295, '-': 0.466,
  '+': 0.673, '/': 0.379, ':': 0.290, '(': 0.393, ')': 0.393,
  '~': 0.673, '·': 0.290, '–': 0.580
};

export const SHELL_INNER_WIDTH = 1040;
export const BUILD_CARD_INNER_WIDTH = 272; // 320 - 24*2
export const GPU_PRICE_CARD_INNER_WIDTH = 372; // 420 - 24*2
export const GPU_EFFICIENCY_CARD_INNER_WIDTH = 232; // 280 - 24*2
export const GPU_VERDICT_CARD_INNER_WIDTH = 212; // 260 - 24*2
export const COMPARE_CARD_INNER_WIDTH = 426; // 490 - 32*2
export const COMPARE_SPEC_VALUE_WIDTH = 286; // 426 - 140
export const BEST_GPU_PRIMARY_INNER_WIDTH = 464; // 520 - 28*2
export const BEST_GPU_SECONDARY_INNER_WIDTH = 424; // 480 - 28*2

function escapeXml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Estimates the rendered pixel width of a string in Inter font,
 * including a 3% safety margin so estimated width never under-predicts raster output.
 */
export function estimateTextWidth(text, fontSize, letterSpacing = 0) {
  const str = String(text ?? '');
  if (!str.length) return 0;
  let units = 0;
  for (const ch of str) {
    units += INTER_CHAR_WIDTHS[ch] ?? 0.65;
  }
  return units * fontSize * 1.03 + Math.max(0, str.length - 1) * letterSpacing;
}

/**
 * Steps font size down from maxFontSize to minFontSize (by 1px) until text fits maxWidth.
 */
export function fitSingleLineText(text, maxWidth, maxFontSize, minFontSize = 12, letterSpacing = 0) {
  const str = String(text ?? '');
  for (let fs = maxFontSize; fs >= minFontSize; fs--) {
    const width = estimateTextWidth(str, fs, letterSpacing);
    if (width <= maxWidth) {
      return { text: str, fontSize: fs, width, maxWidth };
    }
  }
  const width = estimateTextWidth(str, minFontSize, letterSpacing);
  return { text: str, fontSize: minFontSize, width, maxWidth };
}

/**
 * Splits a multi-word string into two balanced lines minimizing the wider line's width.
 */
export function splitBalancedTwoLines(text) {
  const str = String(text ?? '').trim();
  const words = str.split(/\s+/);
  if (words.length <= 1) return [str];
  let bestPair = [str];
  let bestMaxWidth = Infinity;
  for (let i = 1; i < words.length; i++) {
    const line1 = words.slice(0, i).join(' ');
    const line2 = words.slice(i).join(' ');
    const maxLineW = Math.max(estimateTextWidth(line1, 1), estimateTextWidth(line2, 1));
    if (maxLineW < bestMaxWidth) {
      bestMaxWidth = maxLineW;
      bestPair = [line1, line2];
    }
  }
  return bestPair;
}

/**
 * Fits a stat value into a box of maxWidth:
 * 1. Steps single-line fontSize from maxFontSize down to minSingleLineSize.
 * 2. If still wider than maxWidth and multi-word, wraps to two balanced lines and steps
 *    fontSize from maxTwoLineSize down to minFontSize until both lines fit maxWidth.
 */
export function fitBoxText(
  text,
  maxWidth,
  { maxFontSize = 28, minSingleLineSize = 22, maxTwoLineSize = 24, minFontSize = 14 } = {}
) {
  const str = String(text ?? '').trim();
  for (let fs = maxFontSize; fs >= minSingleLineSize; fs--) {
    const width = estimateTextWidth(str, fs);
    if (width <= maxWidth) {
      return { lines: [str], fontSize: fs, width, maxWidth };
    }
  }

  const lines = splitBalancedTwoLines(str);
  for (let fs = maxTwoLineSize; fs >= minFontSize; fs--) {
    const width = Math.max(...lines.map(l => estimateTextWidth(l, fs)));
    if (width <= maxWidth) {
      return { lines, fontSize: fs, width, maxWidth };
    }
  }

  const width = Math.max(...lines.map(l => estimateTextWidth(l, minFontSize)));
  return { lines, fontSize: minFontSize, width, maxWidth };
}

/**
 * Computes pill dimensions and fitted label font size so the label always has
 * padX horizontal breathing room on both sides and the pill fits within maxWidth.
 */
export function fitPillLabel(label, { maxWidth = 272, maxFontSize = 13, minFontSize = 10, letterSpacing = 1, padX = 12 } = {}) {
  const fit = fitSingleLineText(label, maxWidth - padX * 2, maxFontSize, minFontSize, letterSpacing);
  const pillWidth = Math.ceil(fit.width + padX * 2);
  return {
    label,
    fontSize: fit.fontSize,
    textWidth: fit.width,
    pillWidth,
    padX,
    letterSpacing,
    maxWidth
  };
}

function renderPill({
  x = 24,
  y = 24,
  height = 26,
  rx = 6,
  label,
  maxWidth = 272,
  maxFontSize = 13,
  minFontSize = 10,
  letterSpacing = 1,
  padX = 12,
  fill = '#1e293b',
  stroke = '#334155',
  textColor = '#94a3b8',
  fontWeight = 700
}) {
  const pill = fitPillLabel(label, { maxWidth, maxFontSize, minFontSize, letterSpacing, padX });
  const strokeAttr = stroke ? ` stroke="${stroke}" stroke-width="1"` : '';
  const textY = y + Math.round(height * 0.69);
  return `<rect x="${x}" y="${y}" width="${pill.pillWidth}" height="${height}" rx="${rx}" fill="${fill}"${strokeAttr}/>
      <text x="${x + pill.padX}" y="${textY}" fill="${textColor}" font-family="Inter, sans-serif" font-size="${pill.fontSize}" font-weight="${fontWeight}" letter-spacing="${letterSpacing}">${escapeXml(label)}</text>`;
}

function getTitleFontSize(len) {
  if (len > 34) return 38;
  if (len > 24) return 46;
  return 56;
}

/**
 * Shared SVG shell background, gradients, and header brand/domain.
 */
function svgShell({ badgeText, title, subtitle, titleFontSize = null, contentSvg }) {
  const initialTitleFs = titleFontSize || getTitleFontSize(title.length);
  const titleFit = fitSingleLineText(title, SHELL_INNER_WIDTH, initialTitleFs, 22);
  const subFit = subtitle ? fitSingleLineText(subtitle, SHELL_INNER_WIDTH, 24, 14) : null;
  const headerPill = fitPillLabel(badgeText, { maxWidth: 420, maxFontSize: 14, minFontSize: 10, letterSpacing: 1, padX: 14 });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <radialGradient id="bgGlow" cx="20%" cy="15%" r="65%">
      <stop offset="0%" stop-color="#1e293b" stop-opacity="0.8"/>
      <stop offset="100%" stop-color="#0b0f19" stop-opacity="1"/>
    </radialGradient>
    <linearGradient id="cardGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#182235"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
    <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#10b981"/>
      <stop offset="100%" stop-color="#059669"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="1200" height="630" fill="#0b0f19"/>
  <rect width="1200" height="630" fill="url(#bgGlow)"/>

  <!-- Top Accent Bar -->
  <rect x="0" y="0" width="1200" height="4" fill="url(#accentGrad)"/>

  <!-- Brand / Domain Header -->
  <g transform="translate(80, 68)">
    <circle cx="10" cy="10" r="10" fill="#10b981"/>
    <text x="32" y="16" fill="#10b981" font-family="Inter, sans-serif" font-size="20" font-weight="700" letter-spacing="2">AIRIGBUILDER.COM</text>
    
    <!-- Badge -->
    <rect x="270" y="-3" width="${headerPill.pillWidth}" height="32" rx="16" fill="#1e293b" stroke="#334155" stroke-width="1"/>
    <text x="${270 + headerPill.padX}" y="17" fill="#94a3b8" font-family="Inter, sans-serif" font-size="${headerPill.fontSize}" font-weight="600" letter-spacing="1">${escapeXml(badgeText)}</text>
  </g>

  <!-- Title & Subtitle -->
  <text x="80" y="180" fill="#f8fafc" font-family="Inter, sans-serif" font-size="${titleFit.fontSize}" font-weight="700">${escapeXml(title)}</text>
  ${subFit ? `<text x="80" y="228" fill="#94a3b8" font-family="Inter, sans-serif" font-size="${subFit.fontSize}" font-weight="400">${escapeXml(subtitle)}</text>` : ''}

  <!-- Page Family Content -->
  ${contentSvg}

  <!-- Footer Tagline -->
  <text x="80" y="580" fill="#64748b" font-family="Inter, sans-serif" font-size="16" font-weight="500">The used-hardware price layer for local AI · Real eBay sold prices</text>
</svg>`;
}

/**
 * 1. Build Sheet Card (56 models)
 */
export function renderBuildSheetSvg(model, sheet) {
  const specLine = `${model.parameters} · ${model.architecture}`;
  const cheapest = cheapestFittingTotal(sheet);
  const cheapestStr = cheapest !== null ? `$${cheapest.toLocaleString('en-US')}` : 'N/A';
  const minVramStr = `${model.minVram} GB`;
  const sweetSpot = model.sweetSpotQuant ? model.sweetSpotQuant.split(' ')[0] : 'Q4_K_M';
  const tiersLabel = `${sheet.tiers.length} verified hardware tiers`;

  const cheapestFit = fitSingleLineText(cheapestStr, BUILD_CARD_INNER_WIDTH, 52, 24);
  const minVramFit = fitSingleLineText(minVramStr, BUILD_CARD_INNER_WIDTH, 52, 24);
  const sweetSpotFit = fitSingleLineText(sweetSpot, BUILD_CARD_INNER_WIDTH, 44, 20);
  const tiersLabelFit = fitSingleLineText(tiersLabel, BUILD_CARD_INNER_WIDTH, 15, 12);

  const content = `
  <g transform="translate(80, 280)">
    <!-- Card 1: Builds From -->
    <g transform="translate(0, 0)">
      <rect width="320" height="230" rx="20" fill="url(#cardGrad)" stroke="#1e293b" stroke-width="1.5"/>
      ${renderPill({ label: 'CHEAPEST FIT', maxWidth: BUILD_CARD_INNER_WIDTH, fill: '#064e3b', stroke: null, textColor: '#34d399' })}
      <text x="24" y="85" fill="#94a3b8" font-family="Inter, sans-serif" font-size="15" font-weight="600" letter-spacing="0.5">BUILDS FROM</text>
      <text x="24" y="145" fill="#10b981" font-family="Inter, sans-serif" font-size="${cheapestFit.fontSize}" font-weight="700">${escapeXml(cheapestStr)}</text>
      <text x="24" y="185" fill="#64748b" font-family="Inter, sans-serif" font-size="15" font-weight="500">Upfront parts total</text>
    </g>

    <!-- Card 2: Minimum VRAM -->
    <g transform="translate(360, 0)">
      <rect width="320" height="230" rx="20" fill="url(#cardGrad)" stroke="#1e293b" stroke-width="1.5"/>
      ${renderPill({ label: 'REQUIREMENT', maxWidth: BUILD_CARD_INNER_WIDTH })}
      <text x="24" y="85" fill="#94a3b8" font-family="Inter, sans-serif" font-size="15" font-weight="600" letter-spacing="0.5">MINIMUM VRAM</text>
      <text x="24" y="145" fill="#f8fafc" font-family="Inter, sans-serif" font-size="${minVramFit.fontSize}" font-weight="700">${escapeXml(minVramStr)}</text>
      <text x="24" y="185" fill="#64748b" font-family="Inter, sans-serif" font-size="15" font-weight="500">Strict minimum for weights</text>
    </g>

    <!-- Card 3: Architecture / Sweet Spot -->
    <g transform="translate(720, 0)">
      <rect width="320" height="230" rx="20" fill="url(#cardGrad)" stroke="#1e293b" stroke-width="1.5"/>
      ${renderPill({ label: 'RECOMMENDED', maxWidth: BUILD_CARD_INNER_WIDTH })}
      <text x="24" y="85" fill="#94a3b8" font-family="Inter, sans-serif" font-size="15" font-weight="600" letter-spacing="0.5">SWEET SPOT QUANT</text>
      <text x="24" y="145" fill="#f8fafc" font-family="Inter, sans-serif" font-size="${sweetSpotFit.fontSize}" font-weight="700">${escapeXml(sweetSpot)}</text>
      <text x="24" y="185" fill="#64748b" font-family="Inter, sans-serif" font-size="${tiersLabelFit.fontSize}" font-weight="500">${escapeXml(tiersLabel)}</text>
    </g>
  </g>`;

  return svgShell({
    badgeText: 'LOCAL AI BUILD SHEET',
    title: model.name,
    subtitle: specLine,
    contentSvg: content
  });
}

/**
 * 2. GPU Detail Page Card (19 GPUs)
 */
export function renderGpuPageSvg(gpu) {
  const specLine = `${gpu.vram} GB ${gpu.vramType} · ${gpu.bandwidth} GB/s Bandwidth · ${gpu.tdp}W TDP`;
  const streetPrice = `Used $${gpu.usedStreetPrice.toLocaleString('en-US')}`;
  const rangeStr = `$${gpu.usedPriceLow.toLocaleString('en-US')} – $${gpu.usedPriceHigh.toLocaleString('en-US')}`;
  const rangeLine = `Recent eBay range: ${rangeStr}`;
  const pricePerGb = `$${gpu.pricePerGb.toFixed(2)}/GB`;
  const vramSub = `${gpu.vram} GB total VRAM`;
  const bwSub = `${gpu.bandwidth} GB/s bandwidth`;

  const streetPriceFit = fitSingleLineText(streetPrice, GPU_PRICE_CARD_INNER_WIDTH, 52, 24);
  const rangeLineFit = fitSingleLineText(rangeLine, GPU_PRICE_CARD_INNER_WIDTH, 16, 12);
  const pricePerGbFit = fitSingleLineText(pricePerGb, GPU_EFFICIENCY_CARD_INNER_WIDTH, 46, 20);
  const vramSubFit = fitSingleLineText(vramSub, GPU_EFFICIENCY_CARD_INNER_WIDTH, 15, 12);
  const verdictFit = fitBoxText(gpu.aiRating, GPU_VERDICT_CARD_INNER_WIDTH, {
    maxFontSize: 28,
    minSingleLineSize: 22,
    maxTwoLineSize: 24,
    minFontSize: 14
  });
  const bwSubFit = fitSingleLineText(bwSub, GPU_VERDICT_CARD_INNER_WIDTH, 15, 12);

  const verdictTextSvg = verdictFit.lines.length === 1
    ? `<text x="24" y="140" fill="#f8fafc" font-family="Inter, sans-serif" font-size="${verdictFit.fontSize}" font-weight="700">${escapeXml(verdictFit.lines[0])}</text>`
    : `<text x="24" y="122" fill="#f8fafc" font-family="Inter, sans-serif" font-size="${verdictFit.fontSize}" font-weight="700">${escapeXml(verdictFit.lines[0])}</text>
      <text x="24" y="${122 + Math.round(verdictFit.fontSize * 1.25)}" fill="#f8fafc" font-family="Inter, sans-serif" font-size="${verdictFit.fontSize}" font-weight="700">${escapeXml(verdictFit.lines[1])}</text>`;

  const content = `
  <g transform="translate(80, 280)">
    <!-- Card 1: Tracked Used Price -->
    <g transform="translate(0, 0)">
      <rect width="420" height="230" rx="20" fill="url(#cardGrad)" stroke="#1e293b" stroke-width="1.5"/>
      ${renderPill({ label: 'MARKET PRICE', maxWidth: GPU_PRICE_CARD_INNER_WIDTH, fill: '#064e3b', stroke: null, textColor: '#34d399' })}
      <text x="24" y="85" fill="#94a3b8" font-family="Inter, sans-serif" font-size="15" font-weight="600" letter-spacing="0.5">ESTIMATED STREET PRICE</text>
      <text x="24" y="145" fill="#10b981" font-family="Inter, sans-serif" font-size="${streetPriceFit.fontSize}" font-weight="700">${escapeXml(streetPrice)}</text>
      <text x="24" y="185" fill="#64748b" font-family="Inter, sans-serif" font-size="${rangeLineFit.fontSize}" font-weight="500">${escapeXml(rangeLine)}</text>
    </g>

    <!-- Card 2: Price Per GB -->
    <g transform="translate(460, 0)">
      <rect width="280" height="230" rx="20" fill="url(#cardGrad)" stroke="#1e293b" stroke-width="1.5"/>
      ${renderPill({ label: 'EFFICIENCY', maxWidth: GPU_EFFICIENCY_CARD_INNER_WIDTH })}
      <text x="24" y="85" fill="#94a3b8" font-family="Inter, sans-serif" font-size="15" font-weight="600" letter-spacing="0.5">PRICE PER GB</text>
      <text x="24" y="145" fill="#f8fafc" font-family="Inter, sans-serif" font-size="${pricePerGbFit.fontSize}" font-weight="700">${escapeXml(pricePerGb)}</text>
      <text x="24" y="185" fill="#64748b" font-family="Inter, sans-serif" font-size="${vramSubFit.fontSize}" font-weight="500">${escapeXml(vramSub)}</text>
    </g>

    <!-- Card 3: AI Rating -->
    <g transform="translate(780, 0)">
      <rect width="260" height="230" rx="20" fill="url(#cardGrad)" stroke="#1e293b" stroke-width="1.5"/>
      ${renderPill({ label: 'VERDICT', maxWidth: GPU_VERDICT_CARD_INNER_WIDTH })}
      <text x="24" y="85" fill="#94a3b8" font-family="Inter, sans-serif" font-size="15" font-weight="600" letter-spacing="0.5">COMMUNITY CLASS</text>
      ${verdictTextSvg}
      <text x="24" y="185" fill="#64748b" font-family="Inter, sans-serif" font-size="${bwSubFit.fontSize}" font-weight="500">${escapeXml(bwSub)}</text>
    </g>
  </g>`;

  return svgShell({
    badgeText: 'GPU PRICE TRACKER',
    title: gpu.name,
    subtitle: specLine,
    contentSvg: content
  });
}

/**
 * 3. Comparison Page Card (10 pairs)
 */
export function renderComparisonSvg(gpuA, gpuB) {
  const nameA = shortGpuName(gpuA);
  const nameB = shortGpuName(gpuB);
  const title = `${nameA} vs ${nameB}`;
  const subtitle = 'Head-to-head local LLM hardware comparison & used prices';

  const priceA = `Used $${gpuA.usedStreetPrice.toLocaleString('en-US')}`;
  const priceB = `Used $${gpuB.usedStreetPrice.toLocaleString('en-US')}`;

  const vramSpecA = `${gpuA.vram} GB ${gpuA.vramType}`;
  const bwSpecA = `${gpuA.bandwidth} GB/s · ${gpuA.tdp}W`;
  const ppgSpecA = `$${gpuA.pricePerGb.toFixed(2)}/GB`;

  const vramSpecB = `${gpuB.vram} GB ${gpuB.vramType}`;
  const bwSpecB = `${gpuB.bandwidth} GB/s · ${gpuB.tdp}W`;
  const ppgSpecB = `$${gpuB.pricePerGb.toFixed(2)}/GB`;

  const nameAFit = fitSingleLineText(nameA, COMPARE_CARD_INNER_WIDTH, 28, 18);
  const priceAFit = fitSingleLineText(priceA, COMPARE_CARD_INNER_WIDTH, 44, 24);
  const vramAFit = fitSingleLineText(vramSpecA, COMPARE_SPEC_VALUE_WIDTH, 16, 12);
  const bwAFit = fitSingleLineText(bwSpecA, COMPARE_SPEC_VALUE_WIDTH, 16, 12);
  const ppgAFit = fitSingleLineText(ppgSpecA, COMPARE_SPEC_VALUE_WIDTH, 16, 12);

  const nameBFit = fitSingleLineText(nameB, COMPARE_CARD_INNER_WIDTH, 28, 18);
  const priceBFit = fitSingleLineText(priceB, COMPARE_CARD_INNER_WIDTH, 44, 24);
  const vramBFit = fitSingleLineText(vramSpecB, COMPARE_SPEC_VALUE_WIDTH, 16, 12);
  const bwBFit = fitSingleLineText(bwSpecB, COMPARE_SPEC_VALUE_WIDTH, 16, 12);
  const ppgBFit = fitSingleLineText(ppgSpecB, COMPARE_SPEC_VALUE_WIDTH, 16, 12);

  const content = `
  <g transform="translate(80, 270)">
    <!-- Left Card: GPU A -->
    <g transform="translate(0, 0)">
      <rect width="490" height="250" rx="20" fill="url(#cardGrad)" stroke="#1e293b" stroke-width="1.5"/>
      <text x="32" y="48" fill="#f8fafc" font-family="Inter, sans-serif" font-size="${nameAFit.fontSize}" font-weight="700">${escapeXml(nameA)}</text>
      <text x="32" y="112" fill="#10b981" font-family="Inter, sans-serif" font-size="${priceAFit.fontSize}" font-weight="700">${escapeXml(priceA)}</text>
      <line x1="32" y1="135" x2="458" y2="135" stroke="#1e293b" stroke-width="1"/>
      <g transform="translate(32, 160)">
        <text x="0" y="18" fill="#94a3b8" font-family="Inter, sans-serif" font-size="16" font-weight="500">VRAM &amp; Type:</text>
        <text x="140" y="18" fill="#f8fafc" font-family="Inter, sans-serif" font-size="${vramAFit.fontSize}" font-weight="600">${escapeXml(vramSpecA)}</text>
        <text x="0" y="46" fill="#94a3b8" font-family="Inter, sans-serif" font-size="16" font-weight="500">Bandwidth / TDP:</text>
        <text x="140" y="46" fill="#f8fafc" font-family="Inter, sans-serif" font-size="${bwAFit.fontSize}" font-weight="600">${escapeXml(bwSpecA)}</text>
        <text x="0" y="74" fill="#94a3b8" font-family="Inter, sans-serif" font-size="16" font-weight="500">Price per GB:</text>
        <text x="140" y="74" fill="#f8fafc" font-family="Inter, sans-serif" font-size="${ppgAFit.fontSize}" font-weight="600">${escapeXml(ppgSpecA)}</text>
      </g>
    </g>

    <!-- VS Badge in Middle -->
    <g transform="translate(520, 100)">
      <circle cx="20" cy="20" r="26" fill="#1e293b" stroke="#334155" stroke-width="2"/>
      <text x="20" y="27" fill="#10b981" font-family="Inter, sans-serif" font-size="18" font-weight="800" text-anchor="middle">VS</text>
    </g>

    <!-- Right Card: GPU B -->
    <g transform="translate(550, 0)">
      <rect width="490" height="250" rx="20" fill="url(#cardGrad)" stroke="#1e293b" stroke-width="1.5"/>
      <text x="32" y="48" fill="#f8fafc" font-family="Inter, sans-serif" font-size="${nameBFit.fontSize}" font-weight="700">${escapeXml(nameB)}</text>
      <text x="32" y="112" fill="#10b981" font-family="Inter, sans-serif" font-size="${priceBFit.fontSize}" font-weight="700">${escapeXml(priceB)}</text>
      <line x1="32" y1="135" x2="458" y2="135" stroke="#1e293b" stroke-width="1"/>
      <g transform="translate(32, 160)">
        <text x="0" y="18" fill="#94a3b8" font-family="Inter, sans-serif" font-size="16" font-weight="500">VRAM &amp; Type:</text>
        <text x="140" y="18" fill="#f8fafc" font-family="Inter, sans-serif" font-size="${vramBFit.fontSize}" font-weight="600">${escapeXml(vramSpecB)}</text>
        <text x="0" y="46" fill="#94a3b8" font-family="Inter, sans-serif" font-size="16" font-weight="500">Bandwidth / TDP:</text>
        <text x="140" y="46" fill="#f8fafc" font-family="Inter, sans-serif" font-size="${bwBFit.fontSize}" font-weight="600">${escapeXml(bwSpecB)}</text>
        <text x="0" y="74" fill="#94a3b8" font-family="Inter, sans-serif" font-size="16" font-weight="500">Price per GB:</text>
        <text x="140" y="74" fill="#f8fafc" font-family="Inter, sans-serif" font-size="${ppgBFit.fontSize}" font-weight="600">${escapeXml(ppgSpecB)}</text>
      </g>
    </g>
  </g>`;

  return svgShell({
    badgeText: 'GPU COMPARISON',
    title,
    subtitle,
    contentSvg: content
  });
}

/**
 * 4. Best GPU Rankings Card (8 models)
 */
export function renderBestGpuSvg(model, bestGpuPick) {
  const title = `Best GPU for ${model.name}`;
  const subtitle = `Ranked GPU hardware configurations for ${model.parameters} parameters`;

  const cheapest = bestGpuPick?.cheapestThatRuns;
  const bestValue = bestGpuPick?.bestValueFullFit;

  const cheapConfigName = cheapest ? cheapest.name : 'None';
  const cheapPriceStr = cheapest ? `$${cheapest.totalPrice.toLocaleString('en-US')}` : 'N/A';
  const cheapSpecs = cheapest ? `${cheapest.memoryGb} GB VRAM · ${cheapest.speedStr}` : '';

  const bestConfigName = bestValue ? bestValue.name : 'None';
  const bestPriceStr = bestValue ? `$${bestValue.totalPrice.toLocaleString('en-US')}` : 'N/A';
  const bestSpecs = bestValue ? `${bestValue.memoryGb} GB VRAM · ${bestValue.speedStr}` : '';

  const cheapNameFit = fitSingleLineText(cheapConfigName, BEST_GPU_PRIMARY_INNER_WIDTH, 30, 16);
  const cheapPriceFit = fitSingleLineText(cheapPriceStr, BEST_GPU_PRIMARY_INNER_WIDTH, 48, 24);
  const cheapSpecsFit = fitSingleLineText(cheapSpecs, BEST_GPU_PRIMARY_INNER_WIDTH, 18, 12);

  const bestNameFit = fitSingleLineText(bestConfigName, BEST_GPU_SECONDARY_INNER_WIDTH, 30, 16);
  const bestPriceFit = fitSingleLineText(bestPriceStr, BEST_GPU_SECONDARY_INNER_WIDTH, 48, 24);
  const bestSpecsFit = fitSingleLineText(bestSpecs, BEST_GPU_SECONDARY_INNER_WIDTH, 18, 12);

  const content = `
  <g transform="translate(80, 270)">
    <!-- Primary Pick: Cheapest That Runs It -->
    <g transform="translate(0, 0)">
      <rect width="520" height="250" rx="20" fill="url(#cardGrad)" stroke="#10b981" stroke-width="2"/>
      ${renderPill({ x: 28, y: 24, height: 28, label: 'CHEAPEST TO RUN IT', maxWidth: BEST_GPU_PRIMARY_INNER_WIDTH, fill: '#064e3b', stroke: null, textColor: '#34d399' })}
      <text x="28" y="90" fill="#f8fafc" font-family="Inter, sans-serif" font-size="${cheapNameFit.fontSize}" font-weight="700">${escapeXml(cheapConfigName)}</text>
      <text x="28" y="152" fill="#10b981" font-family="Inter, sans-serif" font-size="${cheapPriceFit.fontSize}" font-weight="700">${escapeXml(cheapPriceStr)}</text>
      <text x="28" y="195" fill="#94a3b8" font-family="Inter, sans-serif" font-size="${cheapSpecsFit.fontSize}" font-weight="500">${escapeXml(cheapSpecs)}</text>
    </g>

    <!-- Secondary Pick: Best Value Full Fit -->
    <g transform="translate(560, 0)">
      <rect width="480" height="250" rx="20" fill="url(#cardGrad)" stroke="#1e293b" stroke-width="1.5"/>
      ${renderPill({ x: 28, y: 24, height: 28, label: 'BEST VALUE FULL FIT', maxWidth: BEST_GPU_SECONDARY_INNER_WIDTH })}
      <text x="28" y="90" fill="#f8fafc" font-family="Inter, sans-serif" font-size="${bestNameFit.fontSize}" font-weight="700">${escapeXml(bestConfigName)}</text>
      <text x="28" y="152" fill="#f8fafc" font-family="Inter, sans-serif" font-size="${bestPriceFit.fontSize}" font-weight="700">${escapeXml(bestPriceStr)}</text>
      <text x="28" y="195" fill="#94a3b8" font-family="Inter, sans-serif" font-size="${bestSpecsFit.fontSize}" font-weight="500">${escapeXml(bestSpecs)}</text>
    </g>
  </g>`;

  return svgShell({
    badgeText: 'BEST GPU RANKINGS',
    title,
    subtitle,
    contentSvg: content
  });
}
