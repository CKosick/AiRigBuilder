// Build sheets per model for AI Rig Builder
// Each model has 3 tiers: Budget Used, Balanced Mix, Best New

export const BUILDS_DATA = {
  // -------------------------------------------------------------
  // 1. LLAMA 3.3 70B
  // -------------------------------------------------------------
  'llama-3.3-70b': {
    modelId: 'llama-3.3-70b',
    title: 'Llama 3.3 70B Inference Rigs',
    vramTarget: '48 GB VRAM (Dual GPU)',
    quantTarget: 'Q4_K_M (42 GB VRAM footprint)',
    speedTarget: '17 - 22 tokens/second',
    tiers: [
      {
        id: 'tier-budget-used',
        name: 'Budget Used Dual-3090',
        badge: 'Community Gold Standard',
        type: 'used',
        accentColor: '#10b981', // emerald
        headline: 'Cheapest way to run full 70B locally at ~20 tokens/sec',
        rigSummary: 'Dual used RTX 3090 24GB cards on an enterprise AM4/X570 platform. Delivers 48GB VRAM with NVLink support for under $1,800 total.',
        estimatedTdpWatts: 820,
        parts: [
          {
            category: 'GPU (Primary + Secondary)',
            name: '2x NVIDIA GeForce RTX 3090 24GB',
            spec: '48GB Total GDDR6X, 936 GB/s, NVLink compatible',
            condition: 'Used (eBay Sold)',
            price: 1436, // 2x $718
            merchant: 'eBay Sold',
            url: 'https://www.ebay.com/sch/i.html?_nkw=RTX+3090+24GB&LH_Sold=1&LH_Complete=1',
            notes: 'Look for Founder Edition or EVGA FTW3. Dual 24GB fits Q4_K_M with 16k context comfortably.'
          },
          {
            category: 'CPU',
            name: 'AMD Ryzen 7 5700X (8C / 16T)',
            spec: '65W TDP, 3.4GHz base / 4.6GHz boost, PCIe 4.0',
            condition: 'New (Amazon)',
            price: 155,
            merchant: 'Amazon',
            url: 'https://www.amazon.com/s?k=Ryzen+7+5700X',
            notes: 'Low power draw leaves maximum PSU headroom for GPU transient power spikes.'
          },
          {
            category: 'Motherboard',
            name: 'ASUS ROG Strix B550-F Gaming (WiFi)',
            spec: 'Supports dual full-length PCIe slots with 3-slot spacing',
            condition: 'Used / Refurb',
            price: 110,
            merchant: 'eBay / Amazon',
            url: 'https://www.amazon.com/s?k=B550+motherboard+dual+gpu+spacing',
            notes: 'Crucial: Slot 1 is x16 (PCIe 4.0), bottom slot is x4. For pure inference, x4 PCIe 3.0 has <3% token throughput loss.'
          },
          {
            category: 'RAM',
            name: 'Corsair Vengeance LPX 64GB (2x32GB) DDR4-3200',
            spec: '64GB DDR4 dual channel',
            condition: 'New (Amazon)',
            price: 98,
            merchant: 'Amazon',
            url: 'https://www.amazon.com/s?k=64GB+DDR4+3200',
            notes: '64GB system RAM allows full model loading into system memory before GPU allocation without crashing.'
          },
          {
            category: 'Power Supply (PSU)',
            name: 'EVGA SuperNOVA 1000 G6 (or Corsair RM1000e 1000W 80+ Gold)',
            spec: '1000W 80+ Gold, 4-6 dedicated 8-pin PCIe cables',
            condition: 'New (Amazon / B&H)',
            price: 159,
            merchant: 'Amazon / B&H',
            url: 'https://www.amazon.com/s?k=1000W+power+supply+80+gold',
            notes: 'CRITICAL: Do NOT daisy-chain PCIe cables. Use 4 discrete 8-pin power cables to avoid 3090 transient cutoffs.'
          },
          {
            category: 'Storage (SSD)',
            name: 'Crucial P3 Plus 2TB NVMe M.2 SSD',
            spec: 'Up to 5000 MB/s read, PCIe 4.0',
            condition: 'New (Amazon)',
            price: 115,
            merchant: 'Amazon',
            url: 'https://www.amazon.com/s?k=2TB+NVMe+M.2+SSD',
            notes: '70B model files are 40GB-45GB each. 2TB holds OS + 20+ quantized models and weights.'
          },
          {
            category: 'Case & Spacing',
            name: 'Fractal Design Meshify 2 or Phanteks Enthoo Pro 2',
            spec: 'Spacious full tower, support for multi-GPU & 3-slot cards',
            condition: 'New (Amazon)',
            price: 139,
            merchant: 'Amazon',
            url: 'https://www.amazon.com/s?k=Fractal+Design+Meshify+2',
            notes: 'High airflow mesh front panel keeps both 3090s below 74°C during sustained generation.'
          },
          {
            category: 'Cooling & Accessories',
            name: 'Thermalright Peerless Assassin 120 SE + PCIe 4.0 Riser cable',
            spec: 'Dual-tower CPU cooler + 20cm x16 shielded riser',
            condition: 'New (Amazon)',
            price: 58,
            merchant: 'Amazon',
            url: 'https://www.amazon.com/s?k=Thermalright+Peerless+Assassin+120',
            notes: 'Riser allows vertical or lower offset mounting for card 2 if slot spacing on motherboard is tight.'
          }
        ]
      },
      {
        id: 'tier-balanced-mix',
        name: 'Balanced AM5 Dual-3090 / Workstation',
        badge: 'Best Stability & Upgradability',
        type: 'balanced',
        accentColor: '#3b82f6', // blue
        headline: 'Modern AM5 platform with DDR5 + 2x used 3090s & true x8/x8 PCIe lanes',
        rigSummary: 'Pair 2x used RTX 3090s with a modern AMD Ryzen 7000 AM5 motherboard featuring native x8/x8 PCIe lane bifurcation and ATX 3.0 1200W power supply.',
        estimatedTdpWatts: 860,
        parts: [
          {
            category: 'GPU (Primary + Secondary)',
            name: '2x NVIDIA GeForce RTX 3090 24GB',
            spec: '48GB Total GDDR6X, 936 GB/s',
            condition: 'Used (eBay Sold)',
            price: 1436,
            merchant: 'eBay Sold',
            url: 'https://www.ebay.com/sch/i.html?_nkw=RTX+3090+24GB&LH_Sold=1&LH_Complete=1',
            notes: 'Proven price-to-VRAM sweet spot.'
          },
          {
            category: 'CPU',
            name: 'AMD Ryzen 7 7700X (8C / 16T, AM5)',
            spec: '105W TDP, 4.5GHz base / 5.4GHz boost, PCIe 5.0 lanes',
            condition: 'New (Amazon)',
            price: 289,
            merchant: 'Amazon',
            url: 'https://www.amazon.com/s?k=Ryzen+7+7700X',
            notes: 'Fast prompt ingestion and tensor preparation.'
          },
          {
            category: 'Motherboard',
            name: 'ASUS ProArt X670E-Creator WiFi',
            spec: 'Dual PCIe 5.0 x16 slots supporting x8/x8 bifurcation with 3-slot gap',
            condition: 'New (Amazon / B&H)',
            price: 439,
            merchant: 'B&H / Amazon',
            url: 'https://www.amazon.com/s?k=ASUS+ProArt+X670E-Creator+WiFi',
            notes: 'The holy grail dual-GPU motherboard. Has perfect 3-slot spacing so both thick cards click directly into the board without risers.'
          },
          {
            category: 'RAM',
            name: 'G.Skill Flare X5 64GB (2x32GB) DDR5-6000 CL30',
            spec: 'DDR5-6000 low latency',
            condition: 'New (Amazon)',
            price: 189,
            merchant: 'Amazon',
            url: 'https://www.amazon.com/s?k=64GB+DDR5+6000+CL30',
            notes: 'Fast memory bandwidth speeds up CPU-offloaded layers if testing 120B+ models.'
          },
          {
            category: 'Power Supply (PSU)',
            name: 'Corsair RM1200x Shift 1200W 80+ Gold (ATX 3.0)',
            spec: '1200W ATX 3.0 / PCIe 5.0 compliant, side modular ports',
            condition: 'New (Amazon / B&H)',
            price: 219,
            merchant: 'Amazon / B&H',
            url: 'https://www.amazon.com/s?k=Corsair+RM1200x+Shift+1200W',
            notes: 'Handles 1500W transient spikes effortlessly with ATX 3.0 certified voltage smoothing.'
          },
          {
            category: 'Storage (SSD)',
            name: 'Samsung 990 Pro 2TB NVMe PCIe 4.0',
            spec: 'Up to 7450 MB/s read speed',
            condition: 'New (Amazon)',
            price: 169,
            merchant: 'Amazon',
            url: 'https://www.amazon.com/s?k=Samsung+990+Pro+2TB',
            notes: 'Lightning-fast weights load time: loads 42GB model into VRAM in ~8 seconds.'
          },
          {
            category: 'Case',
            name: 'Lian Li O11 Dynamic EVO XL',
            spec: 'Massive dual-chamber airflow chassis with multi-GPU clearance',
            condition: 'New (Amazon)',
            price: 229,
            merchant: 'Amazon',
            url: 'https://www.amazon.com/s?k=Lian+Li+O11+Dynamic+EVO+XL',
            notes: 'Houses two triple-slot cards with bottom intake fans blowing cool room air directly onto GPU intakes.'
          },
          {
            category: 'Cooling & Fans',
            name: 'Arctic Liquid Freezer III 360 AIO + 3x P12 PWM Max Fans',
            spec: '360mm AIO water cooler + high static pressure fans',
            condition: 'New (Amazon)',
            price: 119,
            merchant: 'Amazon',
            url: 'https://www.amazon.com/s?k=Arctic+Liquid+Freezer+III+360',
            notes: 'Keeps CPU whisper silent while leaving full airflow channel open for GPUs.'
          }
        ]
      },
      {
        id: 'tier-best-new',
        name: 'Best New / Turnkey Unified (Apple Mac Studio / RTX 5090 Path)',
        badge: 'Zero Cable Friction / Whisper Silent',
        type: 'new',
        accentColor: '#8b5cf6', // purple
        headline: 'Mac Studio M2 Ultra (64GB/128GB) or New Ada/Blackwell Turnkey',
        rigSummary: 'Apple Mac Studio M2 Ultra with 64GB-128GB unified memory or a single next-gen 32GB+ flagship GPU with CPU offload. Zero multi-GPU cabling, 140W whisper-quiet power draw.',
        estimatedTdpWatts: 160,
        parts: [
          {
            category: 'Compute Unit',
            name: 'Apple Mac Studio M2 Ultra (24-Core CPU, 60-Core GPU)',
            spec: '64GB Unified Memory (800 GB/s bandwidth) or 128GB option',
            condition: 'Certified Refurbished / New (Apple / B&H)',
            price: 2899,
            merchant: 'B&H / Apple',
            url: 'https://www.bhphotovideo.com/c/search?Ntt=Mac+Studio+M2+Ultra',
            notes: 'Unified memory allows allocating 56GB+ directly to Metal/MLX. Fits 70B at Q4_K_M or Q5_K_M completely in VRAM.'
          },
          {
            category: 'Internal Storage',
            name: '1TB Ultra-Fast Internal SSD (7.4 GB/s)',
            spec: 'Integrated with SOC',
            condition: 'Included',
            price: 0,
            merchant: 'Included',
            url: '#',
            notes: 'Included in base configuration.'
          },
          {
            category: 'External Fast Model Storage',
            name: 'SanDisk Professional PRO-BLADE 2TB NVMe Thunderbolt 3 (40Gbps)',
            spec: 'Up to 2800 MB/s sustained external model storage',
            condition: 'New (Amazon / B&H)',
            price: 219,
            merchant: 'Amazon / B&H',
            url: 'https://www.amazon.com/s?k=Thunderbolt+SSD+2TB',
            notes: 'Store your entire HuggingFace / GGUF model library without filling internal storage.'
          },
          {
            category: 'Power & Acoustics',
            name: 'Internal 370W Silent Power Supply',
            spec: 'Integrated, idle ~18W, full 70B inference load ~135W',
            condition: 'Included',
            price: 0,
            merchant: 'Included',
            url: '#',
            notes: 'Draws only 135W under full generation. Electricity cost is less than $5/month even running 8 hrs/day.'
          }
        ]
      }
    ]
  },

  // -------------------------------------------------------------
  // 2. DEEPSEEK-R1-70B
  // -------------------------------------------------------------
  'deepseek-r1-70b': {
    modelId: 'deepseek-r1-70b',
    title: 'DeepSeek-R1-Distill-Llama-70B Inference Rigs',
    vramTarget: '48 GB VRAM (Dual GPU)',
    quantTarget: 'Q4_K_M or EXL2 4.25bpw',
    speedTarget: '18 - 23 tokens/second',
    tiers: [
      {
        id: 'tier-budget-used',
        name: 'Budget Used Dual-3090 Reasoning Rig',
        badge: 'Best Value for DeepSeek R1',
        type: 'used',
        accentColor: '#10b981',
        headline: 'Uncompromising chain-of-thought speed for under $1,800',
        rigSummary: 'Dual used RTX 3090s running exllamav2 or vLLM. Retains near 100% of o1-level reasoning performance with 48GB VRAM headroom for extended scratchpads.',
        estimatedTdpWatts: 820,
        parts: [
          {
            category: 'GPU (Primary + Secondary)',
            name: '2x NVIDIA GeForce RTX 3090 24GB',
            spec: '48GB GDDR6X, 936 GB/s bandwidth',
            condition: 'Used (eBay Sold)',
            price: 1436,
            merchant: 'eBay Sold',
            url: 'https://www.ebay.com/sch/i.html?_nkw=RTX+3090+24GB&LH_Sold=1&LH_Complete=1',
            notes: 'Exllamav2 4.0bpw runs at ~22 tok/s with 16k context for long reasoning traces.'
          },
          {
            category: 'CPU',
            name: 'AMD Ryzen 7 5700X (8C / 16T)',
            spec: '3.4GHz base / 4.6GHz boost, 65W TDP',
            condition: 'New (Amazon)',
            price: 155,
            merchant: 'Amazon',
            url: 'https://www.amazon.com/s?k=Ryzen+7+5700X',
            notes: 'Solid baseline CPU for batch scheduling.'
          },
          {
            category: 'Motherboard',
            name: 'MSI MPG B550 Gaming Plus',
            spec: 'Dual x16 PCIe physical slots, 3-slot spacing',
            condition: 'New (Amazon)',
            price: 129,
            merchant: 'Amazon',
            url: 'https://www.amazon.com/s?k=MSI+MPG+B550+Gaming+Plus',
            notes: 'Good VRM cooling and plenty of physical clearance between PCIe slots.'
          },
          {
            category: 'RAM',
            name: 'Teamgroup T-Create Expert 64GB (2x32GB) DDR4-3600',
            spec: '64GB DDR4 dual channel kit',
            condition: 'New (Amazon)',
            price: 105,
            merchant: 'Amazon',
            url: 'https://www.amazon.com/s?k=64GB+DDR4+3600',
            notes: 'High reliability RAM for long-running batch benchmarks.'
          },
          {
            category: 'Power Supply (PSU)',
            name: 'Montech TITAN GOLD 1000W 80+ Gold (ATX 3.0)',
            spec: '1000W fully modular ATX 3.0 with Japanese caps',
            condition: 'New (Amazon)',
            price: 139,
            merchant: 'Amazon',
            url: 'https://www.amazon.com/s?k=Montech+TITAN+GOLD+1000W',
            notes: 'Tier A rated on Cultists PSU tier list, suppresses 3090 transient surges.'
          },
          {
            category: 'Storage (SSD)',
            name: 'Crucial T500 2TB NVMe M.2 SSD',
            spec: 'Up to 7400 MB/s read speed',
            condition: 'New (Amazon)',
            price: 139,
            merchant: 'Amazon',
            url: 'https://www.amazon.com/s?k=Crucial+T500+2TB',
            notes: 'Loads DeepSeek R1 43GB weights into dual VRAM in under 10 seconds.'
          },
          {
            category: 'Case',
            name: 'Montech Air 903 Max',
            spec: 'High-airflow mesh front with 4x 140mm fans included',
            condition: 'New (Amazon)',
            price: 75,
            merchant: 'Amazon',
            url: 'https://www.amazon.com/s?k=Montech+Air+903+Max',
            notes: 'Unbeatable budget airflow case. Plenty of depth for 330mm long RTX 3090s.'
          },
          {
            category: 'Cooling & Accessories',
            name: 'Thermalright Phantom Spirit 120 SE',
            spec: '7 heatpipe dual-tower air cooler',
            condition: 'New (Amazon)',
            price: 36,
            merchant: 'Amazon',
            url: 'https://www.amazon.com/s?k=Thermalright+Phantom+Spirit+120+SE',
            notes: 'Cools 100W+ CPUs completely silently.'
          }
        ]
      },
      {
        id: 'tier-balanced-mix',
        name: 'Workstation Dual-A5000 / Dual-3090 AM5',
        badge: 'Maximum Reliability',
        type: 'balanced',
        accentColor: '#3b82f6',
        headline: 'Dual 24GB GPUs with true x8/x8 PCIe lanes and AM5 upgrade path',
        rigSummary: 'Clean dual GPU spacing with Ryzen 7 7700X and 1200W ATX 3.0 power supply. Ready for continuous 24/7 coding agent loops.',
        estimatedTdpWatts: 860,
        parts: [
          {
            category: 'GPU (Primary + Secondary)',
            name: '2x NVIDIA GeForce RTX 3090 24GB (or 2x RTX A5000)',
            spec: '48GB Total VRAM, 936 GB/s',
            condition: 'Used (eBay Sold)',
            price: 1390,
            merchant: 'eBay Sold',
            url: 'https://www.ebay.com/sch/i.html?_nkw=RTX+3090+24GB&LH_Sold=1&LH_Complete=1',
            notes: 'Fits DeepSeek-R1-70B Q4_K_M + 32K context window.'
          },
          {
            category: 'CPU',
            name: 'AMD Ryzen 7 7700X (8C / 16T)',
            spec: '5.4GHz boost, DDR5 support, PCIe 5.0',
            condition: 'New (Amazon)',
            price: 289,
            merchant: 'Amazon',
            url: 'https://www.amazon.com/s?k=Ryzen+7+7700X',
            notes: 'Fast prompt evaluation and tool-calling execution.'
          },
          {
            category: 'Motherboard',
            name: 'ASUS ProArt X670E-Creator WiFi',
            spec: 'x8/x8 PCIe 5.0 bifurcation with 3-slot spacing',
            condition: 'New (Amazon / B&H)',
            price: 439,
            merchant: 'B&H / Amazon',
            url: 'https://www.amazon.com/s?k=ASUS+ProArt+X670E-Creator+WiFi',
            notes: 'No risers required; cards mount directly with ample breathing gap.'
          },
          {
            category: 'RAM',
            name: 'Corsair Vengeance 64GB (2x32GB) DDR5-6000',
            spec: '64GB DDR5 CL30',
            condition: 'New (Amazon)',
            price: 185,
            merchant: 'Amazon',
            url: 'https://www.amazon.com/s?k=64GB+DDR5+6000',
            notes: 'High speed DDR5.'
          },
          {
            category: 'Power Supply (PSU)',
            name: 'be quiet! Dark Power 13 1000W 80+ Titanium (ATX 3.0)',
            spec: '1000W 80+ Titanium efficiency, ultra quiet',
            condition: 'New (Amazon / B&H)',
            price: 239,
            merchant: 'Amazon / B&H',
            url: 'https://www.amazon.com/s?k=be+quiet+Dark+Power+13+1000W',
            notes: 'Titanium efficiency saves ~5% power on long inference runs.'
          },
          {
            category: 'Storage (SSD)',
            name: 'Samsung 990 Pro 2TB NVMe SSD',
            spec: '7450 MB/s read',
            condition: 'New (Amazon)',
            price: 169,
            merchant: 'Amazon',
            url: 'https://www.amazon.com/s?k=Samsung+990+Pro+2TB',
            notes: 'Rapid checkpoint swapping.'
          },
          {
            category: 'Case',
            name: 'Fractal Torrent Black Solid',
            spec: 'Dedicated bottom intake 140mm fans aimed directly at GPUs',
            condition: 'New (Amazon)',
            price: 189,
            merchant: 'Amazon',
            url: 'https://www.amazon.com/s?k=Fractal+Torrent',
            notes: 'The highest air-velocity case on the market for multi-GPU setups.'
          },
          {
            category: 'Cooling',
            name: 'Thermalright Peerless Assassin 120 SE',
            spec: 'Dual tower air cooler',
            condition: 'New (Amazon)',
            price: 36,
            merchant: 'Amazon',
            url: 'https://www.amazon.com/s?k=Thermalright+Peerless+Assassin',
            notes: 'Leaves upper motherboard space open.'
          }
        ]
      },
      {
        id: 'tier-best-new',
        name: 'Apple Mac Studio M2 Ultra 128GB Unified',
        badge: 'Massive Context / Pure Silence',
        type: 'new',
        accentColor: '#8b5cf6',
        headline: 'Run DeepSeek-R1 at Q8 with 64K+ context without memory limits',
        rigSummary: 'Apple Mac Studio M2 Ultra with 128GB unified memory. Zero multi-GPU tensor-parallel sync latency, runs MLX natively with massive reasoning contexts.',
        estimatedTdpWatts: 150,
        parts: [
          {
            category: 'Compute Unit',
            name: 'Apple Mac Studio M2 Ultra (128GB Unified Memory)',
            spec: '24-core CPU, 60-core GPU, 800 GB/s bandwidth',
            condition: 'Refurbished / New (Apple / B&H)',
            price: 3599,
            merchant: 'B&H / Apple',
            url: 'https://www.bhphotovideo.com/c/search?Ntt=Mac+Studio+M2+Ultra+128GB',
            notes: 'Allocates ~100GB to GPU. Runs DeepSeek-R1 at Q8 (bit-exact math) with huge context.'
          },
          {
            category: 'Internal Storage',
            name: '1TB Ultra-Fast Internal NVMe (7.4 GB/s)',
            spec: 'Integrated SOC storage',
            condition: 'Included',
            price: 0,
            merchant: 'Included',
            url: '#',
            notes: 'Included in base model.'
          },
          {
            category: 'Power & Cooling',
            name: 'Integrated Ultra-Low Power Acoustic Subsystem',
            spec: '140W max power draw under full reasoning load',
            condition: 'Included',
            price: 0,
            merchant: 'Included',
            url: '#',
            notes: 'Inaudible fan noise, perfect for quiet home offices.'
          }
        ]
      }
    ]
  },

  // -------------------------------------------------------------
  // 3. QWEN 2.5 72B
  // -------------------------------------------------------------
  'qwen-2.5-72b': {
    modelId: 'qwen-2.5-72b',
    title: 'Qwen 2.5 72B Instruct Inference Rigs',
    vramTarget: '48 GB VRAM (Dual GPU)',
    quantTarget: 'Q4_K_M (44 GB VRAM footprint)',
    speedTarget: '16 - 20 tokens/second',
    tiers: [
      {
        id: 'tier-budget-used',
        name: 'Budget Used Dual-3090 Coding Rig',
        badge: 'Best for 128K Code Ingestion',
        type: 'used',
        accentColor: '#10b981',
        headline: 'Full 72B coding monster at home for ~$1,800',
        rigSummary: 'Dual used RTX 3090s providing 48GB VRAM. Handles full repositories and long coding generation in Cursor/Aider with local privacy.',
        estimatedTdpWatts: 820,
        parts: [
          {
            category: 'GPU (Primary + Secondary)',
            name: '2x NVIDIA GeForce RTX 3090 24GB',
            spec: '48GB GDDR6X, 936 GB/s',
            condition: 'Used (eBay Sold)',
            price: 1436,
            merchant: 'eBay Sold',
            url: 'https://www.ebay.com/sch/i.html?_nkw=RTX+3090+24GB&LH_Sold=1&LH_Complete=1',
            notes: 'Dual 3090s allow running Qwen 2.5 72B Q4_K_M at 17 tok/s.'
          },
          {
            category: 'CPU',
            name: 'AMD Ryzen 7 5700X (8C / 16T)',
            spec: '3.4GHz base / 4.6GHz boost, 65W TDP',
            condition: 'New (Amazon)',
            price: 155,
            merchant: 'Amazon',
            url: 'https://www.amazon.com/s?k=Ryzen+7+5700X',
            notes: 'Efficient host processor.'
          },
          {
            category: 'Motherboard',
            name: 'ASUS TUF Gaming B550-PLUS (WiFi II)',
            spec: '2x PCIe x16 slots, durable components',
            condition: 'New (Amazon)',
            price: 149,
            merchant: 'Amazon',
            url: 'https://www.amazon.com/s?k=ASUS+TUF+Gaming+B550-PLUS',
            notes: 'Generous slot layout for multi-GPU airflow.'
          },
          {
            category: 'RAM',
            name: 'Corsair Vengeance LPX 64GB (2x32GB) DDR4-3200',
            spec: '64GB DDR4 dual channel',
            condition: 'New (Amazon)',
            price: 98,
            merchant: 'Amazon',
            url: 'https://www.amazon.com/s?k=64GB+DDR4+3200',
            notes: 'Ample system memory for KV cache swapping.'
          },
          {
            category: 'Power Supply (PSU)',
            name: 'Corsair RM1000e (2023) 1000W 80+ Gold (ATX 3.0)',
            spec: '1000W fully modular, PCIe 5.0 ready',
            condition: 'New (Amazon / B&H)',
            price: 159,
            merchant: 'Amazon / B&H',
            url: 'https://www.amazon.com/s?k=Corsair+RM1000e+1000W',
            notes: 'Compact length (140mm) leaves plenty of room for case cable routing.'
          },
          {
            category: 'Storage (SSD)',
            name: 'Western Digital Black SN770 2TB NVMe M.2',
            spec: 'Up to 5150 MB/s read speed',
            condition: 'New (Amazon)',
            price: 119,
            merchant: 'Amazon',
            url: 'https://www.amazon.com/s?k=WD+Black+SN770+2TB',
            notes: 'DRAM-less HMB tech offers fantastic price-to-performance for sequential weights.'
          },
          {
            category: 'Case',
            name: 'Fractal Design Meshify 2 Lite',
            spec: 'High-airflow open layout with mesh front',
            condition: 'New (Amazon)',
            price: 109,
            merchant: 'Amazon',
            url: 'https://www.amazon.com/s?k=Fractal+Meshify+2+Lite',
            notes: 'Accommodates two full-length 3090s with front intake clearance.'
          },
          {
            category: 'Cooling & Accessories',
            name: 'Thermalright Peerless Assassin 120 SE',
            spec: 'Dual-tower CPU cooler',
            condition: 'New (Amazon)',
            price: 36,
            merchant: 'Amazon',
            url: 'https://www.amazon.com/s?k=Thermalright+Peerless+Assassin',
            notes: 'Keeps CPU frosty.'
          }
        ]
      },
      {
        id: 'tier-balanced-mix',
        name: 'Dual RTX 4090 / 3090 Hybrid AM5',
        badge: 'High Speed Hybrid',
        type: 'balanced',
        accentColor: '#3b82f6',
        headline: '1x RTX 4090 + 1x RTX 3090 (48GB total) or Dual 3090 AM5',
        rigSummary: 'Combines Ada compute speed with Ampere VRAM capacity on a PCIe 5.0 AM5 platform with 64GB DDR5 memory.',
        estimatedTdpWatts: 880,
        parts: [
          {
            category: 'GPU (Primary + Secondary)',
            name: '2x NVIDIA GeForce RTX 3090 24GB',
            spec: '48GB GDDR6X, 936 GB/s',
            condition: 'Used (eBay Sold)',
            price: 1436,
            merchant: 'eBay Sold',
            url: 'https://www.ebay.com/sch/i.html?_nkw=RTX+3090+24GB&LH_Sold=1&LH_Complete=1',
            notes: 'Dual 3090 setup.'
          },
          {
            category: 'CPU',
            name: 'AMD Ryzen 9 7900X (12C / 24T)',
            spec: '12-core Zen 4, 4.7GHz base / 5.6GHz boost',
            condition: 'New (Amazon)',
            price: 369,
            merchant: 'Amazon',
            url: 'https://www.amazon.com/s?k=Ryzen+9+7900X',
            notes: 'Extra CPU cores accelerate parallel compilation alongside local AI inference.'
          },
          {
            category: 'Motherboard',
            name: 'ASUS ProArt X670E-Creator WiFi',
            spec: 'Dual PCIe 5.0 x16 slots with x8/x8 bifurcation',
            condition: 'New (Amazon / B&H)',
            price: 439,
            merchant: 'B&H / Amazon',
            url: 'https://www.amazon.com/s?k=ASUS+ProArt+X670E-Creator+WiFi',
            notes: 'Direct 3-slot dual-GPU placement.'
          },
          {
            category: 'RAM',
            name: 'G.Skill Ripjaws S5 64GB (2x32GB) DDR5-6000',
            spec: '64GB DDR5 kit',
            condition: 'New (Amazon)',
            price: 179,
            merchant: 'Amazon',
            url: 'https://www.amazon.com/s?k=64GB+DDR5+6000',
            notes: 'Low profile heatspreaders ensure CPU cooler compatibility.'
          },
          {
            category: 'Power Supply (PSU)',
            name: 'Seasonic FOCUS GX-1000 ATX 3.0 1000W 80+ Gold',
            spec: '1000W fully modular with 12V-2x6 cable',
            condition: 'New (Amazon / B&H)',
            price: 179,
            merchant: 'Amazon / B&H',
            url: 'https://www.amazon.com/s?k=Seasonic+FOCUS+GX-1000+ATX+3.0',
            notes: '10-year warranty, industrial grade Japanese capacitors.'
          },
          {
            category: 'Storage (SSD)',
            name: 'Samsung 990 Pro 2TB NVMe SSD',
            spec: '7450 MB/s read speed',
            condition: 'New (Amazon)',
            price: 169,
            merchant: 'Amazon',
            url: 'https://www.amazon.com/s?k=Samsung+990+Pro+2TB',
            notes: 'Fast NVMe storage.'
          },
          {
            category: 'Case',
            name: 'Lian Li LANCOOL III RGB',
            spec: 'Full mesh chassis with hinged glass doors & 4x 140mm PWM fans',
            condition: 'New (Amazon)',
            price: 149,
            merchant: 'Amazon',
            url: 'https://www.amazon.com/s?k=Lian+Li+LANCOOL+III',
            notes: 'Side mesh shrouds vent GPU heat away immediately.'
          },
          {
            category: 'Cooling',
            name: 'Thermalright Phantom Spirit 120 SE',
            spec: 'High performance air cooler',
            condition: 'New (Amazon)',
            price: 36,
            merchant: 'Amazon',
            url: 'https://www.amazon.com/s?k=Thermalright+Phantom+Spirit',
            notes: 'Zero pump failure risk.'
          }
        ]
      },
      {
        id: 'tier-best-new',
        name: 'Mac Studio M2 Ultra (96GB / 128GB Unified)',
        badge: 'Zero Setup / Unified Memory',
        type: 'new',
        accentColor: '#8b5cf6',
        headline: 'Run Qwen 2.5 72B with 64K+ coding context seamlessly',
        rigSummary: 'Apple Mac Studio M2 Ultra with 96GB or 128GB unified memory. Zero multi-GPU cabling, 140W whisper-quiet power draw.',
        estimatedTdpWatts: 150,
        parts: [
          {
            category: 'Compute Unit',
            name: 'Apple Mac Studio M2 Ultra (24-core CPU, 60-core GPU, 96GB/128GB)',
            spec: 'Unified memory architecture, 800 GB/s bandwidth',
            condition: 'Certified Refurbished / New (Apple / B&H)',
            price: 3399,
            merchant: 'B&H / Apple',
            url: 'https://www.bhphotovideo.com/c/search?Ntt=Mac+Studio+M2+Ultra',
            notes: 'Fits Qwen 72B Q5_K_M or Q8 with gigantic context buffers.'
          },
          {
            category: 'Internal Storage',
            name: '1TB Ultra-Fast Internal SSD',
            spec: 'Included',
            condition: 'Included',
            price: 0,
            merchant: 'Included',
            url: '#',
            notes: 'Apple high speed unified bus.'
          },
          {
            category: 'Power & Acoustics',
            name: 'Integrated 370W Silent Power Supply',
            spec: 'Included',
            condition: 'Included',
            price: 0,
            merchant: 'Included',
            url: '#',
            notes: 'Runs under 150W total.'
          }
        ]
      }
    ]
  },

  // -------------------------------------------------------------
  // 4. MISTRAL NEMO 12B / SMALL 24B
  // -------------------------------------------------------------
  'mistral-nemo-12b': {
    modelId: 'mistral-nemo-12b',
    title: 'Mistral NeMo 12B / Small 24B Rigs',
    vramTarget: '16 - 24 GB VRAM (Single GPU)',
    quantTarget: 'Q8_0 or FP16 unquantized',
    speedTarget: '45 - 85 tokens/second',
    tiers: [
      {
        id: 'tier-budget-used',
        name: 'Budget Used Single RTX 3090 24GB',
        badge: 'Unquantized FP16 on Budget',
        type: 'used',
        accentColor: '#10b981',
        headline: 'Full unquantized FP16 weights for under $1,150 total build',
        rigSummary: 'Single used RTX 3090 24GB card with a budget AM4 platform. Delivers 24GB VRAM to run 12B-24B models with zero quantization loss at 50+ tokens/sec.',
        estimatedTdpWatts: 480,
        parts: [
          {
            category: 'GPU',
            name: '1x NVIDIA GeForce RTX 3090 24GB',
            spec: '24GB GDDR6X, 936 GB/s bandwidth',
            condition: 'Used (eBay Sold)',
            price: 718,
            merchant: 'eBay Sold',
            url: 'https://www.ebay.com/sch/i.html?_nkw=RTX+3090+24GB&LH_Sold=1&LH_Complete=1',
            notes: '24GB fits Mistral NeMo 12B at FP16 or Mistral Small 24B at Q5_K_M with 32K context.'
          },
          {
            category: 'CPU',
            name: 'AMD Ryzen 5 5600 (6C / 12T)',
            spec: '65W TDP, 3.5GHz base / 4.4GHz boost',
            condition: 'New (Amazon)',
            price: 125,
            merchant: 'Amazon',
            url: 'https://www.amazon.com/s?k=Ryzen+5+5600',
            notes: 'Plenty of performance for single-GPU inference.'
          },
          {
            category: 'Motherboard',
            name: 'Gigabyte B550M DS3H AC',
            spec: 'Micro-ATX with WiFi & PCIe 4.0 x16',
            condition: 'New (Amazon)',
            price: 89,
            merchant: 'Amazon',
            url: 'https://www.amazon.com/s?k=Gigabyte+B550M+DS3H',
            notes: 'Budget board with solid PCIe 4.0 slot support.'
          },
          {
            category: 'RAM',
            name: 'Silicon Power 32GB (2x16GB) DDR4-3200',
            spec: '32GB DDR4 kit',
            condition: 'New (Amazon)',
            price: 49,
            merchant: 'Amazon',
            url: 'https://www.amazon.com/s?k=32GB+DDR4+3200',
            notes: '32GB system memory easily handles 12B-24B models.'
          },
          {
            category: 'Power Supply (PSU)',
            name: 'Corsair RM750e 750W 80+ Gold (ATX 3.0)',
            spec: '750W fully modular ATX 3.0',
            condition: 'New (Amazon / B&H)',
            price: 99,
            merchant: 'Amazon / B&H',
            url: 'https://www.amazon.com/s?k=Corsair+RM750e+750W',
            notes: 'Provides ample headroom for a single 3090 (350W TDP).'
          },
          {
            category: 'Storage (SSD)',
            name: 'Teamgroup MP44L 1TB NVMe M.2 SSD',
            spec: 'Up to 5000 MB/s read speed',
            condition: 'New (Amazon)',
            price: 59,
            merchant: 'Amazon',
            url: 'https://www.amazon.com/s?k=Teamgroup+MP44L+1TB',
            notes: '1TB holds OS + dozens of 12B-24B model checkpoints.'
          },
          {
            category: 'Case',
            name: 'DeepCool CC560 V2 / Montech X3 Mesh',
            spec: 'Mid-tower with pre-installed fans',
            condition: 'New (Amazon)',
            price: 59,
            merchant: 'Amazon',
            url: 'https://www.amazon.com/s?k=Montech+X3+Mesh',
            notes: 'Good front mesh ventilation.'
          },
          {
            category: 'Cooling',
            name: 'Thermalright Assassin X 120 Refined SE',
            spec: 'Single tower CPU air cooler',
            condition: 'New (Amazon)',
            price: 18,
            merchant: 'Amazon',
            url: 'https://www.amazon.com/s?k=Thermalright+Assassin+X+120',
            notes: 'Silent budget cooler for 65W CPU.'
          }
        ]
      },
      {
        id: 'tier-balanced-mix',
        name: 'New RTX 4060 Ti 16GB Ultra-Efficient Rig',
        badge: 'Sub-250W Whisper Quiet',
        type: 'balanced',
        accentColor: '#3b82f6',
        headline: 'Modern Ada Lovelace 16GB rig with sub-250W power draw for under $980',
        rigSummary: 'Brand new RTX 4060 Ti 16GB with 165W TDP. Silent, brand-new components with 3-year warranties throughout.',
        estimatedTdpWatts: 240,
        parts: [
          {
            category: 'GPU',
            name: 'NVIDIA GeForce RTX 4060 Ti 16GB',
            spec: '16GB GDDR6, 165W TDP, Ada Lovelace',
            condition: 'New (Amazon / B&H)',
            price: 449,
            merchant: 'Amazon / B&H',
            url: 'https://www.amazon.com/s?k=RTX+4060+Ti+16GB',
            notes: '16GB VRAM runs Mistral NeMo at Q8_0 with 32K context with <165W power draw.'
          },
          {
            category: 'CPU',
            name: 'AMD Ryzen 5 7600 (6C / 12T, AM5)',
            spec: '65W TDP, Zen 4, DDR5 support',
            condition: 'New (Amazon)',
            price: 189,
            merchant: 'Amazon',
            url: 'https://www.amazon.com/s?k=Ryzen+5+7600',
            notes: 'Modern AM5 platform with long upgrade path.'
          },
          {
            category: 'Motherboard',
            name: 'ASRock B650M-HDV/M.2',
            spec: 'AM5 B650, PCIe 5.0 M.2 slot',
            condition: 'New (Amazon)',
            price: 109,
            merchant: 'Amazon',
            url: 'https://www.amazon.com/s?k=ASRock+B650M-HDV',
            notes: 'Award-winning budget AM5 motherboard with strong VRMs.'
          },
          {
            category: 'RAM',
            name: 'Crucial Pro 32GB (2x16GB) DDR5-5600',
            spec: '32GB DDR5 dual channel',
            condition: 'New (Amazon)',
            price: 79,
            merchant: 'Amazon',
            url: 'https://www.amazon.com/s?k=32GB+DDR5+5600',
            notes: 'Fast DDR5 system memory.'
          },
          {
            category: 'Power Supply (PSU)',
            name: 'Corsair CX650M 650W 80+ Bronze',
            spec: '650W semi-modular',
            condition: 'New (Amazon)',
            price: 69,
            merchant: 'Amazon',
            url: 'https://www.amazon.com/s?k=Corsair+CX650M+650W',
            notes: 'Massive safety margin for 240W total system load.'
          },
          {
            category: 'Storage (SSD)',
            name: 'Crucial P3 Plus 1TB NVMe M.2 SSD',
            spec: 'PCIe 4.0 up to 5000 MB/s',
            condition: 'New (Amazon)',
            price: 65,
            merchant: 'Amazon',
            url: 'https://www.amazon.com/s?k=Crucial+P3+Plus+1TB',
            notes: 'Fast boot and model storage.'
          },
          {
            category: 'Case',
            name: 'Montech AIR 100 ARGB Micro-ATX',
            spec: 'Mesh front with 4 fans included',
            condition: 'New (Amazon)',
            price: 59,
            merchant: 'Amazon',
            url: 'https://www.amazon.com/s?k=Montech+AIR+100',
            notes: 'Compact desk footprint.'
          },
          {
            category: 'Cooling',
            name: 'AMD Wraith Stealth (Included with CPU)',
            spec: 'Stock 65W cooler',
            condition: 'Included',
            price: 0,
            merchant: 'Included',
            url: '#',
            notes: 'Included in CPU retail box.'
          }
        ]
      },
      {
        id: 'tier-best-new',
        name: 'Single RTX 4090 24GB Blazing Speed Rig',
        badge: 'Top Token Velocity',
        type: 'new',
        accentColor: '#8b5cf6',
        headline: 'Maximum tok/s speed: 90+ tok/s on 12B-24B models',
        rigSummary: 'Single RTX 4090 24GB on AM5 platform. Top tier for real-time conversational streaming, coding autocomplete, and local fine-tuning.',
        estimatedTdpWatts: 580,
        parts: [
          {
            category: 'GPU',
            name: 'NVIDIA GeForce RTX 4090 24GB',
            spec: '24GB GDDR6X, 1008 GB/s bandwidth, Ada Lovelace',
            condition: 'New / Like-New',
            price: 1749,
            merchant: 'Amazon / B&H',
            url: 'https://www.amazon.com/s?k=RTX+4090+24GB',
            notes: 'Blistering 90+ tokens/sec stream rate on Mistral NeMo.'
          },
          {
            category: 'CPU',
            name: 'AMD Ryzen 7 7800X3D (8C / 16T)',
            spec: 'Zen 4 3D V-Cache',
            condition: 'New (Amazon)',
            price: 449,
            merchant: 'Amazon',
            url: 'https://www.amazon.com/s?k=Ryzen+7+7800X3D',
            notes: 'Top tier single-core performance.'
          },
          {
            category: 'Motherboard',
            name: 'MSI MAG B650 Tomahawk WiFi',
            spec: 'ATX B650 with heavy heatsinks',
            condition: 'New (Amazon)',
            price: 199,
            merchant: 'Amazon',
            url: 'https://www.amazon.com/s?k=MSI+MAG+B650+Tomahawk',
            notes: 'Sturdy PCIe x16 slot with steel armor to support heavy 4090.'
          },
          {
            category: 'RAM',
            name: 'G.Skill Flare X5 64GB (2x32GB) DDR5-6000 CL30',
            spec: '64GB DDR5 CL30',
            condition: 'New (Amazon)',
            price: 189,
            merchant: 'Amazon',
            url: 'https://www.amazon.com/s?k=64GB+DDR5+6000+CL30',
            notes: 'High speed low latency memory.'
          },
          {
            category: 'Power Supply (PSU)',
            name: 'Corsair RM1000x 1000W 80+ Gold (ATX 3.0)',
            spec: '1000W with native 12V-2x6 cable',
            condition: 'New (Amazon / B&H)',
            price: 169,
            merchant: 'Amazon / B&H',
            url: 'https://www.amazon.com/s?k=Corsair+RM1000x+1000W',
            notes: 'Direct 16-pin 12VHPWR cable prevents adapter melting issues.'
          },
          {
            category: 'Storage (SSD)',
            name: 'Samsung 990 Pro 2TB NVMe SSD',
            spec: '7450 MB/s read speed',
            condition: 'New (Amazon)',
            price: 169,
            merchant: 'Amazon',
            url: 'https://www.amazon.com/s?k=Samsung+990+Pro+2TB',
            notes: 'Top tier NVMe.'
          },
          {
            category: 'Case',
            name: 'Lian Li LANCOOL 216',
            spec: 'Dual 160mm front fans with GPU anti-sag bracket included',
            condition: 'New (Amazon)',
            price: 99,
            merchant: 'Amazon',
            url: 'https://www.amazon.com/s?k=Lian+Li+LANCOOL+216',
            notes: 'Anti-sag bracket supports 2.2kg RTX 4090.'
          },
          {
            category: 'Cooling',
            name: 'Thermalright Phantom Spirit 120 SE',
            spec: 'Dual tower air cooler',
            condition: 'New (Amazon)',
            price: 36,
            merchant: 'Amazon',
            url: 'https://www.amazon.com/s?k=Thermalright+Phantom+Spirit',
            notes: 'Silent and reliable.'
          }
        ]
      }
    ]
  },

  // -------------------------------------------------------------
  // 5. LLAMA 3.1 8B
  // -------------------------------------------------------------
  'llama-3.1-8b': {
    modelId: 'llama-3.1-8b',
    title: 'Llama 3.1 8B Instruct Starter Rigs',
    vramTarget: '8 - 12 GB VRAM (Single Budget GPU)',
    quantTarget: 'Q8_0 or FP16 (Full Precision)',
    speedTarget: '65 - 120 tokens/second',
    tiers: [
      {
        id: 'tier-budget-used',
        name: 'Ultra-Budget Used RTX 3060 12GB',
        badge: 'Sub-$600 Complete PC',
        type: 'used',
        accentColor: '#10b981',
        headline: 'Run full Q8 8B models in VRAM for under $580 total build',
        rigSummary: 'Pair a used RTX 3060 12GB with a refurbished office PC or budget AM4 kit. 12GB VRAM lets you fit Llama 3.1 8B at Q8_0 plus 16K context with zero offload.',
        estimatedTdpWatts: 280,
        parts: [
          {
            category: 'GPU',
            name: 'NVIDIA GeForce RTX 3060 12GB',
            spec: '12GB GDDR6, 170W TDP, 360 GB/s bandwidth',
            condition: 'Used (eBay Sold)',
            price: 222,
            merchant: 'eBay Sold',
            url: 'https://www.ebay.com/sch/i.html?_nkw=RTX+3060+12GB&LH_Sold=1&LH_Complete=1',
            notes: 'The cheapest card that can run 8B models at full Q8 precision completely in VRAM.'
          },
          {
            category: 'CPU',
            name: 'AMD Ryzen 5 3600 / 5500 (6C / 12T)',
            spec: '6-core Zen 2/3, 65W TDP',
            condition: 'Used / New (Amazon / eBay)',
            price: 79,
            merchant: 'Amazon / eBay',
            url: 'https://www.amazon.com/s?k=Ryzen+5+5500',
            notes: 'Plenty of power for lightweight agent tasks.'
          },
          {
            category: 'Motherboard',
            name: 'Gigabyte A520M S2H / B450M',
            spec: 'Micro-ATX AM4 with PCIe x16 slot',
            condition: 'New (Amazon)',
            price: 65,
            merchant: 'Amazon',
            url: 'https://www.amazon.com/s?k=A520M+motherboard',
            notes: 'Basic, rock-solid budget board.'
          },
          {
            category: 'RAM',
            name: 'Silicon Power 16GB (2x8GB) DDR4-3200',
            spec: '16GB DDR4 dual channel',
            condition: 'New (Amazon)',
            price: 29,
            merchant: 'Amazon',
            url: 'https://www.amazon.com/s?k=16GB+DDR4+3200',
            notes: 'Sufficient for 8B models.'
          },
          {
            category: 'Power Supply (PSU)',
            name: 'Apevia Prestige 600W 80+ Gold (or EVGA 500W)',
            spec: '500-600W 80+ certified',
            condition: 'New (Amazon)',
            price: 52,
            merchant: 'Amazon',
            url: 'https://www.amazon.com/s?k=500W+80+power+supply',
            notes: 'More than enough for 280W system draw.'
          },
          {
            category: 'Storage (SSD)',
            name: 'Kingston NV2 1TB NVMe M.2 SSD',
            spec: 'Up to 3500 MB/s read speed',
            condition: 'New (Amazon)',
            price: 56,
            merchant: 'Amazon',
            url: 'https://www.amazon.com/s?k=Kingston+NV2+1TB',
            notes: 'Holds OS and several 8B models.'
          },
          {
            category: 'Case',
            name: 'Zalman T6 or Cooler Master Q300L',
            spec: 'Compact micro-ATX case',
            condition: 'New (Amazon)',
            price: 39,
            merchant: 'Amazon',
            url: 'https://www.amazon.com/s?k=Cooler+Master+Q300L',
            notes: 'Compact budget chassis.'
          },
          {
            category: 'Cooling',
            name: 'AMD Wraith Stealth Cooler',
            spec: 'Included with CPU',
            condition: 'Included',
            price: 0,
            merchant: 'Included',
            url: '#',
            notes: 'Stock AMD cooler.'
          }
        ]
      },
      {
        id: 'tier-balanced-mix',
        name: 'Used RTX 3080 10GB High-Speed Rig',
        badge: '100+ Tokens/sec Speed',
        type: 'balanced',
        accentColor: '#3b82f6',
        headline: '760 GB/s memory bandwidth for ultra-fast response for under $820',
        rigSummary: 'Used RTX 3080 10GB card delivering 760 GB/s bandwidth. Token generation speeds exceed 100 tok/s on 8B models.',
        estimatedTdpWatts: 420,
        parts: [
          {
            category: 'GPU',
            name: 'NVIDIA GeForce RTX 3080 10GB',
            spec: '10GB GDDR6X, 760 GB/s bandwidth, 320W TDP',
            condition: 'Used (eBay Sold)',
            price: 370,
            merchant: 'eBay Sold',
            url: 'https://www.ebay.com/sch/i.html?_nkw=RTX+3080+10GB&LH_Sold=1&LH_Complete=1',
            notes: 'Incredible memory bandwidth for under $400. 10GB fits 8B at Q8 or FP16.'
          },
          {
            category: 'CPU',
            name: 'AMD Ryzen 5 5600X (6C / 12T)',
            spec: '65W TDP, 3.7GHz base / 4.6GHz boost',
            condition: 'New (Amazon)',
            price: 135,
            merchant: 'Amazon',
            url: 'https://www.amazon.com/s?k=Ryzen+5+5600X',
            notes: 'Solid gaming & AI CPU.'
          },
          {
            category: 'Motherboard',
            name: 'MSI B550M PRO-VDH WiFi',
            spec: 'Micro-ATX with WiFi & reinforced PCIe 4.0',
            condition: 'New (Amazon)',
            price: 99,
            merchant: 'Amazon',
            url: 'https://www.amazon.com/s?k=MSI+B550M+PRO-VDH+WiFi',
            notes: 'Durable motherboard.'
          },
          {
            category: 'RAM',
            name: 'Corsair Vengeance LPX 32GB (2x16GB) DDR4-3200',
            spec: '32GB DDR4 dual channel',
            condition: 'New (Amazon)',
            price: 54,
            merchant: 'Amazon',
            url: 'https://www.amazon.com/s?k=32GB+DDR4+3200',
            notes: '32GB system memory.'
          },
          {
            category: 'Power Supply (PSU)',
            name: 'Thermaltake Toughpower GX2 700W 80+ Gold',
            spec: '700W 80+ Gold certified',
            condition: 'New (Amazon)',
            price: 69,
            merchant: 'Amazon',
            url: 'https://www.amazon.com/s?k=700W+80+gold+power+supply',
            notes: 'Powers 320W RTX 3080 with ease.'
          },
          {
            category: 'Storage (SSD)',
            name: 'Crucial P3 Plus 1TB NVMe M.2 SSD',
            spec: 'Up to 5000 MB/s',
            condition: 'New (Amazon)',
            price: 65,
            merchant: 'Amazon',
            url: 'https://www.amazon.com/s?k=Crucial+P3+Plus+1TB',
            notes: 'Fast storage.'
          },
          {
            category: 'Case',
            name: 'Montech AIR 100 Lite',
            spec: 'Mesh micro-ATX chassis',
            condition: 'New (Amazon)',
            price: 49,
            merchant: 'Amazon',
            url: 'https://www.amazon.com/s?k=Montech+AIR+100',
            notes: 'Front mesh airflow.'
          },
          {
            category: 'Cooling',
            name: 'Thermalright Assassin X 120 SE',
            spec: 'Tower air cooler',
            condition: 'New (Amazon)',
            price: 18,
            merchant: 'Amazon',
            url: 'https://www.amazon.com/s?k=Thermalright+Assassin+X',
            notes: 'Keeps CPU quiet.'
          }
        ]
      },
      {
        id: 'tier-best-new',
        name: 'New RTX 4060 Ti 16GB Modern AM5 Rig',
        badge: 'Future-Proof 16GB',
        type: 'new',
        accentColor: '#8b5cf6',
        headline: 'Modern 16GB VRAM on AM5: run 8B today, 14B tomorrow',
        rigSummary: 'Brand new RTX 4060 Ti 16GB on AM5 platform. Extra VRAM headroom allows running 14B models or 64K context windows without hardware bottlenecks.',
        estimatedTdpWatts: 260,
        parts: [
          {
            category: 'GPU',
            name: 'NVIDIA GeForce RTX 4060 Ti 16GB',
            spec: '16GB GDDR6, 165W TDP, Ada Lovelace architecture',
            condition: 'New (Amazon / B&H)',
            price: 449,
            merchant: 'Amazon / B&H',
            url: 'https://www.amazon.com/s?k=RTX+4060+Ti+16GB',
            notes: '16GB VRAM allows running Llama 8B unquantized FP16 with 64K context.'
          },
          {
            category: 'CPU',
            name: 'AMD Ryzen 5 7600 (6C / 12T, AM5)',
            spec: 'Zen 4, 65W TDP, PCIe 5.0',
            condition: 'New (Amazon)',
            price: 189,
            merchant: 'Amazon',
            url: 'https://www.amazon.com/s?k=Ryzen+5+7600',
            notes: 'AM5 platform supported through 2027+.'
          },
          {
            category: 'Motherboard',
            name: 'MSI PRO B650M-A WiFi',
            spec: 'Micro-ATX AM5 with WiFi 6E & 2.5G LAN',
            condition: 'New (Amazon)',
            price: 139,
            merchant: 'Amazon',
            url: 'https://www.amazon.com/s?k=MSI+PRO+B650M-A+WiFi',
            notes: 'High quality power delivery.'
          },
          {
            category: 'RAM',
            name: 'Corsair Vengeance 32GB (2x16GB) DDR5-6000',
            spec: '32GB DDR5-6000 kit',
            condition: 'New (Amazon)',
            price: 99,
            merchant: 'Amazon',
            url: 'https://www.amazon.com/s?k=32GB+DDR5+6000',
            notes: 'Fast DDR5 memory.'
          },
          {
            category: 'Power Supply (PSU)',
            name: 'Corsair RM650 650W 80+ Gold',
            spec: '650W fully modular',
            condition: 'New (Amazon)',
            price: 89,
            merchant: 'Amazon',
            url: 'https://www.amazon.com/s?k=Corsair+RM650',
            notes: 'Silent zero-RPM fan mode under low loads.'
          },
          {
            category: 'Storage (SSD)',
            name: 'Crucial T500 1TB NVMe M.2 SSD',
            spec: 'PCIe 4.0 up to 7300 MB/s',
            condition: 'New (Amazon)',
            price: 89,
            merchant: 'Amazon',
            url: 'https://www.amazon.com/s?k=Crucial+T500+1TB',
            notes: 'Lightning fast model loading.'
          },
          {
            category: 'Case',
            name: 'Lian Li LANCOOL 205M Mesh',
            spec: 'Compact micro-ATX chassis with mesh front',
            condition: 'New (Amazon)',
            price: 69,
            merchant: 'Amazon',
            url: 'https://www.amazon.com/s?k=Lian+Li+LANCOOL+205M+Mesh',
            notes: 'Premium build quality and clean cable management.'
          },
          {
            category: 'Cooling',
            name: 'Thermalright Assassin King 120 SE',
            spec: 'Single tower 5-heatpipe cooler',
            condition: 'New (Amazon)',
            price: 21,
            merchant: 'Amazon',
            url: 'https://www.amazon.com/s?k=Thermalright+Assassin+King+120',
            notes: 'Near silent operation.'
          }
        ]
      }
    ]
  }
};
