// Hardware Guide & Gotchas Component (airigbuilder.com)
// Actionable enthusiast wisdom to avoid costly multi-GPU mistakes

export function createHardwareGuide(container) {
  container.innerHTML = `
    <div style="margin-bottom: 1.5rem;">
      <h2 style="font-size: 1.4rem; font-weight: 800; color: var(--text-highlight);">
        Local AI Hardware Guide & Crucial Gotchas
      </h2>
      <p style="font-size: 0.88rem; color: var(--text-muted); margin-top: 4px;">
        Building a multi-GPU local AI rig is not like building a gaming PC. Here are the 5 critical architectural traps to avoid.
      </p>
    </div>

    <div class="guide-grid">
      <!-- Gotcha 1 -->
      <div class="guide-card warning-card">
        <h3>⚡ 1. The 3090 Transient Spike & PSU Trap</h3>
        <p>
          RTX 3090 cards suffer from notorious 1ms to 10ms transient power spikes up to <strong>550W per card</strong>. Dual 3090s can momentarily demand <strong>1,200W+</strong> from your power supply rail.
        </p>
        <ul>
          <li><strong>Never daisy-chain:</strong> Run 4 separate, dedicated 8-pin PCIe cables from the PSU to the GPUs. Sharing a pigtail cable risks melting connectors.</li>
          <li><strong>PSU Standard:</strong> Choose an <strong>ATX 3.0 / PCIe 5.0 certified 1000W or 1200W PSU</strong> (e.g., Corsair RM1000x Shift, Seasonic Focus GX-1000). ATX 3.0 PSUs are rated to absorb 200% transient power spikes without tripping OCP.</li>
        </ul>
      </div>

      <!-- Gotcha 2 -->
      <div class="guide-card">
        <h3>📏 2. Physical Motherboard Slot Spacing</h3>
        <p>
          Most RTX 3090 cards are <strong>2.7 to 3 slots thick</strong> (55mm to 62mm). If your motherboard places the two PCIe x16 slots only 2 slots apart, the top card will be completely smothered and overheat to 95°C.
        </p>
        <ul>
          <li><strong>Ideal Motherboard:</strong> The <strong>ASUS ProArt X670E-Creator WiFi</strong> or <strong>ASRock Creator</strong> feature a 3-slot gap between PCIe slots (slot 1 and slot 5), allowing both thick cards to breathe.</li>
          <li><strong>Alternative on Budget Boards:</strong> Use a <strong>shielded PCIe 4.0 x16 riser cable</strong> ($25) and vertically mount or bottom-bracket mount the secondary card in a spacious full-tower case.</li>
        </ul>
      </div>

      <!-- Gotcha 3 -->
      <div class="guide-card info-card">
        <h3>🧠 3. PCIe Bandwidth: Does x16 vs x8 vs x4 Matter?</h3>
        <p>
          In gaming, running at PCIe x4 hurts frame rates. <strong>In LLM inference, it barely matters.</strong>
        </p>
        <ul>
          <li><strong>Model Loading:</strong> A model file transfers from SSD to VRAM in ~8s over x16, or ~14s over x4. This only happens once when the server boots.</li>
          <li><strong>Inference Token Generation:</strong> In tensor-parallel (vLLM / exllamav2), GPUs only exchange tiny activation vectors between layers. A secondary card on PCIe 3.0 x4 sees <strong>less than 3% drop in tokens/second</strong> compared to x16.</li>
          <li><strong>Takeaway:</strong> You do NOT need a $2,000 Threadripper or EPYC motherboard just to run 70B models! Standard consumer AM4/AM5 boards work wonders.</li>
        </ul>
      </div>

      <!-- Gotcha 4 -->
      <div class="guide-card">
        <h3>🧮 4. The Exact VRAM Math Formula</h3>
        <p>
          Never guess whether a model fits in your VRAM. Use this exact community equation:
        </p>
        <div style="background: rgba(0, 0, 0, 0.4); padding: 0.75rem 1rem; border-radius: var(--radius-sm); font-family: var(--font-mono); font-size: 0.82rem; color: var(--emerald); margin-bottom: 0.75rem;">
          Total VRAM (GB) = (Params × Bits_Per_Weight / 8) × 1.08 + KV_Cache_Overhead
        </div>
        <ul>
          <li><strong>Weights:</strong> Llama 70B at Q4_K_M (4.5 bpw) = (70 × 4.5 / 8) × 1.08 = <strong>42.5 GB</strong>.</li>
          <li><strong>KV Cache (16K context):</strong> ~2.4 GB.</li>
          <li><strong>Total Needed:</strong> 44.9 GB. Dual 24GB GPUs give <strong>48 GB</strong> — leaving 3.1 GB of safety buffer!</li>
        </ul>
      </div>

      <!-- Gotcha 5 -->
      <div class="guide-card">
        <h3>🥊 5. Why Dual Used 3090 Beats Single RTX 4090 for LLMs</h3>
        <p>
          Buyers often ask: "Should I just buy one new RTX 4090 ($1,750) instead of two used 3090s ($1,390)?"
        </p>
        <ul>
          <li><strong>The VRAM Wall:</strong> A 4090 only has 24GB. It cannot load a 70B model into VRAM. Offloading half the layers to system RAM drops generation speed from <strong>20 tokens/sec down to 1.5 tokens/sec</strong>.</li>
          <li><strong>The Dual 3090 Advantage:</strong> Dual 3090s give <strong>48GB VRAM</strong>. The entire 70B model fits into ultra-fast GDDR6X, giving silky smooth real-time generation.</li>
          <li><strong>Bottom line:</strong> VRAM capacity is king for local LLMs. Bandwidth and FLOPS only matter after the weights fit in memory.</li>
        </ul>
      </div>

      <!-- Gotcha 6 -->
      <div class="guide-card info-card">
        <h3>🌡️ 6. Memory Junction Thermals on Used Ampere Cards</h3>
        <p>
          The RTX 3090 has 12GB of VRAM on the front of the PCB and 12GB on the back. The rear memory chips are cooled only by the backplate.
        </p>
        <ul>
          <li><strong>Check Junction Temp:</strong> During heavy inference, monitor memory temperature with <code>nvidia-smi</code>. Keep VRAM junction below 95°C.</li>
          <li><strong>Thermal Pad Refresh:</strong> If buying a heavily used card on eBay, consider replacing thermal pads (e.g., Thermalright Odyssey 1.5mm) or adding small heatsinks to the metal backplate.</li>
        </ul>
      </div>
    </div>
  `;
}
