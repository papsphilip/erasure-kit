import { html } from 'htm/preact';

/**
 * About page with information about ErasureKit, GDPR Article 17,
 * and the tool's privacy-first design philosophy.
 */
export function About() {
  return html`
    <div class="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <h1 class="text-xl font-semibold mb-4">About ErasureKit</h1>

      <div class="space-y-4 text-[var(--ek-text-muted)] leading-normal">
        <p>
          ErasureKit is a free, open-source tool that helps Europeans exercise their GDPR Article 17 right to erasure. It generates and sends legally accurate data deletion requests to known data brokers without exposing your real email address.
        </p>

        <p>
          Data brokers collect and sell personal information -- often without explicit consent. Under GDPR, you have the right to request that any organisation delete your personal data. ErasureKit automates this process, saving you hours of manual work.
        </p>

        <p>
          <strong class="text-[var(--ek-text)]">Privacy first.</strong> Everything runs in your browser. No data is sent to any server. No accounts are created. No tracking cookies or analytics. Your personal information never leaves your device.
        </p>

        <p>
          <strong class="text-[var(--ek-text)]">Open source.</strong> ErasureKit is free software released under an open-source licence. You can inspect the code, contribute improvements, or fork it for your own use. The broker database is maintained by the community and updated independently of the app.
        </p>
      </div>
    </div>
  `;
}
