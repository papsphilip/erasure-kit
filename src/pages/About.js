import { html } from 'htm/preact';

/**
 * About page — compact overview of ErasureKit.
 * Detailed technical docs live in the GitHub README.
 */
export function About() {
  return html`
    <div class="max-w-2xl mx-auto px-4 sm:px-6 py-10 sm:py-12">
      <h1 class="text-2xl font-semibold mb-6">About ErasureKit</h1>

      <p class="text-base text-[var(--ek-text-muted)] leading-relaxed mb-8">
        ErasureKit is a <strong class="text-[var(--ek-text)]">free, open-source tool</strong> that automates GDPR Article 17 erasure requests to data brokers — organisations that collect and sell personal information. Whether you have received spam from unknown companies or found your details on people-search sites, ErasureKit streamlines the deletion process into a few clicks.
      </p>

      <!-- Your Rights -->
      <h2 class="text-xl font-semibold mt-8 mb-3 text-[var(--ek-text)]">Your Rights</h2>
      <p class="text-base text-[var(--ek-text-muted)] leading-relaxed mb-3">
        GDPR Article 17 gives you the <strong class="text-[var(--ek-text)]">right to erasure</strong> — the "right to be forgotten." Organisations must respond within <strong class="text-[var(--ek-text)]">one calendar month</strong> or face fines up to 4% of global turnover / €20M. If they fail, you can escalate to your national data protection authority.
      </p>

      <!-- How It Works -->
      <h2 class="text-xl font-semibold mt-8 mb-3 text-[var(--ek-text)]">How It Works</h2>
      <ol class="list-decimal list-inside space-y-2 text-base text-[var(--ek-text-muted)] mb-3">
        <li><strong class="text-[var(--ek-text)]">Enter your identity</strong> — name and email addresses linked to broker accounts.</li>
        <li><strong class="text-[var(--ek-text)]">Select brokers</strong> — choose from 169+ brokers by region and type.</li>
        <li><strong class="text-[var(--ek-text)]">Preview emails</strong> — auto-generated with correct GDPR legal language.</li>
        <li><strong class="text-[var(--ek-text)]">Send</strong> — one click dispatches all requests from a temporary @erasurekit.uk address. Your real email is never shared.</li>
        <li><strong class="text-[var(--ek-text)]">Track</strong> — monitor responses, 30-day deadlines, and flag overdue brokers.</li>
      </ol>

      <!-- Email & Privacy -->
      <h2 class="text-xl font-semibold mt-8 mb-3 text-[var(--ek-text)]">Email & Privacy</h2>
      <p class="text-base text-[var(--ek-text-muted)] leading-relaxed mb-3">
        Your real email is never exposed. Each campaign gets a <strong class="text-[var(--ek-text)]">disposable @erasurekit.uk address</strong>. Emails are <strong class="text-[var(--ek-text)]">end-to-end encrypted</strong> before leaving your browser — the relay cannot read your messages.
      </p>
      <ul class="space-y-2 text-base text-[var(--ek-text-muted)]">
        <li class="flex gap-2"><span class="text-[var(--ek-primary)] shrink-0">•</span><span><strong class="text-[var(--ek-text)]">Runs entirely in your browser</strong> — no backend, no database.</span></li>
        <li class="flex gap-2"><span class="text-[var(--ek-primary)] shrink-0">•</span><span><strong class="text-[var(--ek-text)]">No tracking</strong> — no cookies, analytics, or telemetry.</span></li>
        <li class="flex gap-2"><span class="text-[var(--ek-primary)] shrink-0">•</span><span><strong class="text-[var(--ek-text)]">Local storage only</strong> — data stays on your device unless you export.</span></li>
        <li class="flex gap-2"><span class="text-[var(--ek-primary)] shrink-0">•</span><span><strong class="text-[var(--ek-text)]">No accounts</strong> — open the app and start using it.</span></li>
      </ul>

      <!-- Broker Database -->
      <h2 class="text-xl font-semibold mt-8 mb-3 text-[var(--ek-text)]">Broker Database</h2>
      <p class="text-base text-[var(--ek-text-muted)] leading-relaxed mb-3">
        Ships with <strong class="text-[var(--ek-text)]">169+ data brokers</strong> across Europe, the UK, and the US — people search, marketing, credit reporting, data aggregators, and lead generation. The database is a separate JSON file that can be updated independently. <a href="https://github.com/papsphilip/erasure-kit" class="text-[var(--ek-primary)] hover:underline" target="_blank" rel="noopener">Contributions welcome on GitHub.</a>
      </p>

      <!-- Open Source -->
      <h2 class="text-xl font-semibold mt-8 mb-3 text-[var(--ek-text)]">Open Source</h2>
      <p class="text-base text-[var(--ek-text-muted)] leading-relaxed mb-2">
        <strong class="text-[var(--ek-text)]">MIT License</strong> — free to use, modify, and distribute. Source code at <a href="https://github.com/papsphilip/erasure-kit" class="text-[var(--ek-primary)] hover:underline" target="_blank" rel="noopener">github.com/papsphilip/erasure-kit</a>.
      </p>
      <p class="text-base text-[var(--ek-text-muted)] leading-relaxed">
        ErasureKit will always be free. No premium tiers, no monetisation. The goal is to make data erasure accessible to everyone.
      </p>
    </div>
  `;
}
