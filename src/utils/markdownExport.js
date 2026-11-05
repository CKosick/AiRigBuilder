import { GPUS_UPDATED_AT } from '../data/gpus.js';

/**
 * Builds a copyable Markdown parts list for a build sheet tier.
 *
 * @param {{ name: string }} model - Target model object
 * @param {{
 *   name: string,
 *   parts: Array<{ category?: string, name: string, spec: string, price: number, merchant?: string, url?: string }>,
 *   fit?: { status?: string, quant?: string },
 *   speedLine?: string | null
 * }} tier - Build sheet tier object
 * @param {string} canonicalUrl - Canonical page URL
 * @returns {string} Formatted Markdown text
 */
export function buildPartsListMarkdown(model, tier, canonicalUrl) {
  if (!model || !tier) return '';

  const modelName = model.name || '';
  const tierName = tier.name || '';
  const heading = `**${modelName} — ${tierName}**`;

  let fitSummary = '';
  if (tier.fit) {
    if (tier.fit.status === 'none') {
      fitSummary = "Won't fit";
    } else {
      const quant = tier.fit.quant || '';
      const verdict = tier.fit.status || '';
      fitSummary = quant ? `${quant} (${verdict})` : verdict;
    }
  }

  let fitLine = '';
  if (fitSummary && tier.speedLine) {
    fitLine = `Fit: ${fitSummary}. ${tier.speedLine}`;
  } else if (fitSummary) {
    fitLine = `Fit: ${fitSummary}`;
  } else if (tier.speedLine) {
    fitLine = tier.speedLine;
  }

  const tableHeader = '| Part | Spec | Price | Buy |\n| :--- | :--- | :--- | :--- |';
  const rows = (tier.parts || []).map(p => {
    const partName = p.category ? `${p.category}: ${p.name}` : p.name;
    const spec = p.spec || '-';
    const price = (typeof p.price === 'number' && p.price > 0)
      ? `$${p.price.toLocaleString('en-US')}`
      : 'Included';
    const buy = (p.url && p.url !== '#')
      ? `[${p.merchant || 'Link'}](${p.url})`
      : '-';
    return `| ${partName} | ${spec} | ${price} | ${buy} |`;
  });

  const total = (tier.parts || []).reduce((sum, p) => sum + (p.price || 0), 0);
  const totalLine = `**Total:** $${total.toLocaleString('en-US')}`;

  const dataDate = GPUS_UPDATED_AT ? GPUS_UPDATED_AT.slice(0, 10) : '';
  const closingLine = `Prices as of ${dataDate}. Full build: ${canonicalUrl}`;

  const sections = [
    heading,
    ...(fitLine ? [fitLine] : []),
    [tableHeader, ...rows].join('\n'),
    totalLine,
    closingLine
  ];

  return sections.join('\n\n');
}
