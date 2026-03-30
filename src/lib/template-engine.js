import { campaign } from './campaign.js';

// ── Template Engine ────────────────────────────────────────────────────────────
// Pure template generation functions for GDPR Article 17 erasure requests.
// Three distinct legal variants: EU/EEA (GDPR), UK (UK-GDPR), US (CCPA).
// D-16: No external dependencies, no API calls -- pure string generation.

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Format the identity block shared across all templates.
 * Includes name and emails always; phone and address only when non-empty.
 * @param {object} identity - { fullName, emails, phone, address }
 * @returns {string} Formatted identity block
 */
function formatIdentityBlock(identity) {
  const emailList = identity.emails
    .filter((e) => e && e.trim())
    .map((e) => `  - ${e}`)
    .join('\n');

  let block = `My identifying information:\n- Name: ${identity.fullName}\n- Email address(es):\n${emailList}`;

  if (identity.phone && identity.phone.trim()) {
    block += `\n- Phone: ${identity.phone}`;
  }
  if (identity.address && identity.address.trim()) {
    block += `\n- Address: ${identity.address}`;
  }

  return block;
}

// ── GDPR Template (EU/EEA) ─────────────────────────────────────────────────────

/**
 * Generate an EU/EEA GDPR Article 17 erasure request email.
 * Cites Art. 17(1), Art. 19, Art. 12(3), Art. 12(4).
 * @param {object} identity - { fullName, emails, phone, address }
 * @param {object} broker - { name, email, region, legalFramework, ... }
 * @returns {{ subject: string, body: string }}
 */
export function generateGDPR(identity, broker) {
  const subject = `Data Erasure Request - GDPR Article 17 - ${identity.fullName}`;
  const identityBlock = formatIdentityBlock(identity);

  const body = `To the Data Protection Officer at ${broker.name},

I am writing to exercise my right to erasure of personal data under Article 17 of the General Data Protection Regulation (GDPR).

I hereby request that you erase all personal data concerning me that your organisation holds or processes. Under Article 17(1) GDPR, you are obligated to erase personal data without undue delay where the data is no longer necessary for the purposes for which it was collected, or where I withdraw my consent and there is no other legal ground for the processing.

${identityBlock}

In accordance with Article 19 GDPR, if you have disclosed my personal data to any third parties, I require you to communicate this erasure request to each recipient, unless this proves impossible or involves disproportionate effort. I also request that you inform me of those recipients.

Under Article 12(3) GDPR, you are required to respond to this request without undue delay and in any event within one calendar month of receipt. If you are unable to comply, Article 12(4) GDPR requires you to inform me of the reasons for not taking action and of my right to lodge a complaint with a supervisory authority and to seek a judicial remedy.

Please confirm in writing once the erasure has been completed.

Yours faithfully,
${identity.fullName}`;

  return { subject, body };
}

// ── UK-GDPR Template ────────────────────────────────────────────────────────────

/**
 * Generate a UK GDPR Article 17 erasure request email.
 * Cites UK GDPR, Data Protection Act 2018, ICO.
 * @param {object} identity - { fullName, emails, phone, address }
 * @param {object} broker - { name, email, region, legalFramework, ... }
 * @returns {{ subject: string, body: string }}
 */
export function generateUKGDPR(identity, broker) {
  const subject = `Data Erasure Request - UK GDPR Article 17 - ${identity.fullName}`;
  const identityBlock = formatIdentityBlock(identity);

  const body = `To the Data Protection Officer at ${broker.name},

I am writing to exercise my right to erasure of personal data under Article 17 of the UK General Data Protection Regulation (UK GDPR), as supplemented by the Data Protection Act 2018.

I hereby request that you erase all personal data concerning me that your organisation holds or processes. Under Article 17(1) UK GDPR, you are obligated to erase personal data without undue delay where the data is no longer necessary for the purposes for which it was collected, or where I withdraw my consent and there is no other legal ground for the processing.

${identityBlock}

In accordance with Article 19 UK GDPR, if you have disclosed my personal data to any third parties, I require you to communicate this erasure request to each recipient, unless this proves impossible or involves disproportionate effort. I also request that you inform me of those recipients.

Under Article 12(3) UK GDPR, you are required to respond to this request without undue delay and in any event within one calendar month of receipt. If you are unable to comply, Article 12(4) UK GDPR requires you to inform me of the reasons for not taking action and of my right to lodge a complaint with the Information Commissioner's Office (ICO) and to seek a judicial remedy.

Please confirm in writing once the erasure has been completed.

Yours faithfully,
${identity.fullName}`;

  return { subject, body };
}

