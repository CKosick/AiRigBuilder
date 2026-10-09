// Home page first screen: answers "what's the cheapest way to run a 70B model at home?" outright,
// with every number taken from the data files (see src/utils/siteFacts.js).
import { GPUS_UPDATED_AT } from '../data/gpus.js';
import { MODELS_DATA } from '../data/models.js';
import { siteFacts, usd } from '../utils/siteFacts.js';
import { DEFAULT_MODEL_ID } from '../routes.js';

const formatDate = (iso) => new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });

export function renderHomeHeroHtml() {
  const { dual3090RigEst, payoffMonths4h, runpodDual3090 } = siteFacts();
  const model = MODELS_DATA.find(m => m.id === DEFAULT_MODEL_ID);
  // The model card below the hero quotes this same figure, e.g. '17 - 21 tokens/sec (exllamav2 / llama.cpp)'
  const speed = model.typicalSpeedDual3090.replace(/\s*\(.*\)$/, '').replace(' - ', '–');

  return `
    <section class="hero-banner" aria-labelledby="hero-answer">
      <div class="hero-card">
        <h1 class="hero-answer" id="hero-answer"><span class="hero-question">What's the cheapest way to run a 70B model at home?</span> Two used RTX 3090s: <span class="hero-highlight">about ${usd(dual3090RigEst)}</span> for the whole PC.</h1>
        <ul class="hero-facts">
          <li><strong>48 GB</strong> of VRAM across both cards</li>
          <li><strong>${speed}</strong> on ${model.name} at ${model.sweetSpotQuant}</li>
          <li><strong>~${payoffMonths4h} months</strong> to pay for itself vs RunPod ($${runpodDual3090.hourlyRate.toFixed(2)}/hr) at 4 hrs a day</li>
        </ul>
        <div class="hero-actions">
          <a class="btn-primary" href="#parts-list">See the parts list ↓</a>
          <a class="btn-secondary" href="/calculator">Compare with cloud rental →</a>
        </div>
        <p class="hero-note">Used prices from eBay sold listings, last updated ${formatDate(GPUS_UPDATED_AT)}.</p>
      </div>
    </section>
  `;
}
