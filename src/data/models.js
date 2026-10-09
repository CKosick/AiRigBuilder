// Flagship and top open-weights local AI models for airigbuilder.com
// Expanded in Phase 3 to 32 comprehensive profiles with VRAM footprints across quantization levels
export const MODELS_DATA = [
  // ==========================================
  // 1. 70B - 72B FLAGSHIP DENSE & REASONING
  // ==========================================
  {
    id: 'llama-3.3-70b',
    name: 'Llama 3.3 70B Instruct',
    creator: 'Meta',
    parameters: '70 Billion',
    releaseDate: 'Dec 2024',
    description: 'The reigning open-weights champion. Matches original Llama 3 405B capabilities on reasoning, math, and code at a fraction of the hardware cost.',
    architecture: 'Dense Transformer',
    flagship: true,
    minVram: 40,
    recommendedVram: 48,
    sweetSpotQuant: 'Q4_K_M (4.5 bpw)',
    quants: [
      { name: 'Q4_K_M (4.5 bpw)', vram: 42, speed: '~18 tok/s on 2x 3090', quality: 'Sweet spot: 99% FP16 accuracy', recommended: true },
      { name: 'Q5_K_M (5.5 bpw)', vram: 50, speed: '~14 tok/s (needs 3x GPU or Mac)', quality: 'Near lossless' },
      { name: 'Q6_K (6.5 bpw)', vram: 58, speed: '~11 tok/s on Mac 64GB/96GB', quality: 'Maximum fidelity dense' },
      { name: 'Q8_0 (8.5 bpw)', vram: 75, speed: '~8 tok/s (requires 4x 3090 / Mac 96GB)', quality: 'Bit-exact research grade' }
    ],
    contextCostPer8k: 2.2,
    typicalSpeedDual3090: '17 - 21 tokens/sec (exllamav2 / llama.cpp)',
    cloudOffers: ['runpod-dual-3090', 'runpod-dual-a6000']
  },
  {
    id: 'deepseek-r1-70b',
    name: 'DeepSeek-R1-Distill-Llama-70B',
    creator: 'DeepSeek / Meta',
    parameters: '70 Billion',
    releaseDate: 'Jan 2025',
    description: 'SOTA reasoning model distilled from DeepSeek-R1 into Llama-3.3-70B. Chains of thought match OpenAI o1-mini on AIME, MATH-500, and Codeforces.',
    architecture: 'Dense Distilled Reasoning',
    flagship: true,
    minVram: 42,
    recommendedVram: 48,
    sweetSpotQuant: 'Q4_K_M or EXL2 4.25bpw',
    quants: [
      { name: 'Q4_K_M (4.5 bpw)', vram: 43, speed: '~18 tok/s on 2x 3090', quality: 'Optimal reasoning retention', recommended: true },
      { name: 'Q5_K_M (5.5 bpw)', vram: 51, speed: '~13 tok/s (3x GPU or Mac)', quality: 'Near-perfect chain of thought' },
      { name: 'Q6_K (6.5 bpw)', vram: 60, speed: '~10 tok/s on Mac Studio 64GB+', quality: 'Flawless math proof retention' },
      { name: 'Q8_0 (8.5 bpw)', vram: 75, speed: '~9 tok/s (4x 24GB or Mac 96GB+)', quality: 'Maximum mathematical fidelity' }
    ],
    contextCostPer8k: 2.4,
    typicalSpeedDual3090: '18 - 23 tokens/sec (vLLM / exllamav2)',
    cloudOffers: ['vast-dual-3090']
  },
  {
    id: 'qwen-2.5-72b',
    name: 'Qwen 2.5 72B Instruct',
    creator: 'Alibaba Cloud',
    parameters: '72.7 Billion',
    releaseDate: 'Sep 2024',
    description: 'Top-tier multilingual & 128K long-context powerhouse. Dominates code synthesis and complex instruction following across benchmarks.',
    architecture: 'Dense Transformer',
    flagship: true,
    minVram: 44,
    recommendedVram: 48,
    sweetSpotQuant: 'Q4_K_M (4.5 bpw)',
    quants: [
      { name: 'Q4_K_M (4.5 bpw)', vram: 44, speed: '~17 tok/s on 2x 3090', quality: 'Recommended standard for production', recommended: true },
      { name: 'Q5_K_M (5.5 bpw)', vram: 53, speed: '~12 tok/s (requires 64GB+ VRAM)', quality: 'Zero quantization loss in code' },
      { name: 'Q6_K (6.5 bpw)', vram: 62, speed: '~10 tok/s on Mac Studio 64GB', quality: 'Exceptional multilingual accuracy' },
      { name: 'Q8_0 (8.5 bpw)', vram: 78, speed: '~7 tok/s (needs Mac Studio 128GB or 4x 3090)', quality: 'Full precision equivalent' }
    ],
    contextCostPer8k: 2.5,
    typicalSpeedDual3090: '16 - 20 tokens/sec (vLLM / llama.cpp)',
    cloudOffers: ['runpod-dual-4090']
  },
  {
    id: 'llama-3.1-70b',
    name: 'Llama 3.1 70B Instruct',
    creator: 'Meta',
    parameters: '70.6 Billion',
    releaseDate: 'Jul 2024',
    description: 'The foundation 70B model with native 128K context window. Enterprise workhorse for agent tool calling and heavy document analysis.',
    architecture: 'Dense Transformer',
    flagship: false,
    minVram: 40,
    recommendedVram: 48,
    sweetSpotQuant: 'Q4_K_M (4.5 bpw)',
    quants: [
      { name: 'Q4_K_M (4.5 bpw)', vram: 42, speed: '~19 tok/s on 2x 3090', quality: 'Daily driver benchmark', recommended: true },
      { name: 'Q5_K_M (5.5 bpw)', vram: 50, speed: '~14 tok/s (3x GPU setup)', quality: 'High precision agents' },
      { name: 'Q6_K (6.5 bpw)', vram: 58, speed: '~11 tok/s on Mac 64GB', quality: 'Near lossless 128k context' },
      { name: 'Q8_0 (8.5 bpw)', vram: 75, speed: '~8 tok/s (4x 24GB)', quality: 'Reference FP16 match' }
    ],
    contextCostPer8k: 2.2,
    typicalSpeedDual3090: '17 - 21 tokens/sec',
    cloudOffers: ['runpod-dual-3090']
  },
  {
    id: 'qwen-2.5-coder-32b',
    name: 'Qwen 2.5 Coder 32B Instruct',
    creator: 'Alibaba Cloud',
    parameters: '32.5 Billion',
    releaseDate: 'Nov 2024',
    description: 'The open-weights coding champion. Rivals GPT-4o on HumanEval and SWE-bench; fits entirely in a single 24GB GPU at Q4 or dual GPUs at Q8.',
    architecture: 'Dense Code Specialist',
    flagship: true,
    minVram: 20,
    recommendedVram: 24,
    sweetSpotQuant: 'Q4_K_M (single 24GB) or Q8_0 (dual GPU)',
    quants: [
      { name: 'Q4_K_M (4.5 bpw)', vram: 20, speed: '~28 tok/s on 1x 3090', quality: 'Fits on single 24GB GPU', recommended: true },
      { name: 'Q5_K_M (5.5 bpw)', vram: 24, speed: '~24 tok/s on 1x 3090', quality: 'Max coding precision on single card' },
      { name: 'Q6_K (6.5 bpw)', vram: 28, speed: '~22 tok/s on dual GPU', quality: 'Zero syntax errors' },
      { name: 'Q8_0 (8.5 bpw)', vram: 36, speed: '~25 tok/s on 2x 3090', quality: 'Full FP16 coding performance' }
    ],
    contextCostPer8k: 1.8,
    typicalSpeedDual3090: '28 - 36 tokens/sec',
    cloudOffers: ['vast-single-4090']
  },

  // ==========================================
  // 2. 27B - 35B MIDWEIGHT SWEET SPOT
  // ==========================================
  {
    id: 'qwen-2.5-32b',
    name: 'Qwen 2.5 32B Instruct',
    creator: 'Alibaba Cloud',
    parameters: '32.5 Billion',
    releaseDate: 'Sep 2024',
    description: 'The true sweet spot for single 24GB GPU owners. Exceptional general reasoning and knowledge retrieval with low compute overhead.',
    architecture: 'Dense Transformer',
    flagship: true,
    minVram: 20,
    recommendedVram: 24,
    sweetSpotQuant: 'Q4_K_M on RTX 3090/4090',
    quants: [
      { name: 'Q4_K_M (4.5 bpw)', vram: 20, speed: '~29 tok/s on 1x 3090', quality: 'Standard single-card fit', recommended: true },
      { name: 'Q5_K_M (5.5 bpw)', vram: 24, speed: '~25 tok/s on 1x 3090', quality: 'Tight fit on 24GB' },
      { name: 'Q6_K (6.5 bpw)', vram: 28, speed: '~22 tok/s on 2x GPU', quality: 'Flawless factual accuracy' },
      { name: 'Q8_0 (8.5 bpw)', vram: 36, speed: '~26 tok/s on 2x 3090', quality: 'Bit-exact FP16' }
    ],
    contextCostPer8k: 1.8,
    typicalSpeedDual3090: '30 - 38 tokens/sec',
    cloudOffers: ['runpod-single-4090']
  },
  {
    id: 'deepseek-r1-distill-32b',
    name: 'DeepSeek-R1-Distill-Qwen-32B',
    creator: 'DeepSeek / Alibaba',
    parameters: '32.5 Billion',
    releaseDate: 'Jan 2025',
    description: 'Remarkable reasoning distilled from R1 into Qwen-2.5-32B. Solves Olympiad math and complex logic chains on a single used RTX 3090.',
    architecture: 'Distilled Reasoning',
    flagship: true,
    minVram: 20,
    recommendedVram: 24,
    sweetSpotQuant: 'Q4_K_M (20 GB VRAM)',
    quants: [
      { name: 'Q4_K_M (4.5 bpw)', vram: 20, speed: '~27 tok/s on 1x 3090', quality: 'Best balance for math on single card', recommended: true },
      { name: 'Q5_K_M (5.5 bpw)', vram: 24, speed: '~23 tok/s on 1x 3090', quality: 'Extended step-by-step reasoning' },
      { name: 'Q6_K (6.5 bpw)', vram: 28, speed: '~22 tok/s on 2x GPU', quality: 'Near-lossless proof generation' },
      { name: 'Q8_0 (8.5 bpw)', vram: 36, speed: '~24 tok/s on 2x 3090', quality: 'Reference accuracy' }
    ],
    contextCostPer8k: 1.8,
    typicalSpeedDual3090: '28 - 35 tokens/sec',
    cloudOffers: ['vast-single-4090']
  },
  {
    id: 'gemma-2-27b',
    name: 'Gemma 2 27B Instruct',
    creator: 'Google DeepMind',
    parameters: '27.2 Billion',
    releaseDate: 'Jun 2024',
    description: 'Punches well above its weight class. Trained on 13T tokens with distillation; rivals early 70B models in dialogue and creative writing.',
    architecture: 'Dense (Sliding Window Attention)',
    flagship: false,
    minVram: 16,
    recommendedVram: 24,
    sweetSpotQuant: 'Q5_K_M or Q6_K on single 24GB',
    quants: [
      { name: 'Q4_K_M (4.5 bpw)', vram: 17, speed: '~34 tok/s on 1x 3090', quality: 'Ultra-fast inference' },
      { name: 'Q5_K_M (5.5 bpw)', vram: 20.5, speed: '~30 tok/s on 1x 3090', quality: 'Sweet spot for 24GB VRAM', recommended: true },
      { name: 'Q6_K (6.5 bpw)', vram: 23.8, speed: '~26 tok/s on 1x 3090', quality: 'Max quality on 1 card' },
      { name: 'Q8_0 (8.5 bpw)', vram: 30, speed: '~28 tok/s on 2x GPU', quality: 'Lossless' }
    ],
    contextCostPer8k: 1.5,
    typicalSpeedDual3090: '32 - 42 tokens/sec',
    cloudOffers: ['runpod-single-3090']
  },
  {
    id: 'gemma-3-27b',
    name: 'Gemma 3 27B Instruct',
    creator: 'Google DeepMind',
    parameters: '27.4 Billion',
    releaseDate: 'Feb 2025',
    description: 'Next-gen architecture from Google with expanded 128K context, native tool use, and superior reasoning compared to Gemma 2.',
    architecture: 'Dense Multimodal-Ready',
    flagship: true,
    minVram: 17,
    recommendedVram: 24,
    sweetSpotQuant: 'Q5_K_M on RTX 3090',
    quants: [
      { name: 'Q4_K_M (4.5 bpw)', vram: 17.2, speed: '~33 tok/s on 1x 3090', quality: 'Fast interactive assistant' },
      { name: 'Q5_K_M (5.5 bpw)', vram: 20.8, speed: '~29 tok/s on 1x 3090', quality: 'Optimal for agent workflows', recommended: true },
      { name: 'Q6_K (6.5 bpw)', vram: 24.1, speed: '~25 tok/s on 1x 3090', quality: 'Zero quality degradation' },
      { name: 'Q8_0 (8.5 bpw)', vram: 30.5, speed: '~27 tok/s on 2x GPU', quality: 'Reference grade' }
    ],
    contextCostPer8k: 1.6,
    typicalSpeedDual3090: '30 - 40 tokens/sec',
    cloudOffers: ['vast-single-3090']
  },
  {
    id: 'qwen-3-32b',
    name: 'Qwen 3 32B Instruct',
    creator: 'Alibaba Cloud',
    parameters: '32.8 Billion',
    releaseDate: 'Jan 2025',
    description: 'Third-generation Qwen model with breakthrough architectural efficiency. Superior token-per-second throughput and 256K native context window.',
    architecture: 'Dense Transformer v3',
    flagship: false,
    minVram: 20,
    recommendedVram: 24,
    sweetSpotQuant: 'Q4_K_M on 24GB GPU',
    quants: [
      { name: 'Q4_K_M (4.5 bpw)', vram: 20.2, speed: '~31 tok/s on 1x 3090', quality: 'Recommended daily driver', recommended: true },
      { name: 'Q5_K_M (5.5 bpw)', vram: 24.2, speed: '~26 tok/s on 1x 3090', quality: 'High reasoning density' },
      { name: 'Q6_K (6.5 bpw)', vram: 28.5, speed: '~24 tok/s on 2x GPU', quality: 'Maximum precision' },
      { name: 'Q8_0 (8.5 bpw)', vram: 36.8, speed: '~27 tok/s on 2x 3090', quality: 'Lossless' }
    ],
    contextCostPer8k: 1.8,
    typicalSpeedDual3090: '32 - 40 tokens/sec',
    cloudOffers: ['runpod-single-4090']
  },
  {
    id: 'command-r-35b',
    name: 'Command R 35B',
    creator: 'Cohere',
    parameters: '35.0 Billion',
    releaseDate: 'Mar 2024',
    description: 'Built specifically for RAG (Retrieval-Augmented Generation) and enterprise multi-step tool use with grounded citation outputs.',
    architecture: 'Dense RAG Specialist',
    flagship: false,
    minVram: 22,
    recommendedVram: 32,
    sweetSpotQuant: 'Q4_K_M on 24GB or Dual GPU',
    quants: [
      { name: 'Q4_K_M (4.5 bpw)', vram: 22.5, speed: '~24 tok/s on 1x 3090', quality: 'Fits on 24GB with 8K context', recommended: true },
      { name: 'Q5_K_M (5.5 bpw)', vram: 26.8, speed: '~21 tok/s on dual GPU', quality: 'Ideal for 128k context RAG' },
      { name: 'Q6_K (6.5 bpw)', vram: 31.0, speed: '~19 tok/s on dual GPU', quality: 'Grounded citation fidelity' },
      { name: 'Q8_0 (8.5 bpw)', vram: 39.5, speed: '~22 tok/s on 2x 3090', quality: 'Research grade' }
    ],
    contextCostPer8k: 2.1,
    typicalSpeedDual3090: '24 - 32 tokens/sec',
    cloudOffers: ['runpod-single-a6000']
  },
  {
    id: 'codestral-22b',
    name: 'Codestral 22B v0.1',
    creator: 'Mistral AI',
    parameters: '22.2 Billion',
    releaseDate: 'May 2024',
    description: 'Trained on 80+ programming languages. Exceptional code completion, fill-in-the-middle (FIM), and test generation with 32K context.',
    architecture: 'Dense Code Specialist',
    flagship: false,
    minVram: 14,
    recommendedVram: 24,
    sweetSpotQuant: 'Q5_K_M or Q6_K on single 24GB',
    quants: [
      { name: 'Q4_K_M (4.5 bpw)', vram: 14.5, speed: '~42 tok/s on 1x 3090', quality: 'Fast editor auto-complete' },
      { name: 'Q5_K_M (5.5 bpw)', vram: 17.2, speed: '~36 tok/s on 1x 3090', quality: 'Sweet spot for IDE copilot', recommended: true },
      { name: 'Q6_K (6.5 bpw)', vram: 19.8, speed: '~32 tok/s on 1x 3090', quality: 'Complex refactoring retention' },
      { name: 'Q8_0 (8.5 bpw)', vram: 25.0, speed: '~34 tok/s on dual GPU', quality: 'Full precision FP16' }
    ],
    contextCostPer8k: 1.4,
    typicalSpeedDual3090: '38 - 50 tokens/sec',
    cloudOffers: ['vast-single-3090']
  },

  // ==========================================
  // 3. 11B - 15B MIDWEIGHT UTILITY MODELS
  // ==========================================
  {
    id: 'mistral-nemo-12b',
    name: 'Mistral NeMo 12B Instruct',
    creator: 'Mistral AI',
    parameters: '12.2 Billion',
    releaseDate: 'Jul 2024',
    description: 'The golden balance between VRAM footprint and intelligence. Runs blazing fast on a single 16GB or 24GB GPU with large 128K context window.',
    architecture: 'Dense Transformer',
    flagship: true,
    minVram: 10,
    recommendedVram: 16,
    sweetSpotQuant: 'Q8_0 on single 24GB or Q4 on 16GB',
    quants: [
      { name: 'Q4_K_M (4.5 bpw)', vram: 8.5, speed: '~65 tok/s on RTX 3090', quality: 'Fast daily assistant' },
      { name: 'Q5_K_M (5.5 bpw)', vram: 10.2, speed: '~58 tok/s on RTX 3090', quality: 'Ideal for 12GB/16GB cards' },
      { name: 'Q6_K (6.5 bpw)', vram: 12.0, speed: '~52 tok/s on RTX 3090', quality: 'Very high fidelity' },
      { name: 'Q8_0 (8.5 bpw)', vram: 15.0, speed: '~45 tok/s on RTX 3090', quality: 'Flawless precision on 1 card', recommended: true }
    ],
    contextCostPer8k: 1.1,
    typicalSpeedDual3090: '50 - 85 tokens/sec',
    cloudOffers: ['vast-single-3090']
  },
  {
    id: 'qwen-2.5-14b',
    name: 'Qwen 2.5 14B Instruct',
    creator: 'Alibaba Cloud',
    parameters: '14.7 Billion',
    releaseDate: 'Sep 2024',
    description: 'Performs on par with older 70B models while fitting easily into a single 16GB card such as the RTX 4060 Ti 16GB (about {price:rtx-4060-ti-16gb} used). Superb coding and mathematical chain-of-thought.',
    architecture: 'Dense Transformer',
    flagship: false,
    minVram: 10,
    recommendedVram: 16,
    sweetSpotQuant: 'Q6_K or Q8_0 on 16GB/24GB',
    quants: [
      { name: 'Q4_K_M (4.5 bpw)', vram: 9.8, speed: '~55 tok/s on 1x 3090', quality: 'Runs easily on RTX 3060 12GB' },
      { name: 'Q5_K_M (5.5 bpw)', vram: 11.6, speed: '~48 tok/s on 1x 3090', quality: 'Best fit for 16GB VRAM' },
      { name: 'Q6_K (6.5 bpw)', vram: 13.5, speed: '~44 tok/s on 1x 3090', quality: 'High accuracy math', recommended: true },
      { name: 'Q8_0 (8.5 bpw)', vram: 17.0, speed: '~38 tok/s on 1x 3090', quality: 'Native FP16 benchmark' }
    ],
    contextCostPer8k: 1.2,
    typicalSpeedDual3090: '45 - 65 tokens/sec',
    cloudOffers: ['runpod-single-3080']
  },
  {
    id: 'deepseek-r1-distill-14b',
    name: 'DeepSeek-R1-Distill-Qwen-14B',
    creator: 'DeepSeek / Alibaba',
    parameters: '14.7 Billion',
    releaseDate: 'Jan 2025',
    description: 'High-efficiency distilled reasoning model. Solves complex algorithmic puzzles and multi-step logic on budget single-GPU rigs.',
    architecture: 'Distilled Reasoning',
    flagship: false,
    minVram: 10,
    recommendedVram: 16,
    sweetSpotQuant: 'Q5_K_M on 16GB or Q8_0 on 24GB',
    quants: [
      { name: 'Q4_K_M (4.5 bpw)', vram: 9.8, speed: '~54 tok/s on 1x 3090', quality: 'Fast reasoning on budget card' },
      { name: 'Q5_K_M (5.5 bpw)', vram: 11.7, speed: '~47 tok/s on 1x 3090', quality: 'Optimal reasoning retention', recommended: true },
      { name: 'Q6_K (6.5 bpw)', vram: 13.6, speed: '~43 tok/s on 1x 3090', quality: 'Near-zero reasoning loss' },
      { name: 'Q8_0 (8.5 bpw)', vram: 17.2, speed: '~38 tok/s on 1x 3090', quality: 'Lossless' }
    ],
    contextCostPer8k: 1.2,
    typicalSpeedDual3090: '45 - 65 tokens/sec',
    cloudOffers: ['vast-single-3080']
  },
  {
    id: 'gemma-3-12b',
    name: 'Gemma 3 12B Instruct',
    creator: 'Google DeepMind',
    parameters: '12.1 Billion',
    releaseDate: 'Feb 2025',
    description: 'Google’s state-of-the-art midweight model with improved instruction following and safety distillation. Fits comfortably in 12GB VRAM.',
    architecture: 'Dense Transformer',
    flagship: false,
    minVram: 9,
    recommendedVram: 16,
    sweetSpotQuant: 'Q6_K on 16GB GPU',
    quants: [
      { name: 'Q4_K_M (4.5 bpw)', vram: 8.4, speed: '~62 tok/s on 1x 3090', quality: 'Fast daily assistant' },
      { name: 'Q5_K_M (5.5 bpw)', vram: 10.1, speed: '~55 tok/s on 1x 3090', quality: 'Great for RTX 3060 12GB' },
      { name: 'Q6_K (6.5 bpw)', vram: 11.8, speed: '~50 tok/s on 1x 3090', quality: 'High reasoning retention', recommended: true },
      { name: 'Q8_0 (8.5 bpw)', vram: 14.8, speed: '~44 tok/s on 1x 3090', quality: 'Reference accuracy' }
    ],
    contextCostPer8k: 1.1,
    typicalSpeedDual3090: '50 - 75 tokens/sec',
    cloudOffers: ['runpod-single-3070']
  },
  {
    id: 'phi-4-14b',
    name: 'Phi-4 14B Instruct',
    creator: 'Microsoft',
    parameters: '14.7 Billion',
    releaseDate: 'Dec 2024',
    description: 'Microsoft’s flagship synthetic-data trained powerhouse. Beats GPT-4-0613 on math benchmarks; excellent for STEM problem-solving on a budget.',
    architecture: 'Dense Synthetic-Trained',
    flagship: true,
    minVram: 10,
    recommendedVram: 16,
    sweetSpotQuant: 'Q5_K_M or Q6_K on 16GB',
    quants: [
      { name: 'Q4_K_M (4.5 bpw)', vram: 9.9, speed: '~56 tok/s on 1x 3090', quality: 'Solid STEM starter' },
      { name: 'Q5_K_M (5.5 bpw)', vram: 11.8, speed: '~49 tok/s on 1x 3090', quality: 'Sweet spot for 16GB VRAM', recommended: true },
      { name: 'Q6_K (6.5 bpw)', vram: 13.7, speed: '~44 tok/s on 1x 3090', quality: 'Near lossless proofs' },
      { name: 'Q8_0 (8.5 bpw)', vram: 17.2, speed: '~39 tok/s on 1x 3090', quality: 'Full accuracy' }
    ],
    contextCostPer8k: 1.2,
    typicalSpeedDual3090: '45 - 65 tokens/sec',
    cloudOffers: ['vast-single-3080']
  },
  {
    id: 'llama-3.2-11b-vision',
    name: 'Llama 3.2 11B Vision Instruct',
    creator: 'Meta',
    parameters: '11.0 Billion',
    releaseDate: 'Sep 2024',
    description: 'Open multimodal vision model for OCR, diagram extraction, chart comprehension, and image captioning on consumer hardware.',
    architecture: 'Multimodal Vision-Language',
    flagship: false,
    minVram: 10,
    recommendedVram: 16,
    sweetSpotQuant: 'Q5_K_M or Q6_K on single GPU',
    quants: [
      { name: 'Q4_K_M (4.5 bpw)', vram: 8.6, speed: '~58 tok/s on 1x 3090', quality: 'General vision understanding' },
      { name: 'Q5_K_M (5.5 bpw)', vram: 10.2, speed: '~52 tok/s on 1x 3090', quality: 'Optimal for OCR & charts', recommended: true },
      { name: 'Q6_K (6.5 bpw)', vram: 11.9, speed: '~47 tok/s on 1x 3090', quality: 'Fine visual detail retention' },
      { name: 'Q8_0 (8.5 bpw)', vram: 14.8, speed: '~41 tok/s on 1x 3090', quality: 'Bit-exact visual embeddings' }
    ],
    contextCostPer8k: 1.1,
    typicalSpeedDual3090: '48 - 70 tokens/sec',
    cloudOffers: ['runpod-single-3080']
  },
  {
    id: 'starcoder2-15b',
    name: 'StarCoder2 15B',
    creator: 'BigCode / ServiceNow',
    parameters: '15.3 Billion',
    releaseDate: 'Feb 2024',
    description: 'Trained on 600+ programming languages from The Stack v2. Transparent, permissively licensed model ideal for commercial local code generation.',
    architecture: 'Dense Code Specialist',
    flagship: false,
    minVram: 11,
    recommendedVram: 16,
    sweetSpotQuant: 'Q5_K_M on 16GB GPU',
    quants: [
      { name: 'Q4_K_M (4.5 bpw)', vram: 10.2, speed: '~52 tok/s on 1x 3090', quality: 'Fast autocomplete' },
      { name: 'Q5_K_M (5.5 bpw)', vram: 12.1, speed: '~46 tok/s on 1x 3090', quality: 'Recommended for codebases', recommended: true },
      { name: 'Q6_K (6.5 bpw)', vram: 14.0, speed: '~41 tok/s on 1x 3090', quality: 'Complex syntax accuracy' },
      { name: 'Q8_0 (8.5 bpw)', vram: 17.8, speed: '~36 tok/s on 1x 3090', quality: 'Full precision FP16' }
    ],
    contextCostPer8k: 1.2,
    typicalSpeedDual3090: '42 - 60 tokens/sec',
    cloudOffers: ['vast-single-3080']
  },

  // ==========================================
  // 4. 7B - 9B ULTRA-BUDGET WORKHORSES
  // ==========================================
  {
    id: 'llama-3.1-8b',
    name: 'Llama 3.1 8B Instruct',
    creator: 'Meta',
    parameters: '8.0 Billion',
    releaseDate: 'Jul 2024',
    description: 'The ultra-budget starter model. Lightning quick token generation, runs comfortably on an RTX 3060 12GB (about {price:rtx-3060-12gb} used) or a used 3080.',
    architecture: 'Dense Transformer',
    flagship: true,
    minVram: 6,
    recommendedVram: 12,
    sweetSpotQuant: 'Q8_0 or FP16 on single 12GB/16GB',
    quants: [
      { name: 'Q4_K_M (4.5 bpw)', vram: 5.8, speed: '~85 tok/s on RTX 3060 12GB', quality: 'Solid for agents & local tools' },
      { name: 'Q5_K_M (5.5 bpw)', vram: 6.8, speed: '~75 tok/s on RTX 3060 12GB', quality: 'High precision on budget cards' },
      { name: 'Q6_K (6.5 bpw)', vram: 7.8, speed: '~68 tok/s on RTX 3060 12GB', quality: 'Near lossless' },
      { name: 'Q8_0 (8.5 bpw)', vram: 9.2, speed: '~60 tok/s on RTX 3060 12GB', quality: 'Full accuracy on budget card', recommended: true }
    ],
    contextCostPer8k: 0.8,
    typicalSpeedDual3090: '90 - 130 tokens/sec',
    cloudOffers: ['runpod-single-3070']
  },
  {
    id: 'qwen-2.5-7b',
    name: 'Qwen 2.5 7B Instruct',
    creator: 'Alibaba Cloud',
    parameters: '7.6 Billion',
    releaseDate: 'Sep 2024',
    description: 'Dominates the 7B category in coding, mathematics, and multilingual benchmarks. The best lightweight general assistant for home rigs.',
    architecture: 'Dense Transformer',
    flagship: false,
    minVram: 6,
    recommendedVram: 12,
    sweetSpotQuant: 'Q8_0 on 12GB card',
    quants: [
      { name: 'Q4_K_M (4.5 bpw)', vram: 5.6, speed: '~88 tok/s on RTX 3060 12GB', quality: 'High speed agents' },
      { name: 'Q5_K_M (5.5 bpw)', vram: 6.6, speed: '~78 tok/s on RTX 3060 12GB', quality: 'Great accuracy' },
      { name: 'Q6_K (6.5 bpw)', vram: 7.6, speed: '~70 tok/s on RTX 3060 12GB', quality: 'Near lossless' },
      { name: 'Q8_0 (8.5 bpw)', vram: 8.9, speed: '~62 tok/s on RTX 3060 12GB', quality: 'Lossless FP16 parity', recommended: true }
    ],
    contextCostPer8k: 0.8,
    typicalSpeedDual3090: '95 - 135 tokens/sec',
    cloudOffers: ['vast-single-3070']
  },
  {
    id: 'deepseek-r1-distill-8b',
    name: 'DeepSeek-R1-Distill-Qwen-8B',
    creator: 'DeepSeek / Alibaba',
    parameters: '8.2 Billion',
    releaseDate: 'Jan 2025',
    description: 'Remarkable step-by-step mathematical reasoning distilled into an 8B model. Runs fast on budget 12GB graphics cards.',
    architecture: 'Distilled Reasoning',
    flagship: false,
    minVram: 6,
    recommendedVram: 12,
    sweetSpotQuant: 'Q8_0 on RTX 3060 12GB',
    quants: [
      { name: 'Q4_K_M (4.5 bpw)', vram: 6.0, speed: '~82 tok/s on RTX 3060', quality: 'Quick thinking' },
      { name: 'Q5_K_M (5.5 bpw)', vram: 7.0, speed: '~72 tok/s on RTX 3060', quality: 'Solid step-by-step logic' },
      { name: 'Q6_K (6.5 bpw)', vram: 8.0, speed: '~65 tok/s on RTX 3060', quality: 'High reasoning fidelity' },
      { name: 'Q8_0 (8.5 bpw)', vram: 9.5, speed: '~58 tok/s on RTX 3060', quality: 'Lossless reasoning', recommended: true }
    ],
    contextCostPer8k: 0.8,
    typicalSpeedDual3090: '85 - 125 tokens/sec',
    cloudOffers: ['runpod-single-3070']
  },
  {
    id: 'gemma-2-9b',
    name: 'Gemma 2 9B Instruct',
    creator: 'Google DeepMind',
    parameters: '9.2 Billion',
    releaseDate: 'Jun 2024',
    description: 'Trained on high-quality web text and math with knowledge distillation. Offers extraordinary writing fluency and logic in a 9B footprint.',
    architecture: 'Dense (Sliding Window Attention)',
    flagship: false,
    minVram: 7,
    recommendedVram: 12,
    sweetSpotQuant: 'Q8_0 on RTX 3060 12GB',
    quants: [
      { name: 'Q4_K_M (4.5 bpw)', vram: 6.5, speed: '~80 tok/s on RTX 3060', quality: 'Fast chat' },
      { name: 'Q5_K_M (5.5 bpw)', vram: 7.6, speed: '~70 tok/s on RTX 3060', quality: 'Balanced quality' },
      { name: 'Q6_K (6.5 bpw)', vram: 8.8, speed: '~64 tok/s on RTX 3060', quality: 'High writing fidelity' },
      { name: 'Q8_0 (8.5 bpw)', vram: 10.8, speed: '~55 tok/s on RTX 3060', quality: 'Full accuracy', recommended: true }
    ],
    contextCostPer8k: 0.9,
    typicalSpeedDual3090: '80 - 120 tokens/sec',
    cloudOffers: ['runpod-single-3070']
  },
  {
    id: 'mistral-7b-v03',
    name: 'Mistral 7B v0.3 Instruct',
    creator: 'Mistral AI',
    parameters: '7.3 Billion',
    releaseDate: 'May 2024',
    description: 'The updated 7B standard from Mistral AI with native function calling support and 32K context window. Reliable and battle-tested.',
    architecture: 'Dense Transformer',
    flagship: false,
    minVram: 6,
    recommendedVram: 12,
    sweetSpotQuant: 'Q8_0 on 12GB card',
    quants: [
      { name: 'Q4_K_M (4.5 bpw)', vram: 5.4, speed: '~90 tok/s on RTX 3060', quality: 'Lightweight agent runner' },
      { name: 'Q5_K_M (5.5 bpw)', vram: 6.3, speed: '~80 tok/s on RTX 3060', quality: 'Solid daily driver' },
      { name: 'Q6_K (6.5 bpw)', vram: 7.3, speed: '~72 tok/s on RTX 3060', quality: 'High quality tool use' },
      { name: 'Q8_0 (8.5 bpw)', vram: 8.6, speed: '~64 tok/s on RTX 3060', quality: 'Lossless standard', recommended: true }
    ],
    contextCostPer8k: 0.8,
    typicalSpeedDual3090: '95 - 135 tokens/sec',
    cloudOffers: ['vast-single-3070']
  },
  {
    id: 'qwen-3-8b',
    name: 'Qwen 3 8B Instruct',
    creator: 'Alibaba Cloud',
    parameters: '8.2 Billion',
    releaseDate: 'Jan 2025',
    description: 'Next-gen 8B model with improved attention layers and 128K context. Outperforms earlier 14B models on multiple synthetic coding tests.',
    architecture: 'Dense Transformer v3',
    flagship: false,
    minVram: 6,
    recommendedVram: 12,
    sweetSpotQuant: 'Q8_0 on RTX 3060 12GB',
    quants: [
      { name: 'Q4_K_M (4.5 bpw)', vram: 5.9, speed: '~88 tok/s on RTX 3060', quality: 'Fast assistant' },
      { name: 'Q5_K_M (5.5 bpw)', vram: 6.9, speed: '~78 tok/s on RTX 3060', quality: 'High reasoning density' },
      { name: 'Q6_K (6.5 bpw)', vram: 8.0, speed: '~70 tok/s on RTX 3060', quality: 'Zero quantization loss in code' },
      { name: 'Q8_0 (8.5 bpw)', vram: 9.4, speed: '~62 tok/s on RTX 3060', quality: 'Full accuracy', recommended: true }
    ],
    contextCostPer8k: 0.8,
    typicalSpeedDual3090: '90 - 130 tokens/sec',
    cloudOffers: ['runpod-single-3070']
  },
  {
    id: 'phi-4-mini',
    name: 'Phi-4-mini 3.8B',
    creator: 'Microsoft',
    parameters: '3.8 Billion',
    releaseDate: 'Jan 2025',
    description: 'Sub-4B marvel delivering reasoning capabilities comparable to larger 7B models. Runs blazingly fast on almost any modern GPU or APU.',
    architecture: 'Ultra-Lightweight Dense',
    flagship: false,
    minVram: 4,
    recommendedVram: 8,
    sweetSpotQuant: 'Q8_0 or FP16 (under 5 GB VRAM)',
    quants: [
      { name: 'Q4_K_M (4.5 bpw)', vram: 3.1, speed: '~140 tok/s on RTX 3060', quality: 'Instantaneous response' },
      { name: 'Q5_K_M (5.5 bpw)', vram: 3.6, speed: '~125 tok/s on RTX 3060', quality: 'High reasoning for size' },
      { name: 'Q6_K (6.5 bpw)', vram: 4.1, speed: '~115 tok/s on RTX 3060', quality: 'Flawless math chains' },
      { name: 'Q8_0 (8.5 bpw)', vram: 4.8, speed: '~100 tok/s on RTX 3060', quality: 'Uncompressed precision', recommended: true }
    ],
    contextCostPer8k: 0.5,
    typicalSpeedDual3090: '140 - 200 tokens/sec',
    cloudOffers: ['vast-single-3060']
  },
  {
    id: 'llama-3.2-3b',
    name: 'Llama 3.2 3B Instruct',
    creator: 'Meta',
    parameters: '3.2 Billion',
    releaseDate: 'Sep 2024',
    description: 'Ultra-fast on-device model from Meta. Perfect for real-time background classification, summarization, and offline edge systems.',
    architecture: 'Edge Lightweight Transformer',
    flagship: false,
    minVram: 3,
    recommendedVram: 8,
    sweetSpotQuant: 'Q8_0 or FP16',
    quants: [
      { name: 'Q4_K_M (4.5 bpw)', vram: 2.6, speed: '~160 tok/s on RTX 3060', quality: 'Real-time classification' },
      { name: 'Q5_K_M (5.5 bpw)', vram: 3.0, speed: '~145 tok/s on RTX 3060', quality: 'Great edge assistant' },
      { name: 'Q6_K (6.5 bpw)', vram: 3.4, speed: '~130 tok/s on RTX 3060', quality: 'High quality summary' },
      { name: 'Q8_0 (8.5 bpw)', vram: 4.0, speed: '~115 tok/s on RTX 3060', quality: 'FP16 equivalent', recommended: true }
    ],
    contextCostPer8k: 0.4,
    typicalSpeedDual3090: '160 - 220 tokens/sec',
    cloudOffers: ['runpod-single-3060']
  },

  // ==========================================
  // 5. MIXTURE OF EXPERTS (MoE) & COLOSSAL
  // ==========================================
  {
    id: 'mixtral-8x7b',
    name: 'Mixtral 8x7B Instruct',
    creator: 'Mistral AI',
    parameters: '46.7B MoE (12.9B active)',
    releaseDate: 'Dec 2023',
    description: 'The breakthrough sparse MoE model. Routes each token through 2 of 8 expert networks; executes at 13B speed while matching 70B quality.',
    architecture: 'Sparse Mixture-of-Experts (MoE)',
    flagship: true,
    minVram: 28,
    recommendedVram: 48,
    sweetSpotQuant: 'Q4_K_M or Q5_K_M on dual 24GB GPUs',
    quants: [
      { name: 'Q4_K_M (4.5 bpw)', vram: 29.5, speed: '~36 tok/s on 2x 3090', quality: 'Sweet spot for dual GPU', recommended: true },
      { name: 'Q5_K_M (5.5 bpw)', vram: 35.0, speed: '~30 tok/s on 2x 3090', quality: 'Near lossless expert routing' },
      { name: 'Q6_K (6.5 bpw)', vram: 41.0, speed: '~25 tok/s on 2x 3090', quality: 'Maximum fidelity MoE' },
      { name: 'Q8_0 (8.5 bpw)', vram: 52.0, speed: '~18 tok/s on 3x GPU / Mac', quality: 'Bit-exact FP16' }
    ],
    contextCostPer8k: 1.8,
    typicalSpeedDual3090: '32 - 42 tokens/sec',
    cloudOffers: ['runpod-dual-3090']
  },
  {
    id: 'mixtral-8x22b',
    name: 'Mixtral 8x22B Instruct',
    creator: 'Mistral AI',
    parameters: '141B MoE (39B active)',
    releaseDate: 'Apr 2024',
    description: 'High-capacity multilingual MoE powerhouse with 65K context. Exceptional code synthesis, math reasoning, and native function calling.',
    architecture: 'Sparse Mixture-of-Experts (MoE)',
    flagship: false,
    minVram: 75,
    recommendedVram: 96,
    sweetSpotQuant: 'Q4_K_M (Mac Studio 128GB or Quad 3090)',
    quants: [
      { name: 'Q3_K_M (3.4 bpw)', vram: 68, speed: '~16 tok/s on 4x 3090', quality: 'Acceptable compression' },
      { name: 'Q4_K_M (4.5 bpw)', vram: 85, speed: '~13 tok/s on 4x 3090', quality: 'Production standard', recommended: true },
      { name: 'Q5_K_M (5.5 bpw)', vram: 102, speed: '~10 tok/s on Mac 128GB', quality: 'Near lossless 141B' },
      { name: 'Q8_0 (8.5 bpw)', vram: 155, speed: '~6 tok/s on Mac 192GB', quality: 'Full precision' }
    ],
    contextCostPer8k: 3.5,
    typicalSpeedDual3090: 'Needs 4x GPU or Mac Studio 128GB',
    cloudOffers: ['lambda-quad-a100']
  },
  {
    id: 'command-r-plus',
    name: 'Command R+ 104B',
    creator: 'Cohere',
    parameters: '104 Billion',
    releaseDate: 'Apr 2024',
    description: 'State-of-the-art enterprise RAG and multi-step tool use model. Excels in 10 multilingual business domains with grounded factual citations.',
    architecture: 'Dense Enterprise Specialist',
    flagship: false,
    minVram: 58,
    recommendedVram: 72,
    sweetSpotQuant: 'Q4_K_M on Triple/Quad GPU or Mac 96GB+',
    quants: [
      { name: 'Q3_K_M (3.4 bpw)', vram: 52, speed: '~12 tok/s on 3x 3090', quality: 'Good for long document RAG' },
      { name: 'Q4_K_M (4.5 bpw)', vram: 64, speed: '~10 tok/s on 3x/4x 3090', quality: 'Optimal for corporate agents', recommended: true },
      { name: 'Q5_K_M (5.5 bpw)', vram: 76, speed: '~8 tok/s on Mac 96GB/128GB', quality: 'Flawless enterprise citations' },
      { name: 'Q8_0 (8.5 bpw)', vram: 112, speed: '~5 tok/s on Mac 128GB+', quality: 'Bit-exact FP16' }
    ],
    contextCostPer8k: 3.2,
    typicalSpeedDual3090: 'Needs 3x-4x 3090 or Mac Studio 96GB+',
    cloudOffers: ['runpod-quad-4090']
  },
  {
    id: 'deepseek-v3-moe',
    name: 'DeepSeek V3 671B MoE (Notes)',
    creator: 'DeepSeek',
    parameters: '671B MoE (37B active)',
    releaseDate: 'Dec 2024',
    description: 'The monumental 671B open-weights model trained with Multi-Head Latent Attention. Requires Mac Studio 192GB or dual-node clustering for full local weights.',
    architecture: 'Colossal Sparse MoE (MLA)',
    flagship: false,
    minVram: 140,
    recommendedVram: 192,
    sweetSpotQuant: 'Q2_K / Q3_K on Mac Studio 192GB Unified Memory',
    quants: [
      { name: 'Q2_K (2.5 bpw)', vram: 140, speed: '~12 tok/s on Mac 192GB', quality: 'Quantized flagship at home', recommended: true },
      { name: 'Q3_K_M (3.4 bpw)', vram: 185, speed: '~9 tok/s on Mac 192GB', quality: 'Near-native 671B reasoning' },
      { name: 'Q4_K_M (4.5 bpw)', vram: 240, speed: '~6 tok/s (dual Mac Studio)', quality: 'Zero quantization degradation' },
      { name: 'FP8 (8.0 bpw)', vram: 420, speed: '~14 tok/s (8x H100 cluster)', quality: 'Official datacenter release' }
    ],
    contextCostPer8k: 4.8,
    typicalSpeedDual3090: 'Exceeds dual GPU memory (Mac 192GB required)',
    cloudOffers: ['vast-8x-h100'],
    cloudNote: 'or the DeepSeek API'
  },
  {
    id: 'deepseek-r1-full',
    name: 'DeepSeek R1 671B Full Reasoning',
    creator: 'DeepSeek',
    parameters: '671B MoE (37B active)',
    releaseDate: 'Jan 2025',
    description: 'The full open-weights R1 frontier model with uncensored pure reasoning. Operates with emergent reflective reasoning chains matching OpenAI o1.',
    architecture: 'Colossal Frontier Reasoning MoE',
    flagship: false,
    minVram: 140,
    recommendedVram: 192,
    sweetSpotQuant: 'Q2_K / Q3_K on Mac Studio 192GB Unified',
    quants: [
      { name: 'Q2_K (2.5 bpw)', vram: 142, speed: '~12 tok/s on Mac 192GB', quality: 'Best consumer-grade fit', recommended: true },
      { name: 'Q3_K_M (3.4 bpw)', vram: 186, speed: '~9 tok/s on Mac 192GB', quality: 'Full chain of thought retention' },
      { name: 'Q4_K_M (4.5 bpw)', vram: 245, speed: '~6 tok/s (clustered node)', quality: 'Near-lossless frontier' },
      { name: 'FP8 (8.0 bpw)', vram: 425, speed: '~14 tok/s (8x H100 cluster)', quality: 'Datacenter reference' }
    ],
    contextCostPer8k: 4.8,
    typicalSpeedDual3090: 'Exceeds dual GPU memory (Mac 192GB required)',
    cloudOffers: ['vast-8x-h100'],
    cloudNote: 'or the DeepSeek API'
  }
];
