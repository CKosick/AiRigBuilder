// Pure SVG card templates for Open Graph 1200x630 social sharing images.
// Styled according to the site's dark palette (slate/emerald/neutral).
import { shortGpuName } from '../src/routes.js';
import { cheapestFittingTotal } from '../src/utils/tierFit.js';
import { evaluateBestGpu } from '../src/components/bestGpu.js';

function escapeXml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
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
  const t = escapeXml(title);
  const sub = escapeXml(subtitle);
  const badge = escapeXml(badgeText);
  const fs = titleFontSize || getTitleFontSize(title.length);

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
    <rect x="270" y="-3" width="${badge.length * 10 + 28}" height="32" rx="16" fill="#1e293b" stroke="#334155" stroke-width="1"/>
    <text x="${270 + 14}" y="17" fill="#94a3b8" font-family="Inter, sans-serif" font-size="14" font-weight="600" letter-spacing="1">${badge}</text>
  </g>

  <!-- Title & Subtitle -->
  <text x="80" y="180" fill="#f8fafc" font-family="Inter, sans-serif" font-size="${fs}" font-weight="700">${t}</text>
  ${sub ? `<text x="80" y="228" fill="#94a3b8" font-family="Inter, sans-serif" font-size="24" font-weight="400">${sub}</text>` : ''}

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

  const content = `
  <g transform="translate(80, 280)">
    <!-- Card 1: Builds From -->
    <g transform="translate(0, 0)">
      <rect width="320" height="230" rx="20" fill="url(#cardGrad)" stroke="#1e293b" stroke-width="1.5"/>
      <rect x="24" y="24" width="110" height="26" rx="6" fill="#064e3b"/>
      <text x="34" y="42" fill="#34d399" font-family="Inter, sans-serif" font-size="13" font-weight="700" letter-spacing="1">CHEAPEST FIT</text>
      <text x="24" y="85" fill="#94a3b8" font-family="Inter, sans-serif" font-size="15" font-weight="600" letter-spacing="0.5">BUILDS FROM</text>
      <text x="24" y="145" fill="#10b981" font-family="Inter, sans-serif" font-size="52" font-weight="700">${escapeXml(cheapestStr)}</text>
      <text x="24" y="185" fill="#64748b" font-family="Inter, sans-serif" font-size="15" font-weight="500">Upfront parts total</text>
    </g>

    <!-- Card 2: Minimum VRAM -->
    <g transform="translate(360, 0)">
      <rect width="320" height="230" rx="20" fill="url(#cardGrad)" stroke="#1e293b" stroke-width="1.5"/>
      <rect x="24" y="24" width="124" height="26" rx="6" fill="#1e293b" stroke="#334155" stroke-width="1"/>
      <text x="34" y="42" fill="#94a3b8" font-family="Inter, sans-serif" font-size="13" font-weight="700" letter-spacing="1">REQUIREMENT</text>
      <text x="24" y="85" fill="#94a3b8" font-family="Inter, sans-serif" font-size="15" font-weight="600" letter-spacing="0.5">MINIMUM VRAM</text>
      <text x="24" y="145" fill="#f8fafc" font-family="Inter, sans-serif" font-size="52" font-weight="700">${escapeXml(minVramStr)}</text>
      <text x="24" y="185" fill="#64748b" font-family="Inter, sans-serif" font-size="15" font-weight="500">Strict minimum for weights</text>
    </g>

    <!-- Card 3: Architecture / Sweet Spot -->
    <g transform="translate(720, 0)">
      <rect width="320" height="230" rx="20" fill="url(#cardGrad)" stroke="#1e293b" stroke-width="1.5"/>
      <rect x="24" y="24" width="120" height="26" rx="6" fill="#1e293b" stroke="#334155" stroke-width="1"/>
      <text x="34" y="42" fill="#94a3b8" font-family="Inter, sans-serif" font-size="13" font-weight="700" letter-spacing="1">RECOMMENDED</text>
      <text x="24" y="85" fill="#94a3b8" font-family="Inter, sans-serif" font-size="15" font-weight="600" letter-spacing="0.5">SWEET SPOT QUANT</text>
      <text x="24" y="145" fill="#f8fafc" font-family="Inter, sans-serif" font-size="44" font-weight="700">${escapeXml(sweetSpot)}</text>
      <text x="24" y="185" fill="#64748b" font-family="Inter, sans-serif" font-size="15" font-weight="500">${sheet.tiers.length} verified hardware tiers</text>
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
  const pricePerGb = `$${gpu.pricePerGb.toFixed(2)}/GB`;

  const content = `
  <g transform="translate(80, 280)">
    <!-- Card 1: Tracked Used Price -->
    <g transform="translate(0, 0)">
      <rect width="420" height="230" rx="20" fill="url(#cardGrad)" stroke="#1e293b" stroke-width="1.5"/>
      <rect x="24" y="24" width="120" height="26" rx="6" fill="#064e3b"/>
      <text x="34" y="42" fill="#34d399" font-family="Inter, sans-serif" font-size="13" font-weight="700" letter-spacing="1">MARKET PRICE</text>
      <text x="24" y="85" fill="#94a3b8" font-family="Inter, sans-serif" font-size="15" font-weight="600" letter-spacing="0.5">ESTIMATED STREET PRICE</text>
      <text x="24" y="145" fill="#10b981" font-family="Inter, sans-serif" font-size="52" font-weight="700">${escapeXml(streetPrice)}</text>
      <text x="24" y="185" fill="#64748b" font-family="Inter, sans-serif" font-size="16" font-weight="500">Recent eBay range: ${escapeXml(rangeStr)}</text>
    </g>

    <!-- Card 2: Price Per GB -->
    <g transform="translate(460, 0)">
      <rect width="280" height="230" rx="20" fill="url(#cardGrad)" stroke="#1e293b" stroke-width="1.5"/>
      <rect x="24" y="24" width="100" height="26" rx="6" fill="#1e293b" stroke="#334155" stroke-width="1"/>
      <text x="34" y="42" fill="#94a3b8" font-family="Inter, sans-serif" font-size="13" font-weight="700" letter-spacing="1">EFFICIENCY</text>
      <text x="24" y="85" fill="#94a3b8" font-family="Inter, sans-serif" font-size="15" font-weight="600" letter-spacing="0.5">PRICE PER GB</text>
      <text x="24" y="145" fill="#f8fafc" font-family="Inter, sans-serif" font-size="46" font-weight="700">${escapeXml(pricePerGb)}</text>
      <text x="24" y="185" fill="#64748b" font-family="Inter, sans-serif" font-size="15" font-weight="500">${gpu.vram} GB total VRAM</text>
    </g>

    <!-- Card 3: AI Rating -->
    <g transform="translate(780, 0)">
      <rect width="260" height="230" rx="20" fill="url(#cardGrad)" stroke="#1e293b" stroke-width="1.5"/>
      <rect x="24" y="24" width="90" height="26" rx="6" fill="#1e293b" stroke="#334155" stroke-width="1"/>
      <text x="34" y="42" fill="#94a3b8" font-family="Inter, sans-serif" font-size="13" font-weight="700" letter-spacing="1">VERDICT</text>
      <text x="24" y="85" fill="#94a3b8" font-family="Inter, sans-serif" font-size="15" font-weight="600" letter-spacing="0.5">COMMUNITY CLASS</text>
      <text x="24" y="140" fill="#f8fafc" font-family="Inter, sans-serif" font-size="28" font-weight="700">${escapeXml(gpu.aiRating)}</text>
      <text x="24" y="185" fill="#64748b" font-family="Inter, sans-serif" font-size="15" font-weight="500">${gpu.bandwidth} GB/s bandwidth</text>
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

  const content = `
  <g transform="translate(80, 270)">
    <!-- Left Card: GPU A -->
    <g transform="translate(0, 0)">
      <rect width="490" height="250" rx="20" fill="url(#cardGrad)" stroke="#1e293b" stroke-width="1.5"/>
      <text x="32" y="48" fill="#f8fafc" font-family="Inter, sans-serif" font-size="28" font-weight="700">${escapeXml(nameA)}</text>
      <text x="32" y="112" fill="#10b981" font-family="Inter, sans-serif" font-size="44" font-weight="700">${escapeXml(priceA)}</text>
      <line x1="32" y1="135" x2="458" y2="135" stroke="#1e293b" stroke-width="1"/>
      <g transform="translate(32, 160)">
        <text x="0" y="18" fill="#94a3b8" font-family="Inter, sans-serif" font-size="16" font-weight="500">VRAM &amp; Type:</text>
        <text x="140" y="18" fill="#f8fafc" font-family="Inter, sans-serif" font-size="16" font-weight="600">${escapeXml(`${gpuA.vram} GB ${gpuA.vramType}`)}</text>
        <text x="0" y="46" fill="#94a3b8" font-family="Inter, sans-serif" font-size="16" font-weight="500">Bandwidth / TDP:</text>
        <text x="140" y="46" fill="#f8fafc" font-family="Inter, sans-serif" font-size="16" font-weight="600">${escapeXml(`${gpuA.bandwidth} GB/s · ${gpuA.tdp}W`)}</text>
        <text x="0" y="74" fill="#94a3b8" font-family="Inter, sans-serif" font-size="16" font-weight="500">Price per GB:</text>
        <text x="140" y="74" fill="#f8fafc" font-family="Inter, sans-serif" font-size="16" font-weight="600">${escapeXml(`$${gpuA.pricePerGb.toFixed(2)}/GB`)}</text>
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
      <text x="32" y="48" fill="#f8fafc" font-family="Inter, sans-serif" font-size="28" font-weight="700">${escapeXml(nameB)}</text>
      <text x="32" y="112" fill="#10b981" font-family="Inter, sans-serif" font-size="44" font-weight="700">${escapeXml(priceB)}</text>
      <line x1="32" y1="135" x2="458" y2="135" stroke="#1e293b" stroke-width="1"/>
      <g transform="translate(32, 160)">
        <text x="0" y="18" fill="#94a3b8" font-family="Inter, sans-serif" font-size="16" font-weight="500">VRAM &amp; Type:</text>
        <text x="140" y="18" fill="#f8fafc" font-family="Inter, sans-serif" font-size="16" font-weight="600">${escapeXml(`${gpuB.vram} GB ${gpuB.vramType}`)}</text>
        <text x="0" y="46" fill="#94a3b8" font-family="Inter, sans-serif" font-size="16" font-weight="500">Bandwidth / TDP:</text>
        <text x="140" y="46" fill="#f8fafc" font-family="Inter, sans-serif" font-size="16" font-weight="600">${escapeXml(`${gpuB.bandwidth} GB/s · ${gpuB.tdp}W`)}</text>
        <text x="0" y="74" fill="#94a3b8" font-family="Inter, sans-serif" font-size="16" font-weight="500">Price per GB:</text>
        <text x="140" y="74" fill="#f8fafc" font-family="Inter, sans-serif" font-size="16" font-weight="600">${escapeXml(`$${gpuB.pricePerGb.toFixed(2)}/GB`)}</text>
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

  const content = `
  <g transform="translate(80, 270)">
    <!-- Primary Pick: Cheapest That Runs It -->
    <g transform="translate(0, 0)">
      <rect width="520" height="250" rx="20" fill="url(#cardGrad)" stroke="#10b981" stroke-width="2"/>
      <rect x="28" y="24" width="160" height="28" rx="6" fill="#064e3b"/>
      <text x="38" y="43" fill="#34d399" font-family="Inter, sans-serif" font-size="13" font-weight="700" letter-spacing="1">CHEAPEST TO RUN IT</text>
      <text x="28" y="90" fill="#f8fafc" font-family="Inter, sans-serif" font-size="30" font-weight="700">${escapeXml(cheapConfigName)}</text>
      <text x="28" y="152" fill="#10b981" font-family="Inter, sans-serif" font-size="48" font-weight="700">${escapeXml(cheapPriceStr)}</text>
      <text x="28" y="195" fill="#94a3b8" font-family="Inter, sans-serif" font-size="18" font-weight="500">${escapeXml(cheapSpecs)}</text>
    </g>

    <!-- Secondary Pick: Best Value Full Fit -->
    <g transform="translate(560, 0)">
      <rect width="480" height="250" rx="20" fill="url(#cardGrad)" stroke="#1e293b" stroke-width="1.5"/>
      <rect x="28" y="24" width="170" height="28" rx="6" fill="#1e293b" stroke="#334155" stroke-width="1"/>
      <text x="38" y="43" fill="#94a3b8" font-family="Inter, sans-serif" font-size="13" font-weight="700" letter-spacing="1">BEST VALUE FULL FIT</text>
      <text x="28" y="90" fill="#f8fafc" font-family="Inter, sans-serif" font-size="30" font-weight="700">${escapeXml(bestConfigName)}</text>
      <text x="28" y="152" fill="#f8fafc" font-family="Inter, sans-serif" font-size="48" font-weight="700">${escapeXml(bestPriceStr)}</text>
      <text x="28" y="195" fill="#94a3b8" font-family="Inter, sans-serif" font-size="18" font-weight="500">${escapeXml(bestSpecs)}</text>
    </g>
  </g>`;

  return svgShell({
    badgeText: 'BEST GPU RANKINGS',
    title,
    subtitle,
    contentSvg: content
  });
}

