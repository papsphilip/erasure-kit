import { signal, effect } from '@preact/signals';
import { generateCampaignKeyPair } from './crypto.js';
import { demoMode } from './demo-mode.js';

// ── Constants ──────────────────────────────────────────────────────────────────

export const STORAGE_KEY = 'ek-campaign';
export const CURRENT_VERSION = 3;

// ── Campaign Schema ────────────────────────────────────────────────────────────

/**
 * Create an empty campaign with the canonical schema (D-09, D-10).
 * All future-phase fields are pre-populated with empty defaults.
 * @returns {object} Empty campaign object
 */
export function createEmptyCampaign() {
  return {
    version: CURRENT_VERSION,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    identity: {
      fullName: '',
      emails: [''],
      phone: '',
      address: '',
    },
    brokers: { selected: [], templates: {} },
    tempEmail: null,
    encryption: null, // { publicKeyJwk, privateKeyJwk } set when campaign generates keys (D-11)
    messages: [],
    statuses: {},
    settings: {},
  };
}

// ── Version Migration (D-12) ──────────────────────────────────────────────────

/**
 * Migrate a loaded campaign to the current version.
 * - If data is invalid: returns null
 * - If version > CURRENT_VERSION: returns null (future version)
 * - Otherwise: merges with empty template to fill missing keys
 * @param {*} data - Parsed campaign data
 * @returns {object|null} Migrated campaign or null
 */
export function migrateCampaign(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  if (!data.version) return null;
  if (data.version > CURRENT_VERSION) return null;

  const empty = createEmptyCampaign();
  return {
    ...empty,
    ...data,
    identity: { ...empty.identity, ...(data.identity || {}) },
    brokers: { ...empty.brokers, ...(data.brokers || {}) },
    updatedAt: new Date().toISOString(),
    version: CURRENT_VERSION,
  };
}

// ── localStorage Persistence ───────────────────────────────────────────────────

/**
 * Load campaign from localStorage, migrating if needed.
 * @returns {object|null} Campaign data or null
 */
function loadFromStorage() {
  try {
    const raw = typeof localStorage !== 'undefined'
      ? localStorage.getItem(STORAGE_KEY)
      : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      return migrateCampaign(parsed);
    }
  } catch (e) {
    // Corrupted data -- start fresh
  }
  return null;
}

// ── Exported Signals ───────────────────────────────────────────────────────────

// Load once from storage, reuse result for both signals (avoid double-read)
const _stored = loadFromStorage();

/** The campaign state signal -- single source of truth */
export const campaign = signal(_stored || createEmptyCampaign());

/** Whether a campaign existed in localStorage on app init */
export const hasExistingCampaign = signal(_stored !== null);

/** Timestamp of last successful auto-save (for footer indicator) */
export const lastAutoSaved = signal(null);

// ── Auto-Save Effect (D-13, D-15, D-16) ───────────────────────────────────────

let _saveTimeout = null;

effect(() => {
  const data = campaign.value; // subscribe to changes
  if (_saveTimeout) clearTimeout(_saveTimeout);
  _saveTimeout = setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      lastAutoSaved.value = Date.now();
    } catch (e) {
      // QuotaExceededError -- silently fail, user has explicit file save
    }
  }, 500);
});

// ── Identity Helpers (immutable updates -- avoids Pitfall 5) ───────────────────

/**
 * Update a single identity field.
 * @param {string} field - Field name (fullName, phone, address)
 * @param {string} value - New value
 */
export function updateIdentity(field, value) {
  campaign.value = {
    ...campaign.value,
    updatedAt: new Date().toISOString(),
    identity: {
      ...campaign.value.identity,
      [field]: value,
    },
  };
}

/**
 * Update a specific email by index.
 * @param {number} index - Email index
 * @param {string} value - New email value
 */
