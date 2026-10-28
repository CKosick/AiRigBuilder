// The GPUs and AI systems tracked for local AI, with used prices estimated from current eBay listings
// Last updated: 2026-10-28T01:14:42.045Z
export const GPUS_UPDATED_AT = '2026-10-28T01:14:42.045Z';
export const GPUS_DATA = [
  {
    "id": "rtx-3090",
    "name": "NVIDIA GeForce RTX 3090",
    "vram": 24,
    "vramType": "GDDR6X",
    "bandwidth": 936,
    "tdp": 350,
    "usedStreetPrice": 750,
    "usedPriceLow": 600,
    "usedPriceHigh": 995,
    "newPrice": null,
    "trend7d": null,
    "trend30d": null,
    "pricePerGb": 31.25,
    "multiGpuScore": 9.8,
    "aiRating": "King of Local 70B",
    "summary": "The uncontested value king of local AI. Dual 3090s give 48GB VRAM with NVLink support for about {dualPrice} total GPU spend. Excellent memory bandwidth (936 GB/s).",
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
        "date": "Oct 2026",
        "price": 750
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
    "usedStreetPrice": 1550,
    "usedPriceLow": 1200,
    "usedPriceHigh": 2199,
    "newPrice": 1849,
    "trend7d": null,
    "trend30d": null,
    "pricePerGb": 64.58,
    "multiGpuScore": 6.5,
    "aiRating": "Peak Consumer Compute",
    "summary": "The fastest consumer chip for inference and fine-tuning. 1008 GB/s bandwidth and 4th-gen Tensor Cores deliver blistering speeds, but at about {price} used it is costly for raw VRAM.",
    "pros": [
      "Top single-card tok/s speed",
      "Ada Lovelace architecture",
      "1008 GB/s bandwidth",
      "Great for fine-tuning & image gen"
    ],
    "cons": [
      "Huge physically (3.5+ slots)",
      "High price per GB of VRAM",
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
        "date": "Oct 2026",
        "price": 1550
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
    "usedStreetPrice": 975,
    "usedPriceLow": 870,
    "usedPriceHigh": 1200,
    "newPrice": 919,
    "trend7d": null,
    "trend30d": null,
    "pricePerGb": 40.63,
    "multiGpuScore": 7.2,
    "aiRating": "High Bandwidth Alternative",
    "summary": "24GB VRAM with 960 GB/s bandwidth. With recent ROCm 6.2+ and vLLM/Ollama Linux support, it is a viable non-CUDA choice, though multi-card tensor parallel requires Linux.",
    "pros": [
      "24GB VRAM for much less than an RTX 4090",
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
        "date": "Oct 2026",
        "price": 975
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
    "usedStreetPrice": 480,
    "usedPriceLow": 400,
    "usedPriceHigh": 500,
    "newPrice": 449,
    "trend7d": null,
    "trend30d": null,
    "pricePerGb": 30,
    "multiGpuScore": 8.5,
    "aiRating": "Modern Low-Power 16GB",
    "summary": "The cheapest modern 16GB Ada card. Extremely power-efficient (165W) and easy to cool. Bandwidth is limited (288 GB/s), but perfect for 8B-14B models or budget 2x setup.",
    "pros": [
      "Low 165W TDP",
      "Ada Lovelace fp8 / bf16 support",
      "Runs on 550W PSU",
      "Affordable 16GB VRAM"
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
        "date": "Oct 2026",
        "price": 480
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
    "usedStreetPrice": 330,
    "usedPriceLow": 291,
    "usedPriceHigh": 350,
    "newPrice": 279,
    "trend7d": null,
    "trend30d": null,
    "pricePerGb": 27.5,
    "multiGpuScore": 8,
    "aiRating": "Budget Gateway",
    "summary": "The undisputed budget gateway into local AI. 12GB of VRAM for about {price} allows running Llama 3 8B at full Q8 or Mistral NeMo at Q4. Great price-to-VRAM ratio.",
    "pros": [
      "Low price per GB of VRAM",
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
        "date": "Oct 2026",
        "price": 330
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
    "usedStreetPrice": 299,
    "usedPriceLow": 273,
    "usedPriceHigh": 329,
    "newPrice": null,
    "trend7d": null,
    "trend30d": null,
    "pricePerGb": 12.46,
    "multiGpuScore": 6,
    "aiRating": "Tinkerer Ultra-Budget 24GB",
    "summary": "24GB VRAM for about {price}. A datacentre Pascal card requiring a custom cooling fan shroud and no video output. Slow on FP16, but runs GGUF quantized models surprisingly well.",
    "pros": [
      "Very low price per GB of VRAM",
      "24GB per card; two cards give 48GB on a budget",
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
        "date": "Oct 2026",
        "price": 299
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
    "usedStreetPrice": 1150,
    "usedPriceLow": 990,
    "usedPriceHigh": 1245,
    "newPrice": 999,
    "trend7d": null,
    "trend30d": null,
    "pricePerGb": 71.88,
    "multiGpuScore": 6.8,
    "aiRating": "Fast Compute, VRAM Bottleneck",
    "summary": "Fast 736 GB/s bandwidth and great Ada Lovelace inference speed, but capped at 16GB VRAM. Expensive per GB compared to used 3090.",
    "pros": [
      "736 GB/s memory bandwidth",
      "High token speed on 8B-14B",
      "Power efficient compared to Ampere"
    ],
    "cons": [
      "Only 16GB VRAM",
      "High price per GB of VRAM",
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
        "date": "Oct 2026",
        "price": 1150
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
    "usedStreetPrice": 400,
    "usedPriceLow": 350,
    "usedPriceHigh": 450,
    "newPrice": null,
    "trend7d": null,
    "trend30d": null,
    "pricePerGb": 40,
    "multiGpuScore": 7,
    "aiRating": "High Bandwidth 8B Speeder",
    "summary": "Fast 760 GB/s bandwidth at about {price} used, providing 100+ tok/s on 8B models. However, 10GB VRAM is tight for modern context windows.",
    "pros": [
      "High 760 GB/s bandwidth",
      "Blazing fast on small models",
      "Low used price for its bandwidth"
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
        "date": "Oct 2026",
        "price": 400
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
    "usedStreetPrice": 1505,
    "usedPriceLow": 1200,
    "usedPriceHigh": 1600,
    "newPrice": 2250,
    "trend7d": null,
    "trend30d": null,
    "pricePerGb": 62.71,
    "multiGpuScore": 9.9,
    "aiRating": "Workstation Dual-Slot Blower",
    "summary": "True 2-slot blower cooler with ECC memory and 230W TDP. The cleanest multi-GPU fit inside standard desktop cases without overheating adjacent cards.",
    "pros": [
      "Strict 2-slot blower design (easy dual/quad fit)",
      "Only 230W TDP",
      "ECC VRAM support",
      "Workstation driver stability"
    ],
    "cons": [
      "Costs more than an RTX 3090 for the same 24GB",
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
        "date": "Oct 2026",
        "price": 1505
      }
    ],
    "ebaySoldUrl": "https://www.ebay.com/sch/i.html?_nkw=Nvidia+RTX+A5000+24GB&LH_Sold=1&LH_Complete=1"
  },
  {
    "id": "mac-studio-m2-ultra",
    "name": "Apple Mac Studio M2 Ultra (64GB, used)",
    "vram": 64,
    "vramType": "Unified LPDDR5",
    "bandwidth": 800,
    "tdp": 140,
    "usedStreetPrice": 3350,
    "usedPriceLow": 2901,
    "usedPriceHigh": 3749,
    "newPrice": null,
    "trend7d": null,
    "trend30d": null,
    "pricePerGb": 52.34,
    "multiGpuScore": 10,
    "aiRating": "Unified Memory Champion",
    "summary": "A used 2023 Mac Studio with M2 Ultra and 64GB of unified memory, the configuration this row prices. At 800GB/s, and with about 48GB usable as GPU memory (macOS defaults to 75% of RAM), it runs 70B models at Q4 in a silent desktop. 128GB and 192GB configurations sell for more and are not covered by this price.",
    "pros": [
      "800GB/s unified memory bandwidth",
      "Silent, low power draw",
      "Runs 70B at Q4 in about 48GB of GPU memory",
      "No PCIe lanes or power cabling to plan"
    ],
    "cons": [
      "64GB caps it at 70B-class models",
      "Slower prompt processing than CUDA cards",
      "Not upgradable; no longer sold new"
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
        "date": "Oct 2026",
        "price": 3350
      }
    ],
    "ebaySoldUrl": "https://www.ebay.com/sch/i.html?_nkw=Mac+Studio+M2+Ultra+unified+memory&LH_Sold=1&LH_Complete=1"
  },
  {
    "id": "rtx-5090",
    "name": "NVIDIA GeForce RTX 5090",
    "vram": 32,
    "vramType": "GDDR7",
    "bandwidth": 1792,
    "tdp": 575,
    "usedStreetPrice": 6500,
    "usedPriceLow": 5500,
    "usedPriceHigh": 7498,
    "newPrice": null,
    "soldNew": true,
    "trend7d": null,
    "trend30d": null,
    "pricePerGb": 203.13,
    "multiGpuScore": 5,
    "aiRating": "Fastest 32GB Consumer Card",
    "summary": "The fastest consumer card for local AI: 32GB of GDDR7 at 1,792 GB/s, nearly double a 3090's bandwidth. Fits 30B-class models at Q8 and MoE models like Qwen 3 30B-A3B with long context on one card. It has sold far above its launch MSRP through 2026, so the price here comes from current listings.",
    "pros": [
      "32GB GDDR7 on one card",
      "1,792 GB/s memory bandwidth",
      "Blackwell FP4/FP8 tensor cores",
      "Full CUDA software support"
    ],
    "cons": [
      "575W board power, 12V-2x6 connector",
      "Street price far above launch MSRP",
      "No NVLink; large partner coolers make two-card builds hard"
    ],
    "history": [
      {
        "date": "Oct 2026",
        "price": 6500
      }
    ],
    "ebaySoldUrl": "https://www.ebay.com/sch/i.html?_nkw=RTX+5090+32GB&LH_Sold=1&LH_Complete=1"
  },
  {
    "id": "rtx-5080",
    "name": "NVIDIA GeForce RTX 5080",
    "vram": 16,
    "vramType": "GDDR7",
    "bandwidth": 960,
    "tdp": 360,
    "usedStreetPrice": 1600,
    "usedPriceLow": 1400,
    "usedPriceHigh": 1891,
    "newPrice": null,
    "soldNew": true,
    "trend7d": null,
    "trend30d": null,
    "pricePerGb": 100,
    "multiGpuScore": 5,
    "aiRating": "Fast but 16GB-Limited",
    "summary": "16GB of GDDR7 at 960 GB/s: about as fast as a 3090 for models that fit, but 16GB tops out around 14B dense models at high quants, or MoE models such as gpt-oss-20b and Gemma 4 26B MoE at Q4.",
    "pros": [
      "960 GB/s memory bandwidth",
      "Blackwell FP4/FP8 tensor cores",
      "Full CUDA software support"
    ],
    "cons": [
      "Only 16GB of VRAM",
      "360W board power",
      "Poor $/GB next to used 24GB cards"
    ],
    "history": [
      {
        "date": "Oct 2026",
        "price": 1600
      }
    ],
    "ebaySoldUrl": "https://www.ebay.com/sch/i.html?_nkw=RTX+5080+16GB&LH_Sold=1&LH_Complete=1"
  },
  {
    "id": "rtx-5060-ti-16gb",
    "name": "NVIDIA GeForce RTX 5060 Ti 16GB",
    "vram": 16,
    "vramType": "GDDR7",
    "bandwidth": 448,
    "tdp": 180,
    "usedStreetPrice": 700,
    "usedPriceLow": 610,
    "usedPriceHigh": 770,
    "newPrice": null,
    "soldNew": true,
    "trend7d": null,
    "trend30d": null,
    "pricePerGb": 43.75,
    "multiGpuScore": 7,
    "aiRating": "Cheapest New 16GB NVIDIA",
    "summary": "The cheapest current-generation 16GB NVIDIA card: 448 GB/s at 180W. Runs 8-14B models at Q8 and small-active MoE models such as gpt-oss-20b comfortably. Check listings are the 16GB card; an 8GB version uses the same name.",
    "pros": [
      "16GB VRAM at low power (180W)",
      "Compact, easy to fit two",
      "Full CUDA software support"
    ],
    "cons": [
      "448 GB/s limits speed on dense models",
      "Narrow 128-bit memory bus",
      "8GB version sold under the same name"
    ],
    "history": [
      {
        "date": "Oct 2026",
        "price": 700
      }
    ],
    "ebaySoldUrl": "https://www.ebay.com/sch/i.html?_nkw=RTX+5060+Ti+16GB&LH_Sold=1&LH_Complete=1"
  },
  {
    "id": "rtx-pro-6000-blackwell",
    "name": "NVIDIA RTX PRO 6000 Blackwell (96GB)",
    "vram": 96,
    "vramType": "GDDR7 ECC",
    "bandwidth": 1792,
    "tdp": 600,
    "usedStreetPrice": 15900,
    "usedPriceLow": 12950,
    "usedPriceHigh": 16999,
    "newPrice": null,
    "soldNew": true,
    "trend7d": null,
    "trend30d": null,
    "pricePerGb": 165.63,
    "multiGpuScore": 8,
    "aiRating": "One-Card 96GB Answer",
    "summary": "One card with 96GB of ECC GDDR7 at 1,792 GB/s: runs 70B at Q8, gpt-oss-120b at native precision and Llama 4 Scout at Q4 on a single GPU, with no multi-card setup. A workstation card whose price has climbed sharply through 2026, so this row goes stale fastest. The 300W Max-Q version is a different card and is excluded from the price.",
    "pros": [
      "96GB VRAM on a single card",
      "1,792 GB/s memory bandwidth",
      "ECC memory, dual-slot",
      "Full CUDA software support"
    ],
    "cons": [
      "Very high price",
      "600W board power",
      "Thin used market"
    ],
    "history": [
      {
        "date": "Oct 2026",
        "price": 15900
      }
    ],
    "ebaySoldUrl": "https://www.ebay.com/sch/i.html?_nkw=RTX+PRO+6000+Blackwell+96GB&LH_Sold=1&LH_Complete=1"
  },
  {
    "id": "arc-pro-b60",
    "name": "Intel Arc Pro B60 24GB",
    "vram": 24,
    "vramType": "GDDR6",
    "bandwidth": 456,
    "tdp": 200,
    "usedStreetPrice": 750,
    "usedPriceLow": 600,
    "usedPriceHigh": 1047,
    "newPrice": null,
    "soldNew": true,
    "trend7d": null,
    "trend30d": null,
    "pricePerGb": 31.25,
    "multiGpuScore": 7,
    "aiRating": "Budget 24GB, Linux Dual-Card",
    "summary": "24GB of GDDR6 at 456 GB/s for far less than other 24GB cards, at 120-200W depending on the partner board. Its local AI story is two cards on Linux with Intel's inference stack; software support still lags CUDA, especially on Windows. Intel sells no reference card, so every B60 is a partner board. Dual-GPU 48GB boards are excluded from the price.",
    "pros": [
      "24GB VRAM at a low price",
      "Low power (120-200W)",
      "Built for multi-card workstations"
    ],
    "cons": [
      "456 GB/s, about half a 3090",
      "No CUDA; smaller software ecosystem",
      "Best results need Linux"
    ],
    "history": [
      {
        "date": "Oct 2026",
        "price": 750
      }
    ],
    "ebaySoldUrl": "https://www.ebay.com/sch/i.html?_nkw=Arc+Pro+B60+24GB&LH_Sold=1&LH_Complete=1"
  },
  {
    "id": "radeon-ai-pro-r9700",
    "name": "AMD Radeon AI PRO R9700 32GB",
    "vram": 32,
    "vramType": "GDDR6",
    "bandwidth": 640,
    "tdp": 300,
    "usedStreetPrice": 1731,
    "usedPriceLow": 1300,
    "usedPriceHigh": 1950,
    "newPrice": null,
    "soldNew": true,
    "trend7d": null,
    "trend30d": null,
    "pricePerGb": 54.09,
    "multiGpuScore": 9,
    "aiRating": "32GB Blower for Multi-GPU",
    "summary": "32GB of GDDR6 at 640 GB/s in a two-slot blower card designed for multi-GPU workstations, with ROCm support. Same VRAM as an RTX 5090 at a fraction of the price, though about a third of its bandwidth and without CUDA.",
    "pros": [
      "32GB VRAM",
      "Two-slot blower: stacks for multi-GPU",
      "ROCm support"
    ],
    "cons": [
      "640 GB/s bandwidth",
      "No CUDA; some tools need extra setup",
      "300W board power"
    ],
    "history": [
      {
        "date": "Oct 2026",
        "price": 1731
      }
    ],
    "ebaySoldUrl": "https://www.ebay.com/sch/i.html?_nkw=Radeon+AI+PRO+R9700+32GB&LH_Sold=1&LH_Complete=1"
  },
  {
    "id": "strix-halo-128gb",
    "name": "AMD Ryzen AI Max+ 395 Mini PC (128GB)",
    "vram": 128,
    "vramType": "Unified LPDDR5X-8000",
    "bandwidth": 256,
    "tdp": 120,
    "usedStreetPrice": 3049,
    "usedPriceLow": 2899,
    "usedPriceHigh": 3602,
    "newPrice": null,
    "soldNew": true,
    "trend7d": null,
    "trend30d": null,
    "pricePerGb": 23.82,
    "multiGpuScore": 3,
    "aiRating": "Cheapest 96GB-Class System",
    "summary": "A complete \"Strix Halo\" mini PC, not a graphics card: AMD's Ryzen AI Max+ 395 with 128GB of LPDDR5X-8000 shared memory, of which up to 96GB can be assigned to its built-in Radeon 8060S graphics. It fits 70B models at Q4-Q6 and Qwen 3 235B at Q2_K, but slowly: 256 GB/s means single-digit tokens per second on dense 70B; MoE models run much faster. Systems come from several makers (GMKtec EVO-X2, Framework Desktop and others) and prices vary.",
    "pros": [
      "Up to 96GB usable as GPU memory",
      "Complete low-power system (45-120W chip)",
      "Fits models no single consumer card can"
    ],
    "cons": [
      "256 GB/s: slow on large dense models",
      "Not upgradable (soldered memory)",
      "ROCm/Vulkan only, no CUDA"
    ],
    "history": [
      {
        "date": "Oct 2026",
        "price": 3049
      }
    ],
    "ebaySoldUrl": "https://www.ebay.com/sch/i.html?_nkw=Ryzen+AI+Max++395+128GB&LH_Sold=1&LH_Complete=1"
  },
  {
    "id": "dgx-spark",
    "name": "NVIDIA DGX Spark (128GB system)",
    "vram": 128,
    "vramType": "Unified LPDDR5X",
    "bandwidth": 273,
    "tdp": 140,
    "usedStreetPrice": 7000,
    "usedPriceLow": 6200,
    "usedPriceHigh": 7499,
    "newPrice": null,
    "soldNew": true,
    "trend7d": null,
    "trend30d": null,
    "pricePerGb": 54.69,
    "multiGpuScore": 6,
    "aiRating": "CUDA in a 128GB Box",
    "summary": "A complete desktop AI system, not a graphics card: NVIDIA's GB10 Grace Blackwell chip with 128GB of unified LPDDR5X and the full CUDA stack in a small box. The catch is bandwidth: 273 GB/s is under a third of a 3090's, so large dense models generate slowly for the price; MoE models suit it better.",
    "pros": [
      "128GB unified memory",
      "Full CUDA software stack",
      "Small and quiet (240W power supply)"
    ],
    "cons": [
      "273 GB/s: slow for its price",
      "Arm-based system, not a standard PC",
      "Not upgradable"
    ],
    "history": [
      {
        "date": "Oct 2026",
        "price": 7000
      }
    ],
    "ebaySoldUrl": "https://www.ebay.com/sch/i.html?_nkw=NVIDIA+DGX+Spark&LH_Sold=1&LH_Complete=1"
  },
  {
    "id": "mac-studio-m3-ultra",
    "name": "Apple Mac Studio M3 Ultra (96GB)",
    "vram": 96,
    "vramType": "Unified LPDDR5",
    "bandwidth": 819,
    "tdp": 480,
    "usedStreetPrice": 4550,
    "usedPriceLow": 4150,
    "usedPriceHigh": 5200,
    "newPrice": null,
    "soldNew": false,
    "trend7d": null,
    "trend30d": null,
    "pricePerGb": 47.4,
    "multiGpuScore": 9,
    "aiRating": "Silent 96GB Unified Box",
    "summary": "A complete desktop system, not a graphics card: the 2025 Mac Studio with M3 Ultra and 96GB of unified memory at 819GB/s, the base configuration this row prices (256GB versions cost far more and are excluded). About 72GB is usable as GPU memory by default, enough for 70B at Q5 or Llama 4 Scout at Q4. Apple now sells the M5 Ultra instead, so this is a used price.",
    "pros": [
      "819GB/s unified memory bandwidth",
      "About 72GB usable as GPU memory",
      "Silent, no multi-GPU setup"
    ],
    "cons": [
      "Slower prompt processing than CUDA cards",
      "Not upgradable",
      "No longer sold new"
    ],
    "history": [
      {
        "date": "Oct 2026",
        "price": 4550
      }
    ],
    "ebaySoldUrl": "https://www.ebay.com/sch/i.html?_nkw=Mac+Studio+M3+Ultra+96GB&LH_Sold=1&LH_Complete=1"
  }
];
