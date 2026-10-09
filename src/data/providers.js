// Cloud GPU hourly rates, one entry per offer. The break-even calculator's providers below and
// every model's cloud alternative (models.js cloudOffers) read their rate from here.
export const CLOUD_RATES = {
  'runpod-dual-3090': { label: 'RunPod 2x RTX 3090', hourlyRate: 0.88 },
  'vast-dual-3090': { label: 'Vast.ai 2x RTX 3090', hourlyRate: 0.72 },
  'runpod-dual-4090': { label: 'RunPod 2x RTX 4090', hourlyRate: 1.48 },
  'runpod-dual-a6000': { label: 'RunPod 2x RTX A6000', hourlyRate: 1.60 },
  'lambda-a100-80gb': { label: 'Lambda 1x A100 80GB', hourlyRate: 1.89 },
  'runpod-single-3090': { label: 'RunPod 1x RTX 3090', hourlyRate: 0.44 },
  'vast-single-3090': { label: 'Vast.ai 1x RTX 3090', hourlyRate: 0.36 },
  'runpod-single-4090': { label: 'RunPod 1x RTX 4090', hourlyRate: 0.74 },
  'vast-single-4090': { label: 'Vast.ai 1x RTX 4090', hourlyRate: 0.45 },
  'runpod-single-a6000': { label: 'RunPod 1x RTX A6000', hourlyRate: 0.79 },
  'runpod-single-3080': { label: 'RunPod 1x RTX 3080', hourlyRate: 0.29 },
  'vast-single-3080': { label: 'Vast.ai 1x RTX 3080', hourlyRate: 0.25 },
  'runpod-single-3070': { label: 'RunPod 1x RTX 3070', hourlyRate: 0.22 },
  'vast-single-3070': { label: 'Vast.ai 1x RTX 3070', hourlyRate: 0.18 },
  'runpod-single-3060': { label: 'RunPod 1x RTX 3060', hourlyRate: 0.15 },
  'vast-single-3060': { label: 'Vast.ai 1x RTX 3060', hourlyRate: 0.12 },
  'runpod-quad-4090': { label: 'RunPod 4x RTX 4090', hourlyRate: 2.96 },
  'lambda-quad-a100': { label: 'Lambda 4x A100 80GB', hourlyRate: 6.00 },
  'vast-8x-h100': { label: 'Vast.ai 8x H100', hourlyRate: 16.00 },
};

// Providers offered in the break-even calculator
export const CLOUD_PROVIDERS = [
  {
    id: 'runpod-dual-3090',
    name: 'RunPod (2x RTX 3090 48GB)',
    category: 'Dual 24GB (70B Ready)',
    hourlyRate: CLOUD_RATES['runpod-dual-3090'].hourlyRate,
    storageCostPerMonth: 7.00, // Volume disk per month
    setupFee: 0,
    reliability: '99.5%',
    notes: 'Secure cloud instance with persistent network volume.'
  },
  {
    id: 'vast-dual-3090',
    name: 'Vast.ai (2x RTX 3090 48GB)',
    category: 'Dual 24GB (70B Ready)',
    hourlyRate: CLOUD_RATES['vast-dual-3090'].hourlyRate,
    storageCostPerMonth: 6.00,
    setupFee: 0,
    reliability: '98.5% (Community host)',
    notes: 'Lowest cost cloud option, variable host upload/download speeds.'
  },
  {
    id: 'runpod-dual-4090',
    name: 'RunPod (2x RTX 4090 48GB)',
    category: 'Dual 24GB High Speed',
    hourlyRate: CLOUD_RATES['runpod-dual-4090'].hourlyRate,
    storageCostPerMonth: 7.00,
    setupFee: 0,
    reliability: '99.5%',
    notes: 'Blazing token generation speeds.'
  },
  {
    id: 'lambda-a100-80gb',
    name: 'Lambda Labs (1x A100 80GB SXM4)',
    category: 'Datacenter 80GB',
    hourlyRate: CLOUD_RATES['lambda-a100-80gb'].hourlyRate,
    storageCostPerMonth: 10.00,
    setupFee: 0,
    reliability: '99.9%',
    notes: 'Enterprise datacenter SXM4 with 2000 GB/s bandwidth.'
  },
  {
    id: 'runpod-single-3090',
    name: 'RunPod (1x RTX 3090 24GB)',
    category: 'Single 24GB (8B-24B)',
    hourlyRate: CLOUD_RATES['runpod-single-3090'].hourlyRate,
    storageCostPerMonth: 5.00,
    setupFee: 0,
    reliability: '99.5%',
    notes: 'Single GPU instance for 8B-24B models.'
  },
  {
    id: 'vast-single-3090',
    name: 'Vast.ai (1x RTX 3090 24GB)',
    category: 'Single 24GB (8B-24B)',
    hourlyRate: CLOUD_RATES['vast-single-3090'].hourlyRate,
    storageCostPerMonth: 4.50,
    setupFee: 0,
    reliability: '98.5%',
    notes: 'Budget single 24GB cloud instance.'
  }
];
