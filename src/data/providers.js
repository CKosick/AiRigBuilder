// Cloud GPU providers and hourly rates for break-even calculations
export const CLOUD_PROVIDERS = [
  {
    id: 'runpod-dual-3090',
    name: 'RunPod (2x RTX 3090 48GB)',
    category: 'Dual 24GB (70B Ready)',
    hourlyRate: 0.88,
    storageCostPerMonth: 7.00, // Volume disk per month
    setupFee: 0,
    reliability: '99.5%',
    notes: 'Secure cloud instance with persistent network volume.'
  },
  {
    id: 'vast-dual-3090',
    name: 'Vast.ai (2x RTX 3090 48GB)',
    category: 'Dual 24GB (70B Ready)',
    hourlyRate: 0.72,
    storageCostPerMonth: 6.00,
    setupFee: 0,
    reliability: '98.5% (Community host)',
    notes: 'Lowest cost cloud option, variable host upload/download speeds.'
  },
  {
    id: 'runpod-dual-4090',
    name: 'RunPod (2x RTX 4090 48GB)',
    category: 'Dual 24GB High Speed',
    hourlyRate: 1.48,
    storageCostPerMonth: 7.00,
    setupFee: 0,
    reliability: '99.5%',
    notes: 'Blazing token generation speeds.'
  },
  {
    id: 'lambda-a100-80gb',
    name: 'Lambda Labs (1x A100 80GB SXM4)',
    category: 'Datacenter 80GB',
    hourlyRate: 1.89,
    storageCostPerMonth: 10.00,
    setupFee: 0,
    reliability: '99.9%',
    notes: 'Enterprise datacenter SXM4 with 2000 GB/s bandwidth.'
  },
  {
    id: 'runpod-single-3090',
    name: 'RunPod (1x RTX 3090 24GB)',
    category: 'Single 24GB (8B-24B)',
    hourlyRate: 0.44,
    storageCostPerMonth: 5.00,
    setupFee: 0,
    reliability: '99.5%',
    notes: 'Single GPU instance for 8B-24B models.'
  },
  {
    id: 'vast-single-3090',
    name: 'Vast.ai (1x RTX 3090 24GB)',
    category: 'Single 24GB (8B-24B)',
    hourlyRate: 0.36,
    storageCostPerMonth: 4.50,
    setupFee: 0,
    reliability: '98.5%',
    notes: 'Budget single 24GB cloud instance.'
  }
];
