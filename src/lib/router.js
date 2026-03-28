import { signal } from '@preact/signals';

/**
 * Valid page identifiers for the app.
 * @type {'welcome'|'identity'|'brokers'|'send'|'track'|'about'|'legal'|'escalation'}
 */

/** Current active page */
export const currentPage = signal('welcome');

/** Set of completed wizard steps (for stepper visual state per D-03) */
export const completedSteps = signal(new Set());

/**
 * Navigate to a page. If it's a wizard step, also track it in completed steps.
 * @param {string} page - The page ID to navigate to
 */
export function navigateTo(page) {
  currentPage.value = page;
}

/**
 * Mark a wizard step as completed (for stepper checkmark display per D-03).
 * @param {string} stepId - The step ID to mark complete
 */
export function markStepComplete(stepId) {
  const next = new Set(completedSteps.value);
  next.add(stepId);
  completedSteps.value = next;
}
