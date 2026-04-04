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

      <!-- Section 4: Privacy First -->
      <h2 class="text-lg font-semibold mt-8 mb-3 text-[var(--ek-text)]">Privacy First</h2>
      <p class="text-sm text-[var(--ek-text-muted)] leading-relaxed mb-3">
        ErasureKit is built with a strict privacy-first philosophy. It would be counterproductive to use a tool that protects your data rights while simultaneously collecting your data. Here is exactly how the app handles your information:
      </p>
      <ul class="list-disc list-inside space-y-1 text-sm text-[var(--ek-text-muted)]">
        <li><strong class="text-[var(--ek-text)]">Everything runs in the browser.</strong> There is no server, no backend, and no API calls to ErasureKit servers. The app is a static HTML file with JavaScript that executes entirely on your device.</li>
        <li><strong class="text-[var(--ek-text)]">No tracking of any kind.</strong> No cookies, no analytics scripts, no telemetry, no usage metrics. The app does not know who you are, how often you use it, or what you do with it.</li>
        <li><strong class="text-[var(--ek-text)]">Local storage only.</strong> Your personal data (name, email addresses) is stored in your browser's local storage. It never leaves your device unless you explicitly export it.</li>
        <li><strong class="text-[var(--ek-text)]">Save and load campaigns.</strong> You can save your campaign progress as a JSON file on your own device and load it later. This file stays on your computer -- ErasureKit has no access to it once saved.</li>
        <li><strong class="text-[var(--ek-text)]">Minimal network activity.</strong> The only outbound calls are to the erasurekit.uk relay when sending erasure emails. All email content is end-to-end encrypted -- the relay cannot read your messages.</li>
        <li><strong class="text-[var(--ek-text)]">No accounts or sign-up.</strong> There is no registration, no email verification, and no user database. You open the app and start using it.</li>
      </ul>

      <!-- Section 5: The Broker Database -->
      <h2 class="text-lg font-semibold mt-8 mb-3 text-[var(--ek-text)]">The Broker Database</h2>
      <p class="text-sm text-[var(--ek-text-muted)] leading-relaxed mb-3">
        ErasureKit ships with a community-maintained database of <strong class="text-[var(--ek-text)]">169+ data brokers</strong> across Europe. These brokers span multiple categories including people search engines, marketing data providers, credit reporting agencies, data aggregators, lead generation platforms, and more.
      </p>
      <p class="text-sm text-[var(--ek-text-muted)] leading-relaxed mb-3">
        Brokers are categorised by region -- EU-wide, United Kingdom, DACH (Germany, Austria, Switzerland), and Nordics -- so you can target the organisations most likely to hold your data based on where you live and where you have been active online.
      </p>
      <p class="text-sm text-[var(--ek-text-muted)] leading-relaxed mb-3">
        The broker database is stored as a separate JSON file that is loaded at runtime. This means it can be <strong class="text-[var(--ek-text)]">updated independently of the app itself</strong>. The community can add new brokers, correct contact details, or flag brokers that have shut down without requiring a new app release.
      </p>
      <p class="text-sm text-[var(--ek-text-muted)] leading-relaxed mb-3">
        Contributions are welcome. If you know of a data broker not yet in the database, or if you find incorrect contact information, you can submit updates via GitHub.
      </p>

      <!-- Section 6: Open Source -->
      <h2 class="text-lg font-semibold mt-8 mb-3 text-[var(--ek-text)]">Open Source</h2>
      <p class="text-sm text-[var(--ek-text-muted)] leading-relaxed mb-3">
        ErasureKit is <strong class="text-[var(--ek-text)]">free software</strong> released under an open-source licence. The source code is publicly available on GitHub, and the project welcomes contributions of all kinds.
      </p>
      <p class="text-sm text-[var(--ek-text-muted)] leading-relaxed mb-3">
        There are many ways to contribute: add new data brokers to the database, improve email templates, translate the app into other languages, report bugs, suggest features, or improve the code. Every contribution helps more people exercise their data rights.
      </p>
      <p class="text-sm text-[var(--ek-text-muted)] leading-relaxed mb-3">
        The app is built with Preact and Tailwind CSS, designed to be small, fast, and easy to understand. The codebase is intentionally simple so that anyone with basic web development knowledge can read, modify, and extend it.
      </p>
    </div>
  `;
}
