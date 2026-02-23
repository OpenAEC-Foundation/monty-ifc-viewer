import { createSignal, createRoot } from 'solid-js';
import { translations, type Locale, type TranslationKey } from '@/i18n/translations';

export type { Locale, TranslationKey };

export const LOCALE_OPTIONS: { id: Locale; label: string; flag: string }[] = [
  { id: 'nl', label: 'Nederlands', flag: 'NL' },
  { id: 'en', label: 'English', flag: 'EN' },
];

const SUPPORTED_LOCALES = Object.keys(translations) as Locale[];

function detectBrowserLocale(): Locale {
  try {
    for (const lang of navigator.languages ?? [navigator.language]) {
      const code = lang.split('-')[0].toLowerCase();
      if (SUPPORTED_LOCALES.includes(code as Locale)) {
        return code as Locale;
      }
    }
  } catch {}
  return 'nl';
}

function getInitialLocale(): Locale {
  try {
    const stored = localStorage.getItem('locale');
    if (stored && stored in translations) {
      return stored as Locale;
    }
  } catch {}
  return detectBrowserLocale();
}

export const [locale, setLocale] = createSignal<Locale>(getInitialLocale());

createRoot(() => {
  // Persistence is handled by setLocale wrapper below
});

const _setLocale = setLocale;
export { _setLocale as setLocaleRaw };

export function changeLocale(l: Locale): void {
  setLocale(l);
  try {
    localStorage.setItem('locale', l);
  } catch {}
}

export function t(key: TranslationKey): string {
  const dict = translations[locale()];
  return dict[key] ?? key;
}