export function updateIdentityEmail(index, value) {
  const emails = [...campaign.value.identity.emails];
  emails[index] = value;
  campaign.value = {
    ...campaign.value,
    updatedAt: new Date().toISOString(),
    identity: { ...campaign.value.identity, emails },
  };
}

/**
 * Add an empty email slot to the emails array.
 */
export function addEmail() {
  const emails = [...campaign.value.identity.emails, ''];
  campaign.value = {
    ...campaign.value,
    updatedAt: new Date().toISOString(),
    identity: { ...campaign.value.identity, emails },
  };
}

/**
 * Remove an email by index. Always keeps at least one empty email.
 * @param {number} index - Email index to remove
 */
export function removeEmail(index) {
  const emails = campaign.value.identity.emails.filter((_, i) => i !== index);
  if (emails.length === 0) emails.push('');
  campaign.value = {
    ...campaign.value,
    updatedAt: new Date().toISOString(),
    identity: { ...campaign.value.identity, emails },
  };
}

// ── Broker Selection Helpers (D-13, D-14, D-15) ─────────────────────────────────

/**
 * Toggle a broker's selection state.
 * @param {string} brokerId - The broker ID slug
 */
export function toggleBrokerSelection(brokerId) {
  const selected = campaign.value.brokers.selected || [];
  const idx = selected.indexOf(brokerId);
  const next = idx >= 0
    ? selected.filter((id) => id !== brokerId)
    : [...selected, brokerId];
  campaign.value = {
    ...campaign.value,
    updatedAt: new Date().toISOString(),
    brokers: { ...campaign.value.brokers, selected: next },
  };
}

/**
 * Add multiple broker IDs to the selection (deduplicates).
 * @param {string[]} brokerIds - Array of broker ID slugs to select
 */
export function selectBrokers(brokerIds) {
  const existing = new Set(campaign.value.brokers.selected || []);
  brokerIds.forEach((id) => existing.add(id));
  campaign.value = {
    ...campaign.value,
    updatedAt: new Date().toISOString(),
    brokers: { ...campaign.value.brokers, selected: [...existing] },
  };
}

/**
 * Remove multiple broker IDs from the selection.
 * @param {string[]} brokerIds - Array of broker ID slugs to deselect
 */
export function deselectBrokers(brokerIds) {
  const toRemove = new Set(brokerIds);
  const next = (campaign.value.brokers.selected || []).filter((id) => !toRemove.has(id));
  campaign.value = {
    ...campaign.value,
    updatedAt: new Date().toISOString(),
    brokers: { ...campaign.value.brokers, selected: next },
  };
}

/**
 * Clear all broker selections.
 */
export function deselectAllBrokers() {
  campaign.value = {
    ...campaign.value,
    updatedAt: new Date().toISOString(),
    brokers: { ...campaign.value.brokers, selected: [] },
  };
}

/**
 * Check if a broker is currently selected.
 * @param {string} brokerId - The broker ID slug
 * @returns {boolean}
 */
export function isBrokerSelected(brokerId) {
  return (campaign.value.brokers.selected || []).includes(brokerId);
}

/**
 * Get the count of selected brokers.
 * @returns {number}
 */
export function getSelectedCount() {
  return (campaign.value.brokers.selected || []).length;
}

// ── File Save/Load (D-11, D-17, D-18, D-22) ───────────────────────────────────

/**
 * Save the current campaign to a JSON file via browser-fs-access.
 * Always shows the file picker (D-17 -- no cached handle).
 */
export async function saveCampaignToFile() {
  const { fileSave } = await import('browser-fs-access');
  const blob = new Blob([JSON.stringify(campaign.value, null, 2)], {
    type: 'application/json',
  });
  try {
    await fileSave(blob, {
      fileName: 'erasure-kit-campaign.json',
      extensions: ['.json'],
      description: 'ErasureKit Campaign',
    });
  } catch (e) {
    if (e.name === 'AbortError') return; // user cancelled
    throw e;
  }
}

