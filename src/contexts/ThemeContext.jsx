import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { readTheme, writeTheme, applyTheme, toggleTheme } from '../lib/theme';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  // Lazy initializer — read from localStorage once, apply immediately
  const [theme, setTheme] = useState(() => {
    const t = readTheme();
    applyTheme(t);
    return t;
  });

  // Persist on change
  useEffect(() => {
    applyTheme(theme);
    writeTheme(theme);
  }, [theme]);

  const toggle = useCallback(() => {
    setTheme((prev) => toggleTheme(prev));
  }, []);

  const value = { theme, setTheme, toggle, isDark: theme === 'dark' };
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}