// ── CCPA Template (US) ──────────────────────────────────────────────────────────

/**
 * Generate a CCPA (California) deletion request email.
 * Cites Cal. Civ. Code Section 1798.105, uses "personal information" terminology.
 * @param {object} identity - { fullName, emails, phone, address }
 * @param {object} broker - { name, email, region, legalFramework, ... }
 * @returns {{ subject: string, body: string }}
 */
export function generateCCPA(identity, broker) {
  const subject = `Personal Information Deletion Request - CCPA - ${identity.fullName}`;
  const identityBlock = formatIdentityBlock(identity);

  const body = `To ${broker.name},

I am writing to exercise my right to deletion of personal information under the California Consumer Privacy Act (CCPA), specifically California Civil Code Section 1798.105.

This is a verifiable consumer request to delete all personal information your business has collected about me. Under Section 1798.105, a consumer has the right to request that a business delete any personal information about the consumer which the business has collected from the consumer.

${identityBlock}

I further request that you direct any service providers to delete my personal information from their records, as required under the CCPA.

Under the CCPA, you are required to respond to this request within 45 days of receipt. If you require additional time, you must notify me of the extension within the initial 45-day period.

If you decline to delete my personal information, you are required to explain the basis for the denial and inform me of my rights.

Please confirm in writing once the deletion has been completed.

Sincerely,
${identity.fullName}`;

  return { subject, body };
}

// ── Dispatcher ──────────────────────────────────────────────────────────────────

/**
 * Generate an erasure request email for a broker based on its legal framework.
 * Routes to GDPR, UK-GDPR, or CCPA template. "Other" falls back to GDPR.
 * @param {object} identity - { fullName, emails, phone, address }
 * @param {object} broker - { name, email, region, legalFramework, ... }
 * @returns {{ subject: string, body: string }}
 */
export function generateTemplate(identity, broker) {
  switch (broker.legalFramework) {
    case 'GDPR':
      return generateGDPR(identity, broker);
    case 'UK-GDPR':
      return generateUKGDPR(identity, broker);
    case 'CCPA':
      return generateCCPA(identity, broker);
    default:
      return generateGDPR(identity, broker);
  }
}

// ── Per-Broker Template Helpers ─────────────────────────────────────────────────

/**
 * Get the template for a specific broker, using custom text if user has edited it.
 * Subject line is always auto-generated; only body can be customized (D-08, D-10).
 * @param {object} identity - { fullName, emails, phone, address }
 * @param {object} broker - { id, name, email, region, legalFramework, ... }
 * @param {object|null} customTemplates - { [brokerId]: { body, editedAt } }
 * @returns {{ subject: string, body: string, isCustom: boolean }}
 */
export function getTemplateForBroker(identity, broker, customTemplates) {
  const custom = customTemplates?.[broker.id];
  if (custom && custom.body) {
    const generated = generateTemplate(identity, broker);
    return { subject: generated.subject, body: custom.body, isCustom: true };
  }
  return { ...generateTemplate(identity, broker), isCustom: false };
}

/**
 * Save a custom-edited template body for a specific broker (D-09).
 * Follows immutable update pattern -- replaces the full campaign.value.
 * @param {string} brokerId - The broker ID slug
 * @param {string} body - Custom template body text
 */
export function saveCustomTemplate(brokerId, body) {
  campaign.value = {
    ...campaign.value,
    updatedAt: new Date().toISOString(),
    brokers: {
      ...campaign.value.brokers,
      templates: {
        ...(campaign.value.brokers.templates || {}),
        [brokerId]: {
          body,
          editedAt: new Date().toISOString(),
        },
      },
    },
  };
}

/**
 * Reset a broker's template to the auto-generated default (D-11).
 * Removes the broker's custom entry from campaign.brokers.templates.
 * @param {string} brokerId - The broker ID slug
 */
export function resetBrokerTemplate(brokerId) {
  const templates = { ...(campaign.value.brokers.templates || {}) };
  delete templates[brokerId];
  campaign.value = {
    ...campaign.value,
    updatedAt: new Date().toISOString(),
    brokers: {
      ...campaign.value.brokers,
      templates,
    },
  };
}
