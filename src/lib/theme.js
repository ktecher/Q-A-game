// Theme persistence + read/write helpers.
// Theme is applied via `data-theme` attribute on <html>.
// Supported values: 'dark' (default) | 'light'.

const STORAGE_KEY = 'uah.theme';

export function readTheme() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    // ignore (private mode, etc.)
  }
  return 'dark';
}

export function writeTheme(theme) {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // ignore
  }
}

export function applyTheme(theme) {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', theme);
}

export function toggleTheme(current) {
  return current === 'light' ? 'dark' : 'light';
}
