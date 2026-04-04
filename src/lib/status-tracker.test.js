import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('status-tracker FAILED status', () => {
  let STATUS, STATUS_LABELS, STATUS_COLORS;
  let markBrokerFailed, retryBroker, getStatusCounts, getProgressPercent, markBrokerSent, getBrokerStatus;
  let campaign, createEmptyCampaign;

  beforeEach(async () => {
    vi.useFakeTimers();
    localStorage.clear();

    // Dynamic import to get fresh module state per test
    vi.resetModules();
    const campaignMod = await import('./campaign.js');
    campaign = campaignMod.campaign;
    createEmptyCampaign = campaignMod.createEmptyCampaign;

    const trackerMod = await import('./status-tracker.js');
    STATUS = trackerMod.STATUS;
    STATUS_LABELS = trackerMod.STATUS_LABELS;
    STATUS_COLORS = trackerMod.STATUS_COLORS;
    markBrokerFailed = trackerMod.markBrokerFailed;
    retryBroker = trackerMod.retryBroker;
    getStatusCounts = trackerMod.getStatusCounts;
    getProgressPercent = trackerMod.getProgressPercent;
    markBrokerSent = trackerMod.markBrokerSent;
    getBrokerStatus = trackerMod.getBrokerStatus;

    // Set up campaign with 3 selected brokers and empty statuses
    campaign.value = {
      ...createEmptyCampaign(),
      brokers: { selected: ['broker-1', 'broker-2', 'broker-3'], templates: {} },
      statuses: {},
    };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('STATUS enum', () => {
    it('STATUS.FAILED equals "failed"', () => {
      expect(STATUS.FAILED).toBe('failed');
    });
  });

  describe('STATUS_LABELS', () => {
    it('STATUS_LABELS[STATUS.FAILED] equals "Failed"', () => {
      expect(STATUS_LABELS[STATUS.FAILED]).toBe('Failed');
    });
  });

  describe('STATUS_COLORS', () => {
    it('STATUS_COLORS[STATUS.FAILED] has bg, text, and dot properties with red color values', () => {
      const colors = STATUS_COLORS[STATUS.FAILED];
      expect(colors).toBeDefined();
      expect(colors.bg).toContain('red');
      expect(colors.text).toContain('red');
      expect(colors.dot).toContain('red');
    });
  });

  describe('markBrokerFailed', () => {
    it('sets status to FAILED with error details', () => {
      markBrokerFailed('broker-1', 'RESEND_FAILED', 'Email delivery failed');
      const entry = getBrokerStatus('broker-1');
      expect(entry.status).toBe('failed');
      expect(entry.error).toBeDefined();
      expect(entry.error.code).toBe('RESEND_FAILED');
      expect(entry.error.message).toBe('Email delivery failed');
    });

    it('preserves existing sentAt and deadline values', () => {
      // First mark broker as sent (sets sentAt and deadline)
      markBrokerSent('broker-1');
      const sentEntry = getBrokerStatus('broker-1');
      const { sentAt, deadline } = sentEntry;

      // Now mark as failed
      vi.advanceTimersByTime(1000);
      markBrokerFailed('broker-1', 'RATE_LIMITED', 'Too many requests');
      const failedEntry = getBrokerStatus('broker-1');

      expect(failedEntry.sentAt).toBe(sentAt);
      expect(failedEntry.deadline).toBe(deadline);
      expect(failedEntry.status).toBe('failed');
    });

    it('adds history entry with error details', () => {
      markBrokerFailed('broker-1', 'RESEND_FAILED', 'Email delivery failed');
      const entry = getBrokerStatus('broker-1');
      const lastHistory = entry.history[entry.history.length - 1];

      expect(lastHistory.status).toBe('failed');
      expect(lastHistory.at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(lastHistory.details).toContain('RESEND_FAILED');
      expect(lastHistory.details).toContain('Email delivery failed');
    });
  });

  describe('getStatusCounts', () => {
    it('includes "failed" key in returned object', () => {
      const counts = getStatusCounts();
      expect(counts).toHaveProperty('failed');
    });

    it('counts failed brokers correctly (failed brokers should NOT be counted in "sent")', () => {
      // Set up: broker-1 awaiting, broker-2 failed, broker-3 confirmed
      markBrokerSent('broker-1'); // -> awaiting
      markBrokerSent('broker-2');
      markBrokerFailed('broker-2', 'RESEND_FAILED', 'Failed');
      // Manually set broker-3 to confirmed
      campaign.value = {
        ...campaign.value,
        statuses: {
          ...campaign.value.statuses,
          'broker-3': {
            status: 'confirmed',
            sentAt: new Date().toISOString(),
            deadline: null,
            history: [{ status: 'confirmed', at: new Date().toISOString(), details: 'Confirmed' }],
          },
        },
      };

      const counts = getStatusCounts();
      expect(counts.failed).toBe(1);
      expect(counts.awaiting).toBe(1);
      expect(counts.confirmed).toBe(1);
      // Failed brokers should NOT count as sent
      expect(counts.sent).toBe(2); // awaiting + confirmed, NOT failed
    });
  });

  describe('getProgressPercent', () => {
    it('does NOT count failed brokers as resolved (failed = still pending)', () => {
      // 3 selected brokers: 1 confirmed, 1 failed, 1 awaiting
      campaign.value = {
        ...campaign.value,
        statuses: {
          'broker-1': {
            status: 'confirmed',
            sentAt: new Date().toISOString(),
            deadline: null,
            history: [],
          },
          'broker-2': {
            status: 'failed',
            sentAt: null,
            deadline: null,
            error: { code: 'RESEND_FAILED', message: 'Failed' },
            history: [],
          },
          'broker-3': {
            status: 'awaiting',
            sentAt: new Date().toISOString(),
            deadline: new Date().toISOString(),
            history: [],
          },
        },
      };

      // Progress = (confirmed + rejected) / total = 1/3 = 33%
      const progress = getProgressPercent();
      expect(progress).toBe(33);
    });
  });

  describe('retryBroker', () => {
    it('resets status from FAILED back to SELECTED for re-send', () => {
      // Set up: mark as failed first
      markBrokerFailed('broker-1', 'RESEND_FAILED', 'Email delivery failed');
      expect(getBrokerStatus('broker-1').status).toBe('failed');

      // Now retry
      vi.advanceTimersByTime(1000);
      retryBroker('broker-1');
      const entry = getBrokerStatus('broker-1');

      expect(entry.status).toBe('selected');
      expect(entry.error).toBeUndefined();

      // Check history has retry entry
      const lastHistory = entry.history[entry.history.length - 1];
      expect(lastHistory.status).toBe('selected');
      expect(lastHistory.details).toContain('retry');
    });
  });
});
