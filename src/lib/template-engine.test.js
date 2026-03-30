import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Test Fixtures ──────────────────────────────────────────────────────────────

const mockIdentity = {
  fullName: 'Jane Doe',
  emails: ['jane@example.com', 'jdoe@work.com'],
  phone: '+30 690 000 0000',
  address: '123 Example St',
};

const mockIdentityMinimal = {
  fullName: 'Jane Doe',
  emails: ['jane@example.com'],
  phone: '',
  address: '',
};

const mockGDPRBroker = {
  id: 'test-gdpr',
  name: 'TestBroker EU',
  email: 'dpo@testbroker.eu',
  region: 'EU/EEA',
  legalFramework: 'GDPR',
};

const mockUKBroker = {
  id: 'test-uk',
  name: 'TestBroker UK',
  email: 'dpo@testbroker.co.uk',
  region: 'UK',
  legalFramework: 'UK-GDPR',
};

const mockCCPABroker = {
  id: 'test-us',
  name: 'TestBroker US',
  email: 'privacy@testbroker.com',
  region: 'US',
  legalFramework: 'CCPA',
};

const mockOtherBroker = {
  id: 'test-other',
  name: 'TestBroker Other',
  email: 'info@testbroker.xyz',
  region: 'Other',
  legalFramework: 'Other',
};

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('template-engine', () => {
  let generateTemplate, generateGDPR, generateUKGDPR, generateCCPA;
  let getTemplateForBroker, saveCustomTemplate, resetBrokerTemplate;

  beforeEach(async () => {
    vi.useFakeTimers();
    localStorage.clear();
    vi.resetModules();

    const mod = await import('./template-engine.js');
    generateTemplate = mod.generateTemplate;
    generateGDPR = mod.generateGDPR;
    generateUKGDPR = mod.generateUKGDPR;
    generateCCPA = mod.generateCCPA;
    getTemplateForBroker = mod.getTemplateForBroker;
    saveCustomTemplate = mod.saveCustomTemplate;
    resetBrokerTemplate = mod.resetBrokerTemplate;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ── GDPR Template ──────────────────────────────────────────────────────────

  describe('GDPR template', () => {
    it('contains Article 17(1) citation in body', () => {
      const { body } = generateGDPR(mockIdentity, mockGDPRBroker);
      expect(body).toContain('Article 17(1)');
    });

    it('contains Article 17 in body', () => {
      const { body } = generateGDPR(mockIdentity, mockGDPRBroker);
      expect(body).toContain('Article 17');
    });

    it('contains Article 19 citation in body', () => {
      const { body } = generateGDPR(mockIdentity, mockGDPRBroker);
      expect(body).toContain('Article 19');
    });

    it('contains Article 12(3) citation in body', () => {
      const { body } = generateGDPR(mockIdentity, mockGDPRBroker);
      expect(body).toContain('Article 12(3)');
    });

    it('contains Article 12(4) citation in body', () => {
      const { body } = generateGDPR(mockIdentity, mockGDPRBroker);
      expect(body).toContain('Article 12(4)');
    });

    it('says "one calendar month" not "30 days"', () => {
      const { body } = generateGDPR(mockIdentity, mockGDPRBroker);
      expect(body).toContain('one calendar month');
      expect(body).not.toContain('30 days');
    });

    it('has correct subject line format', () => {
      const { subject } = generateGDPR(mockIdentity, mockGDPRBroker);
      expect(subject).toBe('Data Erasure Request - GDPR Article 17 - Jane Doe');
    });

    it('includes broker name in body', () => {
      const { body } = generateGDPR(mockIdentity, mockGDPRBroker);
      expect(body).toContain('TestBroker EU');
    });
  });

  // ── UK-GDPR Template ───────────────────────────────────────────────────────

  describe('UK-GDPR template', () => {
    it('contains "UK GDPR" in body', () => {
      const { body } = generateUKGDPR(mockIdentity, mockUKBroker);
      expect(body).toContain('UK GDPR');
    });

    it('contains "Data Protection Act 2018" in body', () => {
      const { body } = generateUKGDPR(mockIdentity, mockUKBroker);
      expect(body).toContain('Data Protection Act 2018');
    });

    it('contains "ICO" reference in body', () => {
      const { body } = generateUKGDPR(mockIdentity, mockUKBroker);
      expect(body).toContain('ICO');
    });

    it('says "one calendar month"', () => {
      const { body } = generateUKGDPR(mockIdentity, mockUKBroker);
      expect(body).toContain('one calendar month');
    });

    it('has correct subject line format', () => {
      const { subject } = generateUKGDPR(mockIdentity, mockUKBroker);
      expect(subject).toBe('Data Erasure Request - UK GDPR Article 17 - Jane Doe');
    });

    it('includes broker name in body', () => {
      const { body } = generateUKGDPR(mockIdentity, mockUKBroker);
      expect(body).toContain('TestBroker UK');
    });
  });

  // ── CCPA Template ──────────────────────────────────────────────────────────

  describe('CCPA template', () => {
    it('contains "1798.105" in body', () => {
      const { body } = generateCCPA(mockIdentity, mockCCPABroker);
      expect(body).toContain('1798.105');
    });

    it('contains "personal information" (not "personal data")', () => {
      const { body } = generateCCPA(mockIdentity, mockCCPABroker);
      expect(body).toContain('personal information');
      expect(body).not.toContain('personal data');
    });

    it('contains "45" for deadline', () => {
      const { body } = generateCCPA(mockIdentity, mockCCPABroker);
      expect(body).toContain('45');
    });

    it('has correct subject line format', () => {
      const { subject } = generateCCPA(mockIdentity, mockCCPABroker);
      expect(subject).toBe('Personal Information Deletion Request - CCPA - Jane Doe');
    });

    it('includes broker name in body', () => {
      const { body } = generateCCPA(mockIdentity, mockCCPABroker);
      expect(body).toContain('TestBroker US');
    });
  });

  // ── Region Selection ───────────────────────────────────────────────────────

  describe('region selection', () => {
    it('routes GDPR legalFramework to GDPR template', () => {
      const result = generateTemplate(mockIdentity, mockGDPRBroker);
      expect(result.subject).toContain('GDPR Article 17');
    });

    it('routes UK-GDPR legalFramework to UK-GDPR template', () => {
      const result = generateTemplate(mockIdentity, mockUKBroker);
      expect(result.subject).toContain('UK GDPR Article 17');
    });

    it('routes CCPA legalFramework to CCPA template', () => {
      const result = generateTemplate(mockIdentity, mockCCPABroker);
      expect(result.subject).toContain('CCPA');
    });

    it('falls back to GDPR for "Other" legalFramework', () => {
      const result = generateTemplate(mockIdentity, mockOtherBroker);
      const gdprResult = generateTemplate(mockIdentity, { ...mockOtherBroker, legalFramework: 'GDPR' });
      // Subject should match GDPR format (with different broker name)
      expect(result.body).toContain('Article 17(1)');
      expect(result.body).toContain('Article 19');
    });
  });

  // ── Identity Pre-fill ──────────────────────────────────────────────────────

  describe('identity pre-fill', () => {
    it('includes fullName in all three template bodies', () => {
      const gdpr = generateTemplate(mockIdentity, mockGDPRBroker);
      const uk = generateTemplate(mockIdentity, mockUKBroker);
      const ccpa = generateTemplate(mockIdentity, mockCCPABroker);
      expect(gdpr.body).toContain('Jane Doe');
      expect(uk.body).toContain('Jane Doe');
      expect(ccpa.body).toContain('Jane Doe');
    });

    it('includes each non-empty email from identity.emails', () => {
      const { body } = generateTemplate(mockIdentity, mockGDPRBroker);
      expect(body).toContain('jane@example.com');
      expect(body).toContain('jdoe@work.com');
    });

    it('includes phone when provided', () => {
      const { body } = generateTemplate(mockIdentity, mockGDPRBroker);
      expect(body).toContain('+30 690 000 0000');
    });

    it('includes address when provided', () => {
      const { body } = generateTemplate(mockIdentity, mockGDPRBroker);
      expect(body).toContain('123 Example St');
    });

    it('omits phone when empty', () => {
      const { body } = generateTemplate(mockIdentityMinimal, mockGDPRBroker);
      expect(body).not.toContain('Phone');
    });

    it('omits address when empty', () => {
      const { body } = generateTemplate(mockIdentityMinimal, mockGDPRBroker);
      expect(body).not.toContain('Address');
    });
  });

  // ── Terminology ────────────────────────────────────────────────────────────

  describe('terminology', () => {
    it('GDPR template uses "one calendar month"', () => {
      const { body } = generateGDPR(mockIdentity, mockGDPRBroker);
      expect(body).toContain('one calendar month');
    });

    it('UK-GDPR template uses "one calendar month"', () => {
      const { body } = generateUKGDPR(mockIdentity, mockUKBroker);
      expect(body).toContain('one calendar month');
    });

    it('CCPA template uses "45" for deadline', () => {
      const { body } = generateCCPA(mockIdentity, mockCCPABroker);
      expect(body).toContain('45');
    });

    it('no template contains "30 days"', () => {
      const gdpr = generateGDPR(mockIdentity, mockGDPRBroker);
      const uk = generateUKGDPR(mockIdentity, mockUKBroker);
      const ccpa = generateCCPA(mockIdentity, mockCCPABroker);
      expect(gdpr.body).not.toContain('30 days');
      expect(uk.body).not.toContain('30 days');
      expect(ccpa.body).not.toContain('30 days');
    });
  });

  // ── generateTemplate return shape ──────────────────────────────────────────

  describe('generateTemplate return shape', () => {
    it('returns { subject: string, body: string }', () => {
      const result = generateTemplate(mockIdentity, mockGDPRBroker);
      expect(typeof result.subject).toBe('string');
      expect(typeof result.body).toBe('string');
      expect(result.subject.length).toBeGreaterThan(0);
      expect(result.body.length).toBeGreaterThan(0);
    });
  });

  // ── getTemplateForBroker ───────────────────────────────────────────────────

  describe('getTemplateForBroker', () => {
    it('returns { subject, body, isCustom: false } for unedited brokers', () => {
      const result = getTemplateForBroker(mockIdentity, mockGDPRBroker, {});
      expect(result.isCustom).toBe(false);
      expect(result.subject).toContain('GDPR');
      expect(result.body).toContain('Article 17');
    });

    it('returns { subject, body, isCustom: true } with custom body for edited brokers', () => {
      const customTemplates = {
        'test-gdpr': { body: 'My custom erasure text', editedAt: '2026-03-30T12:00:00.000Z' },
      };
      const result = getTemplateForBroker(mockIdentity, mockGDPRBroker, customTemplates);
      expect(result.isCustom).toBe(true);
      expect(result.body).toBe('My custom erasure text');
      expect(result.subject).toContain('GDPR'); // subject still auto-generated
    });

    it('returns default when customTemplates is null/undefined', () => {
      const result = getTemplateForBroker(mockIdentity, mockGDPRBroker, null);
      expect(result.isCustom).toBe(false);
    });
  });

  // ── saveCustomTemplate / resetBrokerTemplate ───────────────────────────────

  describe('saveCustomTemplate / resetBrokerTemplate', () => {
    it('saveCustomTemplate stores body + editedAt in campaign.brokers.templates', async () => {
      // Need campaign module for state
      vi.resetModules();
      const campaignMod = await import('./campaign.js');
      const templateMod = await import('./template-engine.js');

      vi.setSystemTime(new Date('2026-03-30T12:00:00.000Z'));
      templateMod.saveCustomTemplate('test-gdpr', 'Custom body text');

      expect(campaignMod.campaign.value.brokers.templates['test-gdpr']).toBeDefined();
      expect(campaignMod.campaign.value.brokers.templates['test-gdpr'].body).toBe('Custom body text');
      expect(campaignMod.campaign.value.brokers.templates['test-gdpr'].editedAt).toBe('2026-03-30T12:00:00.000Z');
    });

    it('resetBrokerTemplate removes the brokerId key from campaign.brokers.templates', async () => {
      vi.resetModules();
      const campaignMod = await import('./campaign.js');
      const templateMod = await import('./template-engine.js');

      // First save a custom template
      templateMod.saveCustomTemplate('test-gdpr', 'Custom body text');
      expect(campaignMod.campaign.value.brokers.templates['test-gdpr']).toBeDefined();

      // Then reset it
      templateMod.resetBrokerTemplate('test-gdpr');
      expect(campaignMod.campaign.value.brokers.templates['test-gdpr']).toBeUndefined();
    });
  });

  // ── Pure function check ────────────────────────────────────────────────────

  describe('pure function (no network calls)', () => {
    it('template-engine.js source contains zero occurrences of fetch or XMLHttpRequest', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const source = fs.readFileSync(
        path.resolve(import.meta.dirname, 'template-engine.js'),
        'utf-8'
      );
      expect(source).not.toMatch(/\bfetch\s*\(/);
      expect(source).not.toMatch(/XMLHttpRequest/);
    });
  });
});
