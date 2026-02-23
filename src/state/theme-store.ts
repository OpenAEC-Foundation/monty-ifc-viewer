import { createSignal, createRoot, createEffect } from 'solid-js';

export type Theme = 'dark' | 'light' | 'blue' | 'highContrast';

export const THEME_OPTIONS: { id: Theme; labelKey: string; swatch: string }[] = [
  { id: 'dark', labelKey: 'theme.dark', swatch: '#1E293B' },
  { id: 'light', labelKey: 'theme.light', swatch: '#F1F5F9' },
  { id: 'blue', labelKey: 'theme.blue', swatch: '#0C1929' },
  { id: 'highContrast', labelKey: 'theme.highContrast', swatch: '#000000' },
];

function getInitialTheme(): Theme {
  try {
    const stored = localStorage.getItem('theme');
    if (stored && THEME_OPTIONS.some((t) => t.id === stored)) {
      return stored as Theme;
    }
  } catch {}
  return 'dark';
}

export const [theme, setTheme] = createSignal<Theme>(getInitialTheme());

createRoot(() => {
  createEffect(() => {
    const t = theme();
    document.documentElement.setAttribute('data-theme', t);
    try {
      localStorage.setItem('theme', t);
    } catch {}
  });
});
