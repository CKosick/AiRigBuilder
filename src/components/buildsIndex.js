// Build sheet index (/builds): every model in one comparison table, grouped by the VRAM it needs,
// linking to each model's build sheet. Pure HTML shared by the browser and scripts/prerender.js.
import { MODELS_DATA } from '../data/models.js';
import { BUILDS_DATA } from '../data/builds.js';
import { buildPath } from '../routes.js';

const VRAM_GROUPS = [
  { min: 48, title: '48 GB+ VRAM: 70B, MoE and Larger', blurb: 'Dual-GPU and bigger rigs. A pair of used RTX 3090s is the cheapest way into this class.' },
  { min: 20, title: '24–32 GB VRAM: 22B–35B Models', blurb: 'One 24 GB card (a used RTX 3090 or Tesla P40) runs these at Q4 with room for context.' },
  { min: 13, title: '16 GB VRAM: 11B–15B Models', blurb: 'A 16 GB card such as the RTX 4060 Ti 16GB, or a used 3090 for long context.' },
  { min: 0, title: '8–12 GB VRAM: 3B–9B Starter Models', blurb: 'Budget single-GPU builds around an RTX 3060 12GB.' }
];

const partsTotal = (tier) => tier.parts.reduce((sum, p) => sum + (p.price || 0), 0);

// Models in a group often share the same three rigs; say so instead of hiding it
const rigSignature = (sheet) => sheet.tiers.map(t => `${t.name}:${partsTotal(t)}`).join('|');

export function renderBuildsIndexHtml() {
  const models = MODELS_DATA.filter(m => BUILDS_DATA[m.id]);
  const groups = VRAM_GROUPS.map((g, i) => ({
    ...g,
    models: models.filter(m => m.recommendedVram >= g.min && (i === 0 || m.recommendedVram < VRAM_GROUPS[i - 1].min))
  })).filter(g => g.models.length);

  const groupHtml = groups.map((g, gi) => {
    const sharedRig = g.models.length > 1 && new Set(g.models.map(m => rigSignature(BUILDS_DATA[m.id]))).size === 1;
    const rows = g.models.map(m => {
      const sheet = BUILDS_DATA[m.id];
      const cheapest = Math.min(...sheet.tiers.map(partsTotal));
      return `
              <tr>
                <td class="part-name-cell stack-head">
                  <strong><a href="${buildPath(m.id)}">${m.name}</a></strong>
                  <div class="part-spec-sub">${m.creator} · ${m.parameters}</div>
                </td>
                <td data-label="VRAM target">${sheet.vramTarget}</td>
                <td data-label="Sweet spot quant">${m.sweetSpotQuant}</td>
                <td data-label="Speed on dual 3090">${m.typicalSpeedDual3090}</td>
                <td class="part-price-cell" data-label="Rigs from">$${cheapest.toLocaleString('en-US')}</td>
              </tr>`;
    }).join('');

    return `
      <section class="builds-index-group" aria-labelledby="builds-group-${gi}">
        <h3 id="builds-group-${gi}">${g.title}</h3>
        <p>${g.blurb}${sharedRig ? ' These models share the same three hardware tiers; they differ in quantization, context cost and speed.' : ''}</p>
        <div class="parts-table-wrap">
          <table class="parts-table stack-table">
            <thead>
              <tr>
                <th scope="col" style="width: 30%;">Model</th>
                <th scope="col">VRAM Target</th>
                <th scope="col">Sweet Spot Quant</th>
                <th scope="col">Speed on Dual 3090</th>
                <th scope="col">Rigs From</th>
              </tr>
            </thead>
            <tbody>${rows}
            </tbody>
          </table>
        </div>
      </section>`;
  }).join('');

  return `
    <div class="builds-index">
      <nav class="breadcrumbs" aria-label="Breadcrumb">
        <ol>
          <li><a href="/">Home</a></li>
          <li aria-current="page">Build Sheets</li>
        </ol>
      </nav>
      <div class="tracker-header-row">
        <div class="tracker-title">
          <h2>Local AI Build Sheets for ${models.length} Models</h2>
          <p>Each build sheet has three verified rigs: <strong>Budget Used</strong>, <strong>Balanced</strong> and <strong>Best New</strong>, with full parts lists, power draw and first-year cost. Pick the model you want to run.</p>
        </div>
        <a href="/calculator" class="btn-secondary">⚡ Compare against cloud rental →</a>
      </div>
      ${groupHtml}
    </div>
  `;
}

export function createBuildsIndex(container) {
  container.innerHTML = renderBuildsIndexHtml();
}
