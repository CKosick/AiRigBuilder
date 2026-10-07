// Flagship local AI models for airigbuilder.com
export const MODELS_DATA = [
  {
    id: 'llama-3.3-70b',
    name: 'Llama 3.3 70B Instruct',
    creator: 'Meta',
    parameters: '70 Billion',
    releaseDate: 'Dec 2024',
    description: 'The reigning open-weights champion. Matches original Llama 3 405B capabilities on reasoning, math, and code at a fraction of the hardware cost.',
    flagship: true,
    minVram: 40, // GB for Q4
    recommendedVram: 48, // Dual 24GB GPUs
    sweetSpotQuant: 'Q4_K_M (4.5 bpw)',
    quants: [
      { name: 'Q3_K_M (3.4 bpw)', vram: 34, speed: '~22 tok/s on 2x 3090', quality: 'Acceptable for casual chat' },
      { name: 'Q4_K_M (4.5 bpw)', vram: 42, speed: '~18 tok/s on 2x 3090', quality: 'Sweet spot: 99% FP16 accuracy', recommended: true },
      { name: 'Q5_K_M (5.5 bpw)', vram: 50, speed: '~14 tok/s (needs 3x GPU or CPU offload)', quality: 'Near lossless' },
      { name: 'Q8_0 (8.5 bpw)', vram: 75, speed: '~8 tok/s (requires 4x 3090 / Mac 96GB)', quality: 'Bit-exact research grade' }
    ],
    contextCostPer8k: 2.2, // GB VRAM for KV cache
    typicalSpeedDual3090: '17 - 21 tokens/sec (exllamav2 / llama.cpp)',
    cloudEquivalent: 'RunPod 2x RTX 3090 / 2x A6000 ($0.88 - $1.60/hr)'
  },
  {
    id: 'deepseek-r1-70b',
    name: 'DeepSeek-R1-Distill-Llama-70B',
    creator: 'DeepSeek / Meta',
    parameters: '70 Billion',
    releaseDate: 'Jan 2025',
    description: 'SOTA reasoning model distilled from DeepSeek-R1 into Llama-3.3-70B. Chains of thought match OpenAI o1-mini on AIME, MATH-500, and Codeforces.',
    flagship: true,
    minVram: 42,
    recommendedVram: 48,
    sweetSpotQuant: 'Q4_K_M or EXL2 4.25bpw',
    quants: [
      { name: 'Q3_K_S (3.2 bpw)', vram: 33, speed: '~24 tok/s on 2x 3090', quality: 'Moderate degradation in reasoning chains' },
      { name: 'Q4_K_M (4.5 bpw)', vram: 43, speed: '~18 tok/s on 2x 3090', quality: 'Optimal reasoning retention', recommended: true },
      { name: 'EXL2 4.0bpw', vram: 39, speed: '~22 tok/s on 2x 3090 (FlashAttention 2)', quality: 'High speed + solid reasoning' },
      { name: 'Q8_0 (8.5 bpw)', vram: 75, speed: '~9 tok/s (4x 24GB or Mac 96GB+)', quality: 'Maximum mathematical fidelity' }
    ],
    contextCostPer8k: 2.4,
    typicalSpeedDual3090: '18 - 23 tokens/sec (vLLM / exllamav2)',
    cloudEquivalent: 'Vast.ai 2x RTX 3090 ($0.75 - $0.95/hr)'
  },
  {
    id: 'qwen-2.5-72b',
    name: 'Qwen 2.5 72B Instruct',
    creator: 'Alibaba Cloud',
    parameters: '72.7 Billion',
    releaseDate: 'Sep 2024',
    description: 'Top-tier multilingual & 128K long-context powerhouse. Dominates code synthesis and complex instruction following across benchmarks.',
    flagship: true,
    minVram: 44,
    recommendedVram: 48,
    sweetSpotQuant: 'Q4_K_M (4.5 bpw)',
    quants: [
      { name: 'Q3_K_M (3.5 bpw)', vram: 36, speed: '~21 tok/s on 2x 3090', quality: 'Passable for general queries' },
      { name: 'Q4_K_M (4.5 bpw)', vram: 44, speed: '~17 tok/s on 2x 3090', quality: 'Recommended standard for production', recommended: true },
      { name: 'Q5_K_M (5.5 bpw)', vram: 53, speed: '~12 tok/s (requires 64GB+ VRAM)', quality: 'Zero quantization loss in code' },
      { name: 'Q8_0 (8.5 bpw)', vram: 78, speed: '~7 tok/s (needs Mac Studio 128GB or 4x 3090)', quality: 'Full precision equivalent' }
    ],
    contextCostPer8k: 2.5,
    typicalSpeedDual3090: '16 - 20 tokens/sec (vLLM / llama.cpp)',
    cloudEquivalent: 'RunPod 2x RTX 4090 ($1.48/hr)'
  },
  {
    id: 'mistral-nemo-12b',
    name: 'Mistral NeMo 12B / Small 24B',
    creator: 'Mistral AI',
    parameters: '12B - 24B',
    releaseDate: 'Jul 2024 / Jan 2025',
    description: 'The golden balance between VRAM footprint and intelligence. Runs blazing fast on a single 16GB or 24GB GPU with large 128K context window.',
    flagship: true,
    minVram: 14,
    recommendedVram: 16,
    sweetSpotQuant: 'Q8_0 or Q6_K on single 24GB',
    quants: [
      { name: 'Q4_K_M (4.5 bpw)', vram: 10, speed: '~65 tok/s on RTX 3090', quality: 'Fast daily assistant' },
      { name: 'Q8_0 (8.5 bpw)', vram: 15, speed: '~45 tok/s on RTX 3090', quality: 'Flawless precision on 1 card', recommended: true },
      { name: 'FP16 (16.0 bpw)', vram: 25, speed: '~38 tok/s on RTX 4090 / 3090', quality: 'Unquantized native weights' }
    ],
    contextCostPer8k: 1.1,
    typicalSpeedDual3090: '50 - 85 tokens/sec (single GPU)',
    cloudEquivalent: 'Vast.ai 1x RTX 3090 ($0.35 - $0.45/hr)'
  },
  {
    id: 'llama-3.1-8b',
    name: 'Llama 3.1 8B Instruct',
    creator: 'Meta',
    parameters: '8.0 Billion',
    releaseDate: 'Jul 2024',
    description: 'The ultra-budget starter model. Lightning quick token generation, runs comfortably on a sub-$250 RTX 3060 12GB or used 3080.',
    flagship: true,
    minVram: 6,
    recommendedVram: 12,
    sweetSpotQuant: 'Q8_0 or FP16 on single 12GB/16GB',
    quants: [
      { name: 'Q4_K_M (4.5 bpw)', vram: 5.8, speed: '~85 tok/s on RTX 3060 12GB', quality: 'Solid for agents & local tools' },
      { name: 'Q8_0 (8.5 bpw)', vram: 9.2, speed: '~60 tok/s on RTX 3060 12GB', quality: 'Full accuracy on budget card', recommended: true },
      { name: 'FP16 (16.0 bpw)', vram: 16.5, speed: '~95 tok/s on RTX 4060 Ti 16GB', quality: 'Zero quantization loss' }
    ],
    contextCostPer8k: 0.8,
    typicalSpeedDual3090: '90 - 130 tokens/sec (single GPU)',
    cloudEquivalent: 'RunPod 1x RTX 3070 ($0.22/hr)'
  }
];
