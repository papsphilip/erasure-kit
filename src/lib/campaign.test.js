import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock browser-fs-access before importing campaign module
const mockFileSave = vi.fn();
const mockFileOpen = vi.fn();
vi.mock('browser-fs-access', () => ({
  fileSave: mockFileSave,
  fileOpen: mockFileOpen,
  supported: true,
}));

// Mock crypto.js (campaign.js now imports generateCampaignKeyPair for startNewCampaign)
const mockGenerateCampaignKeyPair = vi.fn().mockResolvedValue({
  publicKeyJwk: { kty: 'RSA', n: 'mock-public' },
  privateKeyJwk: { kty: 'RSA', n: 'mock-private' },
});
vi.mock('./crypto.js', () => ({
  generateCampaignKeyPair: mockGenerateCampaignKeyPair,
}));

// Mock demo-mode.js (campaign.js now imports demoMode for endCampaign)
vi.mock('./demo-mode.js', () => ({
  demoMode: { value: false },
}));

describe('campaign', () => {
  let campaign, hasExistingCampaign, lastAutoSaved;
  let updateIdentity, updateIdentityEmail, addEmail, removeEmail;
  let saveCampaignToFile, loadCampaignFromFile, startNewCampaign;
  let CURRENT_VERSION;
  // Internal helpers exposed for testing
  let createEmptyCampaign, migrateCampaign;

  beforeEach(async () => {
    vi.useFakeTimers();
    localStorage.clear();
    mockFileSave.mockReset();
    mockFileOpen.mockReset();
    mockGenerateCampaignKeyPair.mockClear();
    mockGenerateCampaignKeyPair.mockResolvedValue({
      publicKeyJwk: { kty: 'RSA', n: 'mock-public' },
      privateKeyJwk: { kty: 'RSA', n: 'mock-private' },
    });

    // Dynamic import to get fresh module state per test
    vi.resetModules();
    const mod = await import('./campaign.js');
    campaign = mod.campaign;
    hasExistingCampaign = mod.hasExistingCampaign;
    lastAutoSaved = mod.lastAutoSaved;
    updateIdentity = mod.updateIdentity;
    updateIdentityEmail = mod.updateIdentityEmail;
    addEmail = mod.addEmail;
    removeEmail = mod.removeEmail;
    saveCampaignToFile = mod.saveCampaignToFile;
    loadCampaignFromFile = mod.loadCampaignFromFile;
    startNewCampaign = mod.startNewCampaign;
    CURRENT_VERSION = mod.CURRENT_VERSION;
    createEmptyCampaign = mod.createEmptyCampaign;
    migrateCampaign = mod.migrateCampaign;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('createEmptyCampaign', () => {
    it('returns object with correct schema', () => {
      const empty = createEmptyCampaign();
      expect(empty.version).toBe(3);
      expect(empty.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(empty.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(empty.identity.fullName).toBe('');
      expect(empty.identity.emails).toEqual(['']);
      expect(empty.identity.phone).toBe('');
      expect(empty.identity.address).toBe('');
      expect(empty.brokers).toEqual({ selected: [], templates: {} });
      expect(empty.tempEmail).toBe(null);
      expect(empty.encryption).toBe(null);
      expect(empty.messages).toEqual([]);
      expect(empty.statuses).toEqual({});
      expect(empty.settings).toEqual({});
    });

    it('has version 3', () => {
      expect(createEmptyCampaign().version).toBe(3);
    });

    it('has encryption field set to null', () => {
      expect(createEmptyCampaign().encryption).toBeNull();
    });
  });

  describe('updateIdentity', () => {
    it('changes campaign.value.identity.fullName and updates updatedAt', () => {
      const beforeUpdate = campaign.value.updatedAt;
      // Advance time so updatedAt will differ
      vi.advanceTimersByTime(1000);
      updateIdentity('fullName', 'Jane Doe');
      expect(campaign.value.identity.fullName).toBe('Jane Doe');
      expect(campaign.value.updatedAt).not.toBe(beforeUpdate);
    });
  });

  describe('updateIdentityEmail', () => {
    it('sets first email to the given value', () => {
      updateIdentityEmail(0, 'jane@example.com');
      expect(campaign.value.identity.emails[0]).toBe('jane@example.com');
    });
  });

  describe('addEmail', () => {
    it('appends empty string to emails array', () => {
      const before = campaign.value.identity.emails.length;
      addEmail();
      expect(campaign.value.identity.emails.length).toBe(before + 1);
      expect(campaign.value.identity.emails[campaign.value.identity.emails.length - 1]).toBe('');
    });

    it('works after 10 emails (soft limit is informational only per D-05)', () => {
      // Start with 1 email, add 10 more to get 11 total
      for (let i = 0; i < 10; i++) {
        addEmail();
      }
      expect(campaign.value.identity.emails.length).toBe(11);
      // Can still add more
      addEmail();
      expect(campaign.value.identity.emails.length).toBe(12);
    });
  });

  describe('removeEmail', () => {
    it('removes second email', () => {
      addEmail(); // now ['', '']
      updateIdentityEmail(0, 'first@example.com');
      updateIdentityEmail(1, 'second@example.com');
      removeEmail(1);
      expect(campaign.value.identity.emails).toEqual(['first@example.com']);
    });

    it('keeps array with one empty string when removing last email', () => {
      removeEmail(0);
      expect(campaign.value.identity.emails).toEqual(['']);
    });
  });

  describe('migrateCampaign', () => {
    it('adds missing keys from template when version < CURRENT_VERSION', () => {
      // Simulate a v1 campaign missing some keys (simulating a future scenario
      // where CURRENT_VERSION > 1, but for now v1 is current so we test the merge)
      const old = {
        version: 1,
        createdAt: '2026-01-01T00:00:00.000Z',
        identity: { fullName: 'Test User' },
        // missing: emails, phone, address, brokers, tempEmail, etc.
      };
      const result = migrateCampaign(old);
      expect(result).not.toBe(null);
      expect(result.version).toBe(CURRENT_VERSION);
      expect(result.identity.fullName).toBe('Test User');
      expect(result.identity.emails).toEqual(['']);
      expect(result.identity.phone).toBe('');
      expect(result.brokers).toEqual({ selected: [], templates: {} });
      expect(result.tempEmail).toBe(null);
      expect(result.messages).toEqual([]);
      expect(result.statuses).toEqual({});
      expect(result.settings).toEqual({});
    });

    it('returns null when version > CURRENT_VERSION', () => {
      const future = { version: CURRENT_VERSION + 1, identity: {} };
      expect(migrateCampaign(future)).toBe(null);
    });

    it('returns null for null input', () => {
      expect(migrateCampaign(null)).toBe(null);
    });

    it('returns null for non-object input', () => {
      expect(migrateCampaign('string')).toBe(null);
      expect(migrateCampaign(42)).toBe(null);
    });

    it('returns null for object with missing version', () => {
      expect(migrateCampaign({ identity: {} })).toBe(null);
    });

    it('preserves existing identity data while filling missing keys', () => {
      const partial = {
        version: 1,
        createdAt: '2026-01-01T00:00:00.000Z',
        identity: {
          fullName: 'Existing Name',
          emails: ['test@example.com', 'other@example.com'],
        },
      };
      const result = migrateCampaign(partial);
      expect(result.identity.fullName).toBe('Existing Name');
      expect(result.identity.emails).toEqual(['test@example.com', 'other@example.com']);
      expect(result.identity.phone).toBe('');
      expect(result.identity.address).toBe('');
    });

    it('migrates v1 campaign adding templates field to brokers', () => {
      const v1Campaign = {
        version: 1,
        createdAt: '2026-01-01T00:00:00.000Z',
        identity: { fullName: 'Test User', emails: ['test@example.com'], phone: '', address: '' },
        brokers: { selected: ['acxiom', 'oracle'] },
      };
      const result = migrateCampaign(v1Campaign);
      expect(result).not.toBe(null);
      expect(result.version).toBe(3);
      expect(result.brokers.selected).toEqual(['acxiom', 'oracle']);
      expect(result.brokers.templates).toEqual({});
      expect(result.encryption).toBeNull();
    });

    it('preserves existing templates when migrating v2 campaign', () => {
      const v2Campaign = {
        version: 2,
        createdAt: '2026-01-01T00:00:00.000Z',
        identity: { fullName: 'Test User', emails: ['test@example.com'], phone: '', address: '' },
        brokers: { selected: ['acxiom'], templates: { acxiom: { body: 'Custom text', editedAt: '2026-03-30T12:00:00.000Z' } } },
      };
      const result = migrateCampaign(v2Campaign);
      expect(result.brokers.templates.acxiom.body).toBe('Custom text');
    });

    it('migrates v2 campaign to v3 with encryption field', () => {
      const v2 = { version: 2, identity: { fullName: 'Test' }, brokers: {} };
      const migrated = migrateCampaign(v2);
      expect(migrated.version).toBe(3);
      expect(migrated.encryption).toBeNull();
    });

    it('preserves existing encryption field from v3 data', () => {
      const v3 = { version: 3, encryption: { publicKeyJwk: {}, privateKeyJwk: {} }, identity: {}, brokers: {} };
      const migrated = migrateCampaign(v3);
      expect(migrated.encryption).toEqual({ publicKeyJwk: {}, privateKeyJwk: {} });
    });
  });

  describe('auto-save effect', () => {
    it('writes to localStorage after debounce', () => {
      updateIdentity('fullName', 'Auto Save Test');
      // Should NOT have written yet (within debounce window)
      expect(localStorage.getItem('ek-campaign')).toBe(null);
      // Advance past debounce
      vi.advanceTimersByTime(600);
      const stored = JSON.parse(localStorage.getItem('ek-campaign'));
      expect(stored.identity.fullName).toBe('Auto Save Test');
    });
  });

  describe('saveCampaignToFile', () => {
    it('calls fileSave with a Blob of type application/json and correct fileName', async () => {
      mockFileSave.mockResolvedValue(undefined);
      await saveCampaignToFile();
      expect(mockFileSave).toHaveBeenCalledTimes(1);
      const [blob, options] = mockFileSave.mock.calls[0];
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('application/json');
      expect(options.fileName).toBe('erasure-kit-campaign.json');
    });
  });

  describe('loadCampaignFromFile', () => {
    it('with valid JSON updates campaign.value', async () => {
      const validCampaign = {
        version: 1,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        identity: { fullName: 'Loaded User', emails: ['loaded@example.com'], phone: '', address: '' },
        brokers: {},
        tempEmail: null,
        messages: [],
        statuses: {},
        settings: {},
      };
      const mockFile = new Blob([JSON.stringify(validCampaign)], { type: 'application/json' });
      mockFile.text = () => Promise.resolve(JSON.stringify(validCampaign));
      mockFileOpen.mockResolvedValue(mockFile);

      const result = await loadCampaignFromFile();
      expect(result.success).toBe(true);
      expect(campaign.value.identity.fullName).toBe('Loaded User');
    });

    it('with invalid JSON returns { error: "parse" }', async () => {
      const mockFile = new Blob(['not json'], { type: 'application/json' });
      mockFile.text = () => Promise.resolve('not json');
      mockFileOpen.mockResolvedValue(mockFile);

      const result = await loadCampaignFromFile();
      expect(result.error).toBe('parse');
    });

    it('when user cancels returns { cancelled: true }', async () => {
      const abortError = new DOMException('User cancelled', 'AbortError');
      mockFileOpen.mockRejectedValue(abortError);

      const result = await loadCampaignFromFile();
      expect(result.cancelled).toBe(true);
    });

    it('with valid JSON but invalid campaign returns { error: "invalid" }', async () => {
      const invalidCampaign = { version: 999, identity: {} };
      const mockFile = new Blob([JSON.stringify(invalidCampaign)], { type: 'application/json' });
      mockFile.text = () => Promise.resolve(JSON.stringify(invalidCampaign));
      mockFileOpen.mockResolvedValue(mockFile);

      const result = await loadCampaignFromFile();
      expect(result.error).toBe('invalid');
    });
  });

  describe('startNewCampaign', () => {
    it('resets campaign to empty and clears localStorage', async () => {
      // First, set some data
      updateIdentity('fullName', 'To Be Cleared');
      vi.advanceTimersByTime(600); // let auto-save run
      expect(localStorage.getItem('ek-campaign')).not.toBe(null);

      await startNewCampaign();
      expect(campaign.value.identity.fullName).toBe('');
      expect(hasExistingCampaign.value).toBe(false);
      expect(localStorage.getItem('ek-campaign')).toBe(null);
    });

    it('generates encryption keys and temp email on new campaign', async () => {
      await startNewCampaign();
      expect(campaign.value.encryption).not.toBeNull();
      expect(campaign.value.encryption.publicKeyJwk).toBeDefined();
      expect(campaign.value.encryption.privateKeyJwk).toBeDefined();
      expect(campaign.value.tempEmail).toMatch(/^[a-z0-9]{8}@erasurekit\.uk$/);
    });
  });

  describe('IDEN-04: no network calls', () => {
    it('campaign.js source contains zero occurrences of fetch, XMLHttpRequest, navigator.sendBeacon', async () => {
      // Read the actual source file
      const fs = await import('fs');
      const path = await import('path');
      const source = fs.readFileSync(
        path.resolve(import.meta.dirname, 'campaign.js'),
        'utf-8'
      );
      expect(source).not.toMatch(/\bfetch\s*\(/);
      expect(source).not.toMatch(/XMLHttpRequest/);
      expect(source).not.toMatch(/sendBeacon/);
    });
  });
});
