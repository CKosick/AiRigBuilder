// The 10 GPUs that matter for local AI with real used/street market pricing (eBay sold listings baseline)
// Last updated: 2026-10-07T03:10:01.112Z
export const GPUS_DATA = [
  {
    "id": "rtx-3090",
    "name": "NVIDIA GeForce RTX 3090",
    "vram": 24,
    "vramType": "GDDR6X",
    "bandwidth": 936,
    "tdp": 350,
    "usedStreetPrice": 718,
    "usedPriceLow": 576,
    "usedPriceHigh": 863,
    "newPrice": null,
    "trend7d": 3.3,
    "trend30d": -5.4,
    "pricePerGb": 29.92,
    "multiGpuScore": 9.8,
    "aiRating": "👑 King of Local 70B",
    "summary": "The uncontested value king of local AI. Dual 3090s give 48GB VRAM with NVLink support for under $1,400 total GPU spend. Excellent memory bandwidth (936 GB/s).",
    "pros": [
      "24GB VRAM per card",
      "936 GB/s bandwidth",
      "NVLink support",
      "Massive software compatibility (CUDA, FlashAttn)"
    ],
    "cons": [
      "High transient power spikes",
      "Rear VRAM chips get hot on FE/some cards",
      "Requires 3-slot spacing or riser"
    ],
    "history": [
      {
        "date": "Jul 2024",
        "price": 785
      },
      {
        "date": "Aug 2024",
        "price": 765
      },
      {
        "date": "Sep 2024",
        "price": 750
      },
      {
        "date": "Oct 2024",
        "price": 735
      },
      {
        "date": "Nov 2024",
        "price": 720
      },
      {
        "date": "Dec 2024",
        "price": 710
      },
      {
        "date": "Jan 2025",
        "price": 705
      },
      {
        "date": "Feb 2025",
        "price": 698
      },
      {
        "date": "Current",
        "price": 718
      }
    ],
    "ebaySoldUrl": "https://www.ebay.com/sch/i.html?_nkw=RTX+3090+24GB&LH_Sold=1&LH_Complete=1"
  },
  {
    "id": "rtx-4090",
    "name": "NVIDIA GeForce RTX 4090",
    "vram": 24,
    "vramType": "GDDR6X",
    "bandwidth": 1008,
    "tdp": 450,
    "usedStreetPrice": 1540,
    "usedPriceLow": 1417,
    "usedPriceHigh": 1663,
    "newPrice": 1849,
    "trend7d": 0,
    "trend30d": -3.8,
    "pricePerGb": 64.17,
    "multiGpuScore": 6.5,
    "aiRating": "🚀 Peak Consumer Compute",
    "summary": "The fastest consumer chip for inference and fine-tuning. 1008 GB/s bandwidth and 4th-gen Tensor Cores deliver blistering speeds, but at >$1,500 it is costly for raw VRAM.",
    "pros": [
      "Top single-card tok/s speed",
      "Ada Lovelace architecture",
      "1008 GB/s bandwidth",
      "Great for fine-tuning & image gen"
    ],
    "cons": [
      "Huge physically (3.5+ slots)",
      "Expensive $/GB ($64/GB)",
      "No NVLink",
      "Requires 12VHPWR caution"
    ],
    "history": [
      {
        "date": "Jul 2024",
        "price": 1720
      },
      {
        "date": "Aug 2024",
        "price": 1690
      },
      {
        "date": "Sep 2024",
        "price": 1660
      },
      {
        "date": "Oct 2024",
        "price": 1620
      },
      {
        "date": "Nov 2024",
        "price": 1590
      },
      {
        "date": "Dec 2024",
        "price": 1570
      },
      {
        "date": "Jan 2025",
        "price": 1560
      },
      {
        "date": "Feb 2025",
        "price": 1550
      },
      {
        "date": "Current",
        "price": 1540
      }
    ],
    "ebaySoldUrl": "https://www.ebay.com/sch/i.html?_nkw=RTX+4090+24GB&LH_Sold=1&LH_Complete=1"
  },
  {
    "id": "rx-7900-xtx",
    "name": "AMD Radeon RX 7900 XTX",
    "vram": 24,
    "vramType": "GDDR6",
    "bandwidth": 960,
    "tdp": 355,
    "usedStreetPrice": 864,
    "usedPriceLow": 834,
    "usedPriceHigh": 975,
    "newPrice": 919,
    "trend7d": 9.4,
    "trend30d": -1.8,
    "pricePerGb": 36,
    "multiGpuScore": 7.2,
    "aiRating": "⚖️ High Bandwidth Alternative",
    "summary": "24GB VRAM with 960 GB/s bandwidth. With recent ROCm 6.2+ and vLLM/Ollama Linux support, it is a viable non-CUDA choice, though multi-card tensor parallel requires Linux.",
    "pros": [
      "24GB VRAM at $790",
      "960 GB/s bandwidth",
      "Standard 8-pin power connectors",
      "Great Linux ROCm support now"
    ],
    "cons": [
      "No Windows CUDA support",
      "FlashAttention support less turnkey",
      "Slower on quantized EXL2"
    ],
    "history": [
      {
        "date": "Jul 2024",
        "price": 840
      },
      {
        "date": "Aug 2024",
        "price": 825
      },
      {
        "date": "Sep 2024",
        "price": 815
      },
      {
        "date": "Oct 2024",
        "price": 805
      },
      {
        "date": "Nov 2024",
        "price": 800
      },
      {
        "date": "Dec 2024",
        "price": 795
      },
      {
        "date": "Jan 2025",
        "price": 795
      },
      {
        "date": "Feb 2025",
        "price": 792
      },
      {
        "date": "Current",
        "price": 864
      }
    ],
    "ebaySoldUrl": "https://www.ebay.com/sch/i.html?_nkw=RX+7900+XTX+24GB&LH_Sold=1&LH_Complete=1"
  },
  {
    "id": "rtx-4060-ti-16gb",
    "name": "NVIDIA GeForce RTX 4060 Ti 16GB",
    "vram": 16,
    "vramType": "GDDR6",
    "bandwidth": 288,
    "tdp": 165,
    "usedStreetPrice": 385,
    "usedPriceLow": 354,
    "usedPriceHigh": 416,
    "newPrice": 449,
    "trend7d": 0,
    "trend30d": -3.2,
    "pricePerGb": 24.06,
    "multiGpuScore": 8.5,
    "aiRating": "⚡ Modern Low-Power 16GB",
    "summary": "The cheapest modern 16GB Ada card. Extremely power-efficient (165W) and easy to cool. Bandwidth is limited (288 GB/s), but perfect for 8B-14B models or budget 2x setup.",
    "pros": [
      "Low 165W TDP",
      "Ada Lovelace fp8 / bf16 support",
      "Runs on 550W PSU",
      "16GB VRAM at sub-$400"
    ],
    "cons": [
      "Narrow 128-bit bus (288 GB/s)",
      "Slower tokens/sec than 3080/3090"
    ],
    "history": [
      {
        "date": "Jul 2024",
        "price": 420
      },
      {
        "date": "Aug 2024",
        "price": 410
      },
      {
        "date": "Sep 2024",
        "price": 405
      },
      {
        "date": "Oct 2024",
        "price": 399
      },
      {
        "date": "Nov 2024",
        "price": 395
      },
      {
        "date": "Dec 2024",
        "price": 390
      },
      {
        "date": "Jan 2025",
        "price": 388
      },
      {
        "date": "Feb 2025",
        "price": 385
      },
      {
        "date": "Current",
        "price": 385
      }
    ],
    "ebaySoldUrl": "https://www.ebay.com/sch/i.html?_nkw=RTX+4060+Ti+16GB&LH_Sold=1&LH_Complete=1"
  },
  {
    "id": "rtx-3060-12gb",
    "name": "NVIDIA GeForce RTX 3060 12GB",
    "vram": 12,
    "vramType": "GDDR6",
    "bandwidth": 360,
    "tdp": 170,
    "usedStreetPrice": 222,
    "usedPriceLow": 204,
    "usedPriceHigh": 240,
    "newPrice": 279,
    "trend7d": -1.3,
    "trend30d": -4,
    "pricePerGb": 18.5,
    "multiGpuScore": 8,
    "aiRating": "💰 Sub-$250 Budget Gateway",
    "summary": "The undisputed budget gateway into local AI. 12GB of VRAM for ~$225 allows running Llama 3 8B at full Q8 or Mistral NeMo at Q4. Great price-to-VRAM ratio.",
    "pros": [
      "Incredible $18.75/GB ratio",
      "Low power 170W",
      "Runs 8B models completely in VRAM",
      "Accessible price"
    ],
    "cons": [
      "12GB cannot fit 70B without offloading",
      "Mid-tier bandwidth (360 GB/s)"
    ],
    "history": [
      {
        "date": "Jul 2024",
        "price": 255
      },
      {
        "date": "Aug 2024",
        "price": 248
      },
      {
        "date": "Sep 2024",
        "price": 242
      },
      {
        "date": "Oct 2024",
        "price": 238
      },
      {
        "date": "Nov 2024",
        "price": 232
      },
      {
        "date": "Dec 2024",
        "price": 228
      },
      {
        "date": "Jan 2025",
        "price": 226
      },
      {
        "date": "Feb 2025",
        "price": 225
      },
      {
        "date": "Current",
        "price": 222
      }
    ],
    "ebaySoldUrl": "https://www.ebay.com/sch/i.html?_nkw=RTX+3060+12GB&LH_Sold=1&LH_Complete=1"
  },
  {
    "id": "tesla-p40",
    "name": "NVIDIA Tesla P40 24GB",
    "vram": 24,
    "vramType": "GDDR5",
    "bandwidth": 346,
    "tdp": 250,
    "usedStreetPrice": 172,
    "usedPriceLow": 158,
    "usedPriceHigh": 186,
    "newPrice": null,
    "trend7d": -1.7,
    "trend30d": 3.5,
    "pricePerGb": 7.17,
    "multiGpuScore": 6,
    "aiRating": "🛠️ Tinkerer Ultra-Budget 24GB",
    "summary": "24GB VRAM for under $180! A datacentre Pascal card requiring a custom cooling fan shroud and no video output. Slow on FP16, but runs GGUF quantized models surprisingly well.",
    "pros": [
      "Unbeatable $7.29 per GB VRAM",
      "24GB per card ($350 for 48GB!)",
      "Single slot-friendly form factor"
    ],
    "cons": [
      "Pascal architecture (no native FP16/INT4 tensor cores)",
      "Requires 3D printed blower fan & adapter",
      "Headless (no video port)"
    ],
    "history": [
      {
        "date": "Jul 2024",
        "price": 165
      },
      {
        "date": "Aug 2024",
        "price": 168
      },
      {
        "date": "Sep 2024",
        "price": 172
      },
      {
        "date": "Oct 2024",
        "price": 174
      },
      {
        "date": "Nov 2024",
        "price": 175
      },
      {
        "date": "Dec 2024",
        "price": 178
      },
      {
        "date": "Jan 2025",
        "price": 176
      },
      {
        "date": "Feb 2025",
        "price": 175
      },
      {
        "date": "Current",
        "price": 172
      }
    ],
    "ebaySoldUrl": "https://www.ebay.com/sch/i.html?_nkw=Nvidia+Tesla+P40+24GB&LH_Sold=1&LH_Complete=1"
  },
  {
    "id": "rtx-4080-super",
    "name": "NVIDIA GeForce RTX 4080 Super 16GB",
    "vram": 16,
    "vramType": "GDDR6X",
    "bandwidth": 736,
    "tdp": 320,
    "usedStreetPrice": 881,
    "usedPriceLow": 811,
    "usedPriceHigh": 951,
    "newPrice": 999,
    "trend7d": 0.1,
    "trend30d": -2.8,
    "pricePerGb": 55.06,
    "multiGpuScore": 6.8,
    "aiRating": "🏎️ Fast Compute, VRAM Bottleneck",
    "summary": "Fast 736 GB/s bandwidth and great Ada Lovelace inference speed, but capped at 16GB VRAM. Expensive per GB compared to used 3090.",
    "pros": [
      "736 GB/s memory bandwidth",
      "High token speed on 8B-14B",
      "Power efficient compared to Ampere"
    ],
    "cons": [
      "Only 16GB VRAM",
      "$55/GB price ratio",
      "3-slot thickness limits dual card builds"
    ],
    "history": [
      {
        "date": "Jul 2024",
        "price": 950
      },
      {
        "date": "Aug 2024",
        "price": 935
      },
      {
        "date": "Sep 2024",
        "price": 920
      },
      {
        "date": "Oct 2024",
        "price": 905
      },
      {
        "date": "Nov 2024",
        "price": 895
      },
      {
        "date": "Dec 2024",
        "price": 890
      },
      {
        "date": "Jan 2025",
        "price": 885
      },
      {
        "date": "Feb 2025",
        "price": 880
      },
      {
        "date": "Current",
        "price": 881
      }
    ],
    "ebaySoldUrl": "https://www.ebay.com/sch/i.html?_nkw=RTX+4080+Super+16GB&LH_Sold=1&LH_Complete=1"
  },
  {
    "id": "rtx-3080-10gb",
    "name": "NVIDIA GeForce RTX 3080 10GB",
    "vram": 10,
    "vramType": "GDDR6X",
    "bandwidth": 760,
    "tdp": 320,
    "usedStreetPrice": 383,
    "usedPriceLow": 354,
    "usedPriceHigh": 408,
    "newPrice": null,
    "trend7d": 3.5,
    "trend30d": -6.1,
    "pricePerGb": 38.3,
    "multiGpuScore": 7,
    "aiRating": "⚡ High Bandwidth 8B Speeder",
    "summary": "Fast 760 GB/s bandwidth at sub-$400, providing 100+ tok/s on 8B models. However, 10GB VRAM is tight for modern context windows.",
    "pros": [
      "High 760 GB/s bandwidth",
      "Blazing fast on small models",
      "Sub-$400 used price"
    ],
    "cons": [
      "10GB VRAM headroom is tight",
      "Cannot fit 14B+ models fully in VRAM"
    ],
    "history": [
      {
        "date": "Jul 2024",
        "price": 420
      },
      {
        "date": "Aug 2024",
        "price": 405
      },
      {
        "date": "Sep 2024",
        "price": 395
      },
      {
        "date": "Oct 2024",
        "price": 388
      },
      {
        "date": "Nov 2024",
        "price": 380
      },
      {
        "date": "Dec 2024",
        "price": 375
      },
      {
        "date": "Jan 2025",
        "price": 372
      },
      {
        "date": "Feb 2025",
        "price": 370
      },
      {
        "date": "Current",
        "price": 383
      }
    ],
    "ebaySoldUrl": "https://www.ebay.com/sch/i.html?_nkw=RTX+3080+10GB&LH_Sold=1&LH_Complete=1"
  },
  {
    "id": "rtx-a5000",
    "name": "NVIDIA RTX A5000 24GB",
    "vram": 24,
    "vramType": "GDDR6 with ECC",
    "bandwidth": 768,
    "tdp": 230,
    "usedStreetPrice": 1180,
    "usedPriceLow": 1086,
    "usedPriceHigh": 1274,
    "newPrice": 2250,
    "trend7d": 0,
    "trend30d": -2.1,
    "pricePerGb": 49.17,
    "multiGpuScore": 9.9,
    "aiRating": "🏢 Workstation Dual-Slot Blower",
    "summary": "True 2-slot blower cooler with ECC memory and 230W TDP. The cleanest multi-GPU fit inside standard desktop cases without overheating adjacent cards.",
    "pros": [
      "Strict 2-slot blower design (easy dual/quad fit)",
      "Only 230W TDP",
      "ECC VRAM support",
      "Workstation driver stability"
    ],
    "cons": [
      "Higher cost than RTX 3090 ($1,180 vs $695)",
      "Slightly lower bandwidth (768 vs 936 GB/s)"
    ],
    "history": [
      {
        "date": "Jul 2024",
        "price": 1320
      },
      {
        "date": "Aug 2024",
        "price": 1290
      },
      {
        "date": "Sep 2024",
        "price": 1260
      },
      {
        "date": "Oct 2024",
        "price": 1230
      },
      {
        "date": "Nov 2024",
        "price": 1210
      },
      {
        "date": "Dec 2024",
        "price": 1195
      },
      {
        "date": "Jan 2025",
        "price": 1185
      },
      {
        "date": "Feb 2025",
        "price": 1180
      },
      {
        "date": "Current",
        "price": 1180
      }
    ],
    "ebaySoldUrl": "https://www.ebay.com/sch/i.html?_nkw=Nvidia+RTX+A5000+24GB&LH_Sold=1&LH_Complete=1"
  },
  {
    "id": "mac-studio-m2-ultra",
    "name": "Apple Mac Studio (M2/M4 Ultra 64-192GB)",
    "vram": 64,
    "vramType": "Unified LPDDR5",
    "bandwidth": 800,
    "tdp": 140,
    "usedStreetPrice": 2747,
    "usedPriceLow": 2527,
    "usedPriceHigh": 2967,
    "newPrice": 3999,
    "trend7d": -0.1,
    "trend30d": -4.5,
    "pricePerGb": 42.92,
    "multiGpuScore": 10,
    "aiRating": "🍎 Unified Memory Champion",
    "summary": "Up to 192GB unified memory in a silent, 140W desktop box. Runs 70B models unquantized or Q8, and can even fit 405B at Q3/Q4. Slower prompt processing than dual 3090, but zero setup friction.",
    "pros": [
      "Up to 192GB unified memory on one SOC",
      "Whisper quiet at ~140W draw",
      "Runs 70B at Q8 or 405B at Q3",
      "No PCIe lanes or power cabling nightmares"
    ],
    "cons": [
      "High upfront cost ($2,500 - $4,000)",
      "Slower prompt ingestion / TTFT than CUDA",
      "Non-upgradable"
    ],
    "history": [
      {
        "date": "Jul 2024",
        "price": 3100
      },
      {
        "date": "Aug 2024",
        "price": 3000
      },
      {
        "date": "Sep 2024",
        "price": 2950
      },
      {
        "date": "Oct 2024",
        "price": 2900
      },
      {
        "date": "Nov 2024",
        "price": 2840
      },
      {
        "date": "Dec 2024",
        "price": 2800
      },
      {
        "date": "Jan 2025",
        "price": 2780
      },
      {
        "date": "Feb 2025",
        "price": 2760
      },
      {
        "date": "Current",
        "price": 2747
      }
    ],
    "ebaySoldUrl": "https://www.ebay.com/sch/i.html?_nkw=Mac+Studio+M2+Ultra+unified+memory&LH_Sold=1&LH_Complete=1"
  }
];
