# AI Rig Builder (`airigbuilder.com`)

> **The used-hardware price layer for local AI.**  
> Answers: *"What's the cheapest way to run a 70B model at home?"* with real used-market street prices, true total-build cost (parts + tax + power), and the cloud break-even ROI.

---

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Run local development server
npm run dev

# 3. Build optimized production distribution
npm run build
```

---

## 🌟 Core Modules

1. **Model Picker → 3-Tier Build Sheets (`src/components/modelPicker.js`)**
   - 5 flagship models: Llama 3.3 70B, DeepSeek-R1-Distill-70B, Qwen 2.5 72B, Mistral NeMo 12B/24B, Llama 3.1 8B.
   - 3 verified tiers per model:
     - **Budget Used** (Dual used RTX 3090 24GB @ ~$695 each, AM4 platform → ~$1,780 total)
     - **Balanced New/Used Mix** (AM5 Ryzen 7000, ASUS ProArt X670E, DDR5-6000 → ~$2,850 total)
     - **Best New / Turnkey** (Apple Mac Studio M2 Ultra Unified Memory or Blackwell single GPU)
   - Real-time **True 1st-Year Total Cost** engine factoring in user-customized sales tax and daily electricity draw ($/kWh).
   - One-click copy for Reddit r/LocalLLaMA markdown formatting.

2. **Cloud Break-Even Calculator (`src/components/breakEvenCalc.js`)**
   - The traffic and backlink engine.
   - Live comparisons against RunPod ($0.88/hr) and Vast.ai ($0.72/hr).
   - Interactive 24-month cumulative cost projection chart with Chart.js showing exact payoff month and 2-year net savings.

3. **Used GPU Price Tracker (`src/components/priceTracker.js`)**
   - The SEO moat tracking street prices for the 10 GPUs that matter for local AI.
   - Sorted by **Price per GB of VRAM ($/GB)**.
   - Interactive 6-month historical price charts and email alert capture for price drops.

4. **Hardware Guide & Architecture Gotchas (`src/components/hardwareGuide.js`)**
   - Solutions for Ampere transient power spikes, ATX 3.0 requirements, motherboard slot spacing, PCIe x4 inference viability, and VRAM calculation formulas.

---

## 📈 Updating Used GPU Prices (Weekly Workflow)

Used GPU street prices are maintained in [`src/data/gpus.js`](file:///c:/Users/Cliff/Documents/AiRigBuilder/src/data/gpus.js).

To update prices weekly:
1. Open the verified eBay sold listings link for each card (links are embedded in `gpus.js`).
2. Update `usedStreetPrice`, `usedPriceLow`, `usedPriceHigh`, and `trend7d`.
3. Add the latest month's price to the `history` array.
4. Run `npm run build` and deploy.

---

## 🌐 Deployment to Vercel

```bash
# Push to GitHub
git init
git add .
git commit -m "feat: airigbuilder initial release"
gh repo create airigbuilder --public --source=. --push
```

- Connect repo on [Vercel](https://vercel.com)
- Custom domain: set up `airigbuilder.com` and point Porkbun DNS CNAME records to `cname.vercel-dns.com`.
