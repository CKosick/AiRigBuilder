// Curated comparison pairs and best-GPU models for airigbuilder.com
// Single source of truth for /compare/:a-vs-:b and /best-gpu/:model routes.

export const COMPARISON_PAIRS = [
  ['rtx-3090', 'rtx-4090'],
  ['rtx-3090', 'rtx-5090'],
  ['rtx-4090', 'rtx-5090'],
  ['rtx-3090', 'rx-7900-xtx'],
  ['rtx-3080-10gb', 'rtx-4060-ti-16gb'],
  ['rtx-3060-12gb', 'rtx-4060-ti-16gb'],
  ['tesla-p40', 'rtx-3090'],
  ['rtx-a5000', 'rtx-3090'],
  ['rtx-4080-super', 'rx-7900-xtx'],
  ['rtx-4060-ti-16gb', 'rtx-5060-ti-16gb']
];

export const BEST_GPU_MODELS = [
  'llama-3.3-70b',
  'deepseek-r1-70b',
  'qwen-2.5-coder-32b',
  'codestral-22b',
  'gemma-3-27b',
  'mixtral-8x22b',
  'command-r-plus',
  'qwen-3-32b'
];

export const comparisonSlug = (a, b) => `${a}-vs-${b}`;
export const comparePath = (a, b) => `/compare/${a}-vs-${b}`;
export const bestGpuPath = (modelId) => `/best-gpu/${modelId}`;

export function findComparisonPair(slug) {
  const parts = slug.split('-vs-');
  if (parts.length !== 2) return null;
  return COMPARISON_PAIRS.find(([a, b]) => a === parts[0] && b === parts[1]) || null;
}

export function getComparisonsForGpu(gpuId) {
  return COMPARISON_PAIRS.filter(([a, b]) => a === gpuId || b === gpuId);
}

export function isBestGpuModel(modelId) {
  return BEST_GPU_MODELS.includes(modelId);
}
