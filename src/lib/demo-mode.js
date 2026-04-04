import { signal } from '@preact/signals';

/**
 * Global demo mode signal.
 * When true, email sending is simulated (no relay API calls or real emails sent).
 * Brokers are still marked as sent and notifications are shown.
 */
export const demoMode = signal(false);
