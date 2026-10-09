// Visible home page FAQ. The prerender's FAQPage JSON-LD is built from the same homeFaq()
// entries, so the structured data always matches what readers see.
import { homeFaq } from '../utils/siteFacts.js';

export function renderHomeFaqHtml() {
  return `
    <section class="home-faq" aria-labelledby="home-faq-title">
      <h2 id="home-faq-title">Frequently Asked Questions</h2>
      ${homeFaq().map(({ question, answer }) => `
      <div class="home-faq-item">
        <h3>${question}</h3>
        <p>${answer}</p>
      </div>`).join('')}
    </section>
  `;
}
