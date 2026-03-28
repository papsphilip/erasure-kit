import { signal, effect } from '@preact/signals';

// Initialize from localStorage or default to dark (per D-06)
const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('ek-theme') : null;
export const isDark = signal(stored ? stored === 'dark' : true);

// Sync to DOM and localStorage
effect(() => {
  const root = document.documentElement;
  if (isDark.value) {
    root.classList.add('dark');
    root.classList.remove('light');
  } else {
    root.classList.remove('dark');
    root.classList.add('light');
  }
  localStorage.setItem('ek-theme', isDark.value ? 'dark' : 'light');
});

export function toggleTheme() {
  isDark.value = !isDark.value;
}
