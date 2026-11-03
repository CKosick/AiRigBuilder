// Spec-only supplement for the Rig Playground (/playground).
// Popular gaming GPUs that visitors may already own, which are not tracked in GPUS_DATA.
// Contains vendor-sourced specifications (VRAM, memory bandwidth, TDP) with no pricing.

export const OWNED_GPUS_SUPPLEMENT = [
  {
    // Vendor source: NVIDIA GeForce RTX 4070 specifications (nvidia.com)
    // 12GB GDDR6X, 192-bit bus @ 21 Gbps = 504 GB/s, 200W TGP
    id: 'rtx-4070',
    name: 'NVIDIA GeForce RTX 4070',
    vram: 12,
    vramType: 'GDDR6X',
    bandwidth: 504,
    tdp: 200,
    supplement: true
  },
  {
    // Vendor source: NVIDIA GeForce RTX 4070 Ti specifications (nvidia.com)
    // 12GB GDDR6X, 192-bit bus @ 21 Gbps = 504 GB/s, 285W TGP
    id: 'rtx-4070-ti',
    name: 'NVIDIA GeForce RTX 4070 Ti',
    vram: 12,
    vramType: 'GDDR6X',
    bandwidth: 504,
    tdp: 285,
    supplement: true
  },
  {
    // Vendor source: NVIDIA GeForce RTX 3080 12GB specifications (nvidia.com)
    // 12GB GDDR6X, 384-bit bus @ 19 Gbps = 912 GB/s, 350W TDP
    id: 'rtx-3080-12gb',
    name: 'NVIDIA GeForce RTX 3080 12GB',
    vram: 12,
    vramType: 'GDDR6X',
    bandwidth: 912,
    tdp: 350,
    supplement: true
  },
  {
    // Vendor source: NVIDIA GeForce RTX 3070 specifications (nvidia.com)
    // 8GB GDDR6, 256-bit bus @ 14 Gbps = 448 GB/s, 220W TDP
    id: 'rtx-3070',
    name: 'NVIDIA GeForce RTX 3070',
    vram: 8,
    vramType: 'GDDR6',
    bandwidth: 448,
    tdp: 220,
    supplement: true
  },
  {
    // Vendor source: NVIDIA GeForce RTX 2080 Ti specifications (nvidia.com)
    // 11GB GDDR6, 352-bit bus @ 14 Gbps = 616 GB/s, 250W TDP
    id: 'rtx-2080-ti',
    name: 'NVIDIA GeForce RTX 2080 Ti',
    vram: 11,
    vramType: 'GDDR6',
    bandwidth: 616,
    tdp: 250,
    supplement: true
  },
  {
    // Vendor source: AMD Radeon RX 7800 XT specifications (amd.com)
    // 16GB GDDR6, 256-bit bus @ 19.5 Gbps = 624 GB/s, 263W Typical Board Power
    id: 'rx-7800-xt',
    name: 'AMD Radeon RX 7800 XT',
    vram: 16,
    vramType: 'GDDR6',
    bandwidth: 624,
    tdp: 263,
    supplement: true
  },
  {
    // Vendor source: AMD Radeon RX 6800 XT specifications (amd.com)
    // 16GB GDDR6, 256-bit bus @ 16 Gbps = 512 GB/s, 300W Typical Board Power
    id: 'rx-6800-xt',
    name: 'AMD Radeon RX 6800 XT',
    vram: 16,
    vramType: 'GDDR6',
    bandwidth: 512,
    tdp: 300,
    supplement: true
  }
];
