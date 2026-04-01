import { signal } from '@preact/signals';

/**
 * Global demo mode signal.
 * When true, email sending is simulated (no mailto: or clipboard actions).
 * Brokers are still marked as sent and notifications are shown.
 */
export const demoMode = signal(false);
