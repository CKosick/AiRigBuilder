// scripts/apply_prices.js
// Applies approved prices from data/pending_price_review.json to src/data/gpus.js and src/data/builds.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { recordMonthlyPrice } from '../src/utils/priceHistory.js';
import { computePriceTrends } from '../src/utils/priceTrends.js';
import { selectApplicable } from './price_review.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const REVIEW_FILE = path.join(ROOT_DIR, 'data', 'pending_price_review.json');
const GPUS_FILE = path.join(ROOT_DIR, 'src', 'data', 'gpus.js');
const BUILDS_FILE = path.join(ROOT_DIR, 'src', 'data', 'builds.js');
const AUDIT_LOG_FILE = path.join(ROOT_DIR, 'data', 'price_history_log.json');

async function applyPrices() {
  console.log('====================================================');
  console.log('🚀 AI RIG BUILDER — APPLYING REVIEWED GPU PRICES');
  console.log('====================================================');

  if (!fs.existsSync(REVIEW_FILE)) {
    console.error(`❌ Review file not found: ${REVIEW_FILE}`);
    console.error('Run `npm run prices:fetch` first to generate a review file.');
    process.exit(1);
  }

  const reviewData = JSON.parse(fs.readFileSync(REVIEW_FILE, 'utf-8'));

  // 1. Current data, then only the cards that are safe to apply (see selectApplicable)
  const { GPUS_DATA } = await import(`file://${GPUS_FILE}?update=${Date.now()}`);
  const { apply: approvedCards, held } = selectApplicable(reviewData.cards, GPUS_DATA);
  const heldCards = held.map(h => h.card);

  if (held.length > 0) {
    console.log(`Holding ${held.length} card(s); they keep their current price:`);
    held.forEach(h => console.log(`  ⏸️ ${h.card.name}: ${h.reason}`));
  }
  if (approvedCards.length === 0) {
    console.warn('⚠️ No approved cards to apply.');
    process.exit(0);
  }
  console.log(`Applying ${approvedCards.length} approved GPU price update(s)...`);

  const currentDateLabel = new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }); // e.g. "Oct 2026"
  const appliedSummary = [];

  // Update in-memory objects
  GPUS_DATA.forEach(gpu => {
    const update = approvedCards.find(c => c.id === gpu.id);
    if (!update) return;

    const oldPrice = gpu.usedStreetPrice;
    const newPrice = update.proposedPrice;
    const diff = newPrice - oldPrice;

    gpu.usedStreetPrice = newPrice;
    gpu.usedPriceLow = update.priceLow;
    gpu.usedPriceHigh = update.priceHigh;
    gpu.pricePerGb = parseFloat((newPrice / gpu.vram).toFixed(2));

    // One history point per month: update this month's point, or start a new one
    gpu.history = recordMonthlyPrice(gpu.history || [], newPrice);

    appliedSummary.push({
      id: gpu.id,
      name: gpu.name,
      oldPrice,
      newPrice,
      diff,
      pricePerGb: gpu.pricePerGb
    });
  });

  // Add this run to the audit log, then recompute every GPU's 7d/30d trend from it
  // (null when the log has no price from about that long ago)
  const updatedAt = new Date().toISOString();
  let auditLogs = [];
  if (fs.existsSync(AUDIT_LOG_FILE)) {
    try {
      auditLogs = JSON.parse(fs.readFileSync(AUDIT_LOG_FILE, 'utf-8'));
    } catch (_) {}
  }
  auditLogs.push({
    appliedAt: updatedAt,
    updates: appliedSummary
  });
  GPUS_DATA.forEach(gpu => {
    Object.assign(gpu, computePriceTrends(auditLogs, gpu.id, gpu.usedStreetPrice));
  });

  // Write updated gpus.js
  const updatedGpusCode = `// The 10 GPUs that matter for local AI, with used prices estimated from current eBay listings\n// Last updated: ${updatedAt}\nexport const GPUS_UPDATED_AT = '${updatedAt}';\nexport const GPUS_DATA = ${JSON.stringify(GPUS_DATA, null, 2)};\n`;
  fs.writeFileSync(GPUS_FILE, updatedGpusCode, 'utf-8');
  console.log(`✓ Updated: ${GPUS_FILE}`);

  // 2. Update builds.js if 3090, 4090, or 3060 prices changed
  const rtx3090 = approvedCards.find(c => c.id === 'rtx-3090');
  const rtx4090 = approvedCards.find(c => c.id === 'rtx-4090');
  const rtx3060 = approvedCards.find(c => c.id === 'rtx-3060-12gb');
  const rtx4060ti = approvedCards.find(c => c.id === 'rtx-4060-ti-16gb');

  let buildsContent = fs.readFileSync(BUILDS_FILE, 'utf-8');
  let buildsUpdated = false;

  if (rtx3090) {
    // Dual 3090 price = 2x single price
    const dual3090Price = rtx3090.proposedPrice * 2;
    // Replace dual 3090 prices and update comment in builds
    buildsContent = buildsContent.replace(
      /(name:\s*'2x NVIDIA GeForce RTX 3090 24GB'[\s\S]*?price:\s*)\d+(\s*,\s*\/\/\s*2x\s*\$)\d+/g,
      `$1${dual3090Price}$2${rtx3090.proposedPrice}`
    );
    buildsContent = buildsContent.replace(
      /(name:\s*'2x NVIDIA GeForce RTX 3090 24GB'[\s\S]*?price:\s*)\d+/g,
      `$1${dual3090Price}`
    );
    // Replace single 3090 price
    buildsContent = buildsContent.replace(
      /(name:\s*'1x NVIDIA GeForce RTX 3090 24GB'[\s\S]*?price:\s*)\d+/g,
      `$1${rtx3090.proposedPrice}`
    );
    buildsUpdated = true;
  }

  if (rtx3060) {
    buildsContent = buildsContent.replace(
      /(name:\s*'NVIDIA GeForce RTX 3060 12GB'[\s\S]*?price:\s*)\d+/g,
      `$1${rtx3060.proposedPrice}`
    );
    buildsUpdated = true;
  }

  if (buildsUpdated) {
    fs.writeFileSync(BUILDS_FILE, buildsContent, 'utf-8');
    console.log(`✓ Synced dependent GPU prices in: ${BUILDS_FILE}`);
  }

  // 3. Save the audit log (this run was added above)
  fs.writeFileSync(AUDIT_LOG_FILE, JSON.stringify(auditLogs, null, 2), 'utf-8');
  console.log(`✓ Audit log saved to: ${AUDIT_LOG_FILE}`);

  // 4. Update pending review file
  reviewData.reviewStatus = heldCards.length > 0 ? 'PARTIALLY_APPLIED' : 'APPLIED';
  reviewData.appliedAt = new Date().toISOString();
  reviewData.appliedCards = appliedSummary;
  fs.writeFileSync(REVIEW_FILE, JSON.stringify(reviewData, null, 2), 'utf-8');

  // Also update markdown review file
  const mdReviewPath = path.join(ROOT_DIR, 'PENDING_PRICE_REVIEW.md');
  if (fs.existsSync(mdReviewPath)) {
    const md = fs.readFileSync(mdReviewPath, 'utf-8');
    const status = heldCards.length > 0
      ? `> **Applied:** ${approvedCards.length} card(s). **Held:** ${held.map(h => `${h.card.name} (${h.reason})`).join('; ')}.`
      : `> **Applied:** all ${approvedCards.length} cards.`;
    // Insert the status under the title line
    const [title, ...rest] = md.split('\n');
    fs.writeFileSync(mdReviewPath, [title, '', status, ...rest].join('\n'), 'utf-8');
  }

  // 5. Price-drop alerts are not sent here: these prices are not live until they are reviewed,
  // merged and deployed. Alerts go out after deploy (or run `npm run alerts:check` by hand).

  // 6. Build validation
  console.log('\nValidating build with `npm run build`...');
  try {
    execSync('npm run build', { cwd: ROOT_DIR, stdio: 'inherit' });
    console.log('✓ Build successful!');
  } catch (err) {
    console.error('❌ Build failed after price update. Please check files.');
    process.exit(1);
  }

  console.log('\n====================================================');
  console.log('🎉 PRICE UPDATE SUCCESSFULLY APPLIED!');
  console.log('====================================================');
  console.table(appliedSummary.map(s => ({
    GPU: s.name,
    'Old Price': `$${s.oldPrice}`,
    'New Price': `$${s.newPrice}`,
    Change: s.diff >= 0 ? `+$${s.diff}` : `-$${Math.abs(s.diff)}`,
    '$/GB VRAM': `$${s.pricePerGb.toFixed(2)}`
  })));
  console.log('\nYou can now commit and push the updated prices:');
  console.log('git add . && git commit -m "chore: weekly used GPU price update" && git push\n');
}

applyPrices();
