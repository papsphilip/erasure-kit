import { html } from 'htm/preact';

/**
 * About page with detailed information about ErasureKit, GDPR Article 17,
 * how the app works, its privacy-first design, the broker database,
 * and the open-source community.
 */
export function About() {
  return html`
    <div class="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <h1 class="text-xl font-semibold mb-6">About ErasureKit</h1>

      <!-- Section 1: Introduction -->
      <div class="mb-3">
        <p class="text-sm text-[var(--ek-text-muted)] leading-relaxed mb-3">
          ErasureKit is a <strong class="text-[var(--ek-text)]">free, open-source tool</strong> that helps Europeans exercise their data protection rights. It automates the process of sending legally-compliant GDPR Article 17 erasure requests to data brokers -- organisations that collect, aggregate, and sell personal information.
        </p>
        <p class="text-sm text-[var(--ek-text-muted)] leading-relaxed mb-3">
          The app is designed for anyone who wants to take control of their personal data. Whether you have received spam from unknown companies, discovered your information on people-search websites, or simply want to reduce your digital footprint, ErasureKit streamlines the deletion process into a few clicks.
        </p>
      </div>

      <!-- Section 2: GDPR Article 17 -->
      <h2 class="text-lg font-semibold mt-8 mb-3 text-[var(--ek-text)]">GDPR Article 17: The Right to Erasure</h2>
      <p class="text-sm text-[var(--ek-text-muted)] leading-relaxed mb-3">
        Article 17 of the General Data Protection Regulation (GDPR) establishes the <strong class="text-[var(--ek-text)]">right to erasure</strong>, commonly known as the "right to be forgotten." This right allows individuals to request that organisations delete their personal data when certain conditions are met.
      </p>
      <p class="text-sm text-[var(--ek-text-muted)] leading-relaxed mb-3">
        You can exercise this right when your personal data is no longer necessary for the purpose it was collected, when you withdraw your consent, when your data has been processed without a lawful basis, or when the data was unlawfully processed. In practice, most data broker activities fall under one or more of these conditions.
      </p>
      <p class="text-sm text-[var(--ek-text-muted)] leading-relaxed mb-3">
        When an organisation receives a valid erasure request, it is <strong class="text-[var(--ek-text)]">legally obligated to respond within one calendar month</strong>. It must either confirm that your data has been deleted or provide a lawful basis for refusing. This is not a courtesy -- it is a legal obligation enforceable under EU and UK law.
      </p>
      <p class="text-sm text-[var(--ek-text-muted)] leading-relaxed mb-3">
        If an organisation fails to comply, you have the right to lodge a complaint with your national data protection authority (DPA). Regulatory enforcement can result in significant fines under GDPR -- up to 4% of annual global turnover or 20 million euros, whichever is higher.
      </p>

      <!-- Section 3: How the App Works -->
      <h2 class="text-lg font-semibold mt-8 mb-3 text-[var(--ek-text)]">How the App Works</h2>
      <ul class="list-disc list-inside space-y-1 text-sm text-[var(--ek-text-muted)]">
        <li><strong class="text-[var(--ek-text)]">Step 1: Enter your identity.</strong> Provide your name and the email addresses associated with the broker accounts you want to erase.</li>
        <li><strong class="text-[var(--ek-text)]">Step 2: Browse and select brokers.</strong> Choose from 169+ known data brokers, categorised by region (EU-wide, UK, DACH, Nordics) and type (people search, marketing, credit reporting, and more).</li>
        <li><strong class="text-[var(--ek-text)]">Step 3: Preview erasure emails.</strong> Each email is auto-generated with legally-compliant language citing the correct GDPR articles. You can customise any template before sending.</li>
        <li><strong class="text-[var(--ek-text)]">Step 4: Send requests.</strong> Click "Send All" and the app dispatches your erasure requests through a secure relay from a temporary @erasurekit.uk address -- your real email is never shared with brokers.</li>
        <li><strong class="text-[var(--ek-text)]">Step 5: Track responses.</strong> Monitor which brokers have responded, track 30-day compliance deadlines, and flag overdue organisations for escalation to data protection authorities.</li>
      </ul>

      <!-- Section 4: The Email Relay -->
      <h2 class="text-lg font-semibold mt-8 mb-3 text-[var(--ek-text)]">How Email Sending Works</h2>
      <p class="text-sm text-[var(--ek-text-muted)] leading-relaxed mb-3">
        ErasureKit never exposes your real email address to data brokers. Instead, the app creates a <strong class="text-[var(--ek-text)]">temporary @erasurekit.uk address</strong> for each campaign. All erasure requests are sent from this disposable address through a secure relay.
      </p>
      <p class="text-sm text-[var(--ek-text-muted)] leading-relaxed mb-3">
        The relay architecture works as follows:
      </p>
      <ul class="list-disc list-inside space-y-1 text-sm text-[var(--ek-text-muted)] mb-3">
        <li><strong class="text-[var(--ek-text)]">Encryption in the browser.</strong> Before any email leaves your device, the body is encrypted using RSA-OAEP + AES-256-GCM hybrid encryption via the Web Crypto API. Only your browser holds the private key.</li>
        <li><strong class="text-[var(--ek-text)]">Cloudflare Worker relay.</strong> The encrypted payload is sent to a Cloudflare Worker at api.erasurekit.uk. The Worker decrypts the email body and forwards it to the broker via the Resend email API.</li>
        <li><strong class="text-[var(--ek-text)]">End-to-end encrypted content.</strong> The relay operator cannot read your email content at rest -- encryption keys exist only in your browser session. The Worker only holds the decrypted content in memory for the instant it takes to send.</li>
        <li><strong class="text-[var(--ek-text)]">Cloudflare Email Routing.</strong> Broker replies to your temp address are received by Cloudflare Email Routing (free, unlimited) and stored encrypted in Cloudflare KV for retrieval.</li>
        <li><strong class="text-[var(--ek-text)]">Temp address cleanup.</strong> When your campaign is complete, you can delete the temp address. It is also automatically expired after 90 days via KV TTL.</li>
      </ul>
      <p class="text-sm text-[var(--ek-text-muted)] leading-relaxed mb-3">
        The relay infrastructure runs entirely on Cloudflare's free tier: Workers (100K requests/day), KV (100K reads/day), Email Routing (unlimited), and Resend (100 emails/day, 3,000/month on the free plan).
      </p>

      <!-- Section 5: Privacy First -->
      <h2 class="text-lg font-semibold mt-8 mb-3 text-[var(--ek-text)]">Privacy First</h2>
      <p class="text-sm text-[var(--ek-text-muted)] leading-relaxed mb-3">
        It would be counterproductive to use a tool that protects your data rights while simultaneously collecting your data. Here is exactly how the app handles your information:
      </p>
      <ul class="list-disc list-inside space-y-1 text-sm text-[var(--ek-text-muted)]">
        <li><strong class="text-[var(--ek-text)]">Everything runs in the browser.</strong> The app is a static HTML file with JavaScript that executes entirely on your device. There is no ErasureKit backend or database.</li>
        <li><strong class="text-[var(--ek-text)]">No tracking of any kind.</strong> No cookies, no analytics, no telemetry. The app does not know who you are or how you use it.</li>
        <li><strong class="text-[var(--ek-text)]">Local storage only.</strong> Your personal data (name, email addresses, encryption keys) is stored in your browser's local storage and never leaves your device unless you explicitly export a campaign file.</li>
        <li><strong class="text-[var(--ek-text)]">End-to-end encrypted sending.</strong> The only network calls are to the erasurekit.uk relay. Email content is encrypted before it leaves your browser -- the relay cannot read your messages.</li>
        <li><strong class="text-[var(--ek-text)]">No accounts or sign-up.</strong> No registration, no email verification, no user database. You open the app and start using it.</li>
      </ul>

      <!-- Section 6: The Broker Database -->
      <h2 class="text-lg font-semibold mt-8 mb-3 text-[var(--ek-text)]">The Broker Database</h2>
      <p class="text-sm text-[var(--ek-text-muted)] leading-relaxed mb-3">
        ErasureKit ships with a community-maintained database of <strong class="text-[var(--ek-text)]">169+ data brokers</strong> across Europe, the UK, and the US. These brokers span multiple categories including people search engines, marketing data providers, credit reporting agencies, data aggregators, and lead generation platforms.
      </p>
      <p class="text-sm text-[var(--ek-text-muted)] leading-relaxed mb-3">
        The database was compiled from publicly available open-source lists and community research. Key sources and prior art that informed this project include:
      </p>
      <ul class="list-disc list-inside space-y-1 text-sm text-[var(--ek-text-muted)] mb-3">
        <li><a href="https://www.datarequests.org/blog/sample-letter-gdpr-erasure-request/" class="text-[var(--ek-primary)] hover:underline" target="_blank" rel="noopener">datarequests.org</a> -- CC0-licensed sample erasure letter templates that informed our GDPR email language</li>
        <li><a href="https://github.com/privacybot-berkeley/privacybot" class="text-[var(--ek-primary)] hover:underline" target="_blank" rel="noopener">PrivacyBot</a> (UC Berkeley / Consumer Reports) -- pioneering open-source erasure automation via Gmail OAuth</li>
        <li><a href="https://github.com/AnalogJ/justvanish" class="text-[var(--ek-primary)] hover:underline" target="_blank" rel="noopener">JustVanish</a> (AnalogJ) -- Go-based erasure CLI with SMTP integration</li>
        <li><a href="https://github.com/digisamroc/eraser" class="text-[var(--ek-primary)] hover:underline" target="_blank" rel="noopener">Eraser</a> (digisamroc) -- self-hosted erasure tool with multi-provider SMTP support</li>
      </ul>
      <p class="text-sm text-[var(--ek-text-muted)] leading-relaxed mb-3">
        The broker database is stored as a separate JSON file loaded at runtime, so it can be <strong class="text-[var(--ek-text)]">updated independently of the app</strong>. Contributions are welcome -- if you know of a broker not yet listed, or find incorrect contact information, you can submit updates via GitHub.
      </p>

      <!-- Section 7: Open Source & Licensing -->
      <h2 class="text-lg font-semibold mt-8 mb-3 text-[var(--ek-text)]">Open Source & Licensing</h2>
      <p class="text-sm text-[var(--ek-text-muted)] leading-relaxed mb-3">
        ErasureKit is <strong class="text-[var(--ek-text)]">free and open-source software</strong> released under the <strong class="text-[var(--ek-text)]">MIT License</strong>. You can use, copy, modify, merge, publish, distribute, sublicense, and sell copies of this software freely. The full license text is included in the source repository.
      </p>
      <p class="text-sm text-[var(--ek-text-muted)] leading-relaxed mb-3">
        The source code is publicly available at <a href="https://github.com/papsphilip/erasure-kit" class="text-[var(--ek-primary)] hover:underline" target="_blank" rel="noopener">github.com/papsphilip/erasure-kit</a>. The project welcomes contributions of all kinds: adding brokers, improving email templates, translating the app, reporting bugs, or improving the code.
      </p>
      <p class="text-sm text-[var(--ek-text-muted)] leading-relaxed mb-3">
        ErasureKit will always be free. There are no premium tiers, no paid features, and no monetisation plans. The goal is to make data erasure accessible to everyone.
      </p>
    </div>
  `;
}