/**
 * Load a campaign from a JSON file via browser-fs-access.
 * Validates, migrates, and overwrites the campaign signal on success.
 * @returns {Promise<{success?: boolean, error?: string, cancelled?: boolean}>}
 */
export async function loadCampaignFromFile() {
  try {
    const { fileOpen } = await import('browser-fs-access');
    const file = await fileOpen({
      mimeTypes: ['application/json'],
      extensions: ['.json'],
      description: 'ErasureKit Campaign',
    });
    const text = await file.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      return { error: 'parse' };
    }
    const migrated = migrateCampaign(data);
    if (!migrated) {
      return { error: 'invalid' };
    }
    campaign.value = migrated;
    hasExistingCampaign.value = true;
    return { success: true };
  } catch (e) {
    if (e.name === 'AbortError') return { cancelled: true };
    return { error: 'parse' };
  }
}

// ── Temp Address Generation ──────────────────────────────────────────────────

/**
 * Generate a random 8-character alphanumeric slug for temp email addresses.
 * Uses crypto.getRandomValues for secure randomness.
 * @returns {string} 8-character string from [a-z0-9]
 */
export function generateTempSlug() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const array = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(array, (byte) => chars[byte % chars.length]).join('');
}

// ── Ensure Encryption Keys ──────────────────────────────────────────────────

/**
 * Ensure the current campaign has encryption keys and a temp email address.
 * For campaigns loaded from localStorage that predate the relay feature (v1.0),
 * this auto-generates the missing keys without resetting the campaign.
 * @returns {Promise<boolean>} true if keys were generated, false if already present
 */
export async function ensureCampaignKeys() {
  if (campaign.value.encryption && campaign.value.tempEmail) {
    return false;
  }
  const { publicKeyJwk, privateKeyJwk } = await generateCampaignKeyPair();
  const tempSlug = generateTempSlug();
  const tempEmail = campaign.value.tempEmail || `${tempSlug}@erasurekit.uk`;
  campaign.value = {
    ...campaign.value,
    updatedAt: new Date().toISOString(),
    tempEmail,
    encryption: campaign.value.encryption || { publicKeyJwk, privateKeyJwk },
  };
  return true;
}

// ── Campaign Reset ─────────────────────────────────────────────────────────────

/**
 * Start a brand new campaign. Clears localStorage, generates RSA key pair
 * and temporary email address, then resets all state (D-06).
 * ASYNC -- callers must await this function.
 */
export async function startNewCampaign() {
  localStorage.removeItem(STORAGE_KEY);

  // D-06: Generate key pair and temp address on campaign creation
  const { publicKeyJwk, privateKeyJwk } = await generateCampaignKeyPair();
  const tempSlug = generateTempSlug();
  const tempEmail = `${tempSlug}@erasurekit.uk`;

  const empty = createEmptyCampaign();
  campaign.value = {
    ...empty,
    tempEmail,
    encryption: { publicKeyJwk, privateKeyJwk },
  };
  hasExistingCampaign.value = false;
}

// ── End Campaign ────────────────────────────────────────────────────────────

/**
 * End the current campaign. Deletes the temp address via relay (D-10)
 * and marks the campaign as ended. Campaign data stays for records.
 * @returns {Promise<{ deleteSuccess: boolean }>}
 */
export async function endCampaign() {
  const { relayDeleteAddress } = await import('./relay-client.js');
  const slug = campaign.value.tempEmail?.split('@')[0];
  let deleteSuccess = false;

  if (slug && !demoMode.value) {
    try {
      const result = await relayDeleteAddress(slug);
      deleteSuccess = result.success;
    } catch {
      deleteSuccess = false;
    }
  } else {
    deleteSuccess = true; // demo mode or no slug
  }

  campaign.value = {
    ...campaign.value,
    updatedAt: new Date().toISOString(),
    settings: {
      ...campaign.value.settings,
      ended: true,
      endedAt: new Date().toISOString(),
    },
    tempEmail: null,
  };

  return { deleteSuccess };
}
