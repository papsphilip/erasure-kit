import { html } from 'htm/preact';
import { currentPage, completedSteps, navigateTo } from '../lib/router.js';

const STEPS = [
  { id: 'identity', label: 'Identity', number: 1 },
  { id: 'brokers',  label: 'Brokers',  number: 2 },
  { id: 'track',    label: 'Track',    number: 3 },
];

/**
 * 3-step wizard navigation with visual progress indicators (D-07).
 * All steps are always clickable (free jumping per D-02).
 * Shows circles with numbers, checkmarks for completed steps,
 * and connecting lines between steps.
 */
export function Stepper() {
  return html`
    <nav class="sticky top-14 z-20 flex items-center justify-center gap-2 py-3 px-4 bg-[var(--ek-surface-alt)] border-b border-[var(--ek-border)]" aria-label="Progress">
      ${STEPS.map((step, i) => {
        const isCurrent = currentPage.value === step.id;
        const isCompleted = completedSteps.value.has(step.id);
        const isPreviousCompleted = i > 0 && completedSteps.value.has(STEPS[i - 1].id);

        return html`
          ${i > 0 && html`
            <div class="w-8 h-0.5 ${isPreviousCompleted ? 'bg-[var(--ek-primary)]' : 'bg-[var(--ek-border)]'}"></div>
          `}
          <button
            onClick=${() => navigateTo(step.id)}
            class="flex items-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ek-surface-alt)] rounded-lg"
            aria-current=${isCurrent ? 'step' : undefined}
          >
            <div class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium border-2 transition-colors duration-150 ${
              isCurrent
                ? 'bg-[var(--ek-primary)] text-white border-[var(--ek-primary)]'
                : isCompleted
                  ? 'bg-[var(--ek-primary)] text-white border-[var(--ek-primary)]'
                  : 'text-[var(--ek-text-muted)] border-[var(--ek-border)]'
            }">
              ${isCompleted
                ? html`<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>`
                : step.number
              }
            </div>
            <span class="hidden sm:inline text-sm font-medium ${
              isCurrent || isCompleted
                ? 'text-[var(--ek-primary)]'
                : 'text-[var(--ek-text-muted)]'
            }">
              ${step.label}
            </span>
          </button>
        `;
      })}
    </nav>
  `;
}
