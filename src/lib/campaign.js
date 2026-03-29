import { signal, effect } from '@preact/signals';

// ── Constants ──────────────────────────────────────────────────────────────────

export const STORAGE_KEY = 'ek-campaign';
export const CURRENT_VERSION = 1;

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
    brokers: {},
    tempEmail: null,
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

// ── Campaign Reset ─────────────────────────────────────────────────────────────

/**
 * Start a brand new campaign. Clears localStorage and resets all state.
 */
export function startNewCampaign() {
  localStorage.removeItem(STORAGE_KEY);
  campaign.value = createEmptyCampaign();
  hasExistingCampaign.value = false;
}
