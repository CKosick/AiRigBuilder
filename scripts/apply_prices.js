// scripts/apply_prices.js
// Applies approved prices from data/pending_price_review.json to src/data/gpus.js and src/data/builds.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

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
  const approvedCards = reviewData.cards.filter(c => c.status === 'APPROVED');
  const heldCards = reviewData.cards.filter(c => c.status !== 'APPROVED');

  if (approvedCards.length === 0) {
    console.warn('⚠️ No approved cards to apply.');
    process.exit(0);
  }

  console.log(`Processing ${approvedCards.length} approved GPU price updates (${heldCards.length} held for user review)...`);
  if (heldCards.length > 0) {
    console.log(`Holding ${heldCards.length} flagged GPUs for user review:`);
    heldCards.forEach(c => console.log(`  ⏸️ ${c.name} (Status: ${c.status}, Proposed: $${c.proposedPrice})`));
  }

  // 1. Read existing GPUS_DATA
  const gpusContent = fs.readFileSync(GPUS_FILE, 'utf-8');

  // We will dynamically import the current data
  const { GPUS_DATA } = await import(`file://${GPUS_FILE}?update=${Date.now()}`);

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
    gpu.trend7d = update.trend7d;
    gpu.pricePerGb = parseFloat((newPrice / gpu.vram).toFixed(2));

    // Update history array:
    // If the last entry is "Current", update its price.
    // If the last entry has a date label, ensure we have the latest entry recorded.
    if (gpu.history && gpu.history.length > 0) {
      const last = gpu.history[gpu.history.length - 1];
      if (last.date === 'Current') {
        last.price = newPrice;
      } else {
        gpu.history.push({ date: 'Current', price: newPrice });
      }
    }

    appliedSummary.push({
      id: gpu.id,
      name: gpu.name,
      oldPrice,
      newPrice,
      diff,
      pricePerGb: gpu.pricePerGb
    });
  });

  // Write updated gpus.js
  const updatedGpusCode = `// The 10 GPUs that matter for local AI with real used/street market pricing (eBay sold listings baseline)\n// Last updated: ${new Date().toISOString()}\nexport const GPUS_DATA = ${JSON.stringify(GPUS_DATA, null, 2)};\n`;
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
    // Replace dual 3090 prices in builds
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

  // 3. Append to audit log
  let auditLogs = [];
  if (fs.existsSync(AUDIT_LOG_FILE)) {
    try {
      auditLogs = JSON.parse(fs.readFileSync(AUDIT_LOG_FILE, 'utf-8'));
    } catch (_) {}
  }

  auditLogs.push({
    appliedAt: new Date().toISOString(),
    updates: appliedSummary
  });
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
    let md = fs.readFileSync(mdReviewPath, 'utf-8');
    if (heldCards.length > 0) {
      md = md.replace('> **MANUAL REVIEW STEP**', `> ⚠️ **STATUS: PARTIALLY APPLIED** (${approvedCards.length} approved GPU prices applied to production codebase, ${heldCards.length} flagged GPUs held on hold for review)`);
    } else {
      md = md.replace('> **MANUAL REVIEW STEP**', '> ✅ **STATUS: APPLIED TO PRODUCTION CODEBASE**');
    }
    fs.writeFileSync(mdReviewPath, md, 'utf-8');
  }

  // 5. Build validation
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
