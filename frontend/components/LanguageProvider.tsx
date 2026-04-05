'use client';

import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { DEFAULT_LOCALE, LOCALES, getTranslation, type Locale } from '@/lib/i18n';

interface LanguageContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
  languageOptions: Array<{ code: Locale; label: string }>;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    const savedLocale = window.localStorage.getItem('chefmes-language') as Locale | null;
    if (savedLocale && LOCALES.some((item) => item.code === savedLocale)) {
      setLocaleState(savedLocale);
      return;
    }

    const browserLanguage = window.navigator.language.slice(0, 2).toLowerCase();
    if (browserLanguage === 'fr' || browserLanguage === 'it' || browserLanguage === 'de') {
      setLocaleState(browserLanguage as Locale);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem('chefmes-language', locale);
  }, [locale]);

  const value = useMemo(
    () => ({
      locale,
      setLocale: setLocaleState,
      t: (key: string) => getTranslation(locale, key),
      languageOptions: LOCALES,
    }),
    [locale],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useTranslations() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslations must be used within LanguageProvider');
  }
  return context;
}

export function LanguageSwitcher() {
  const { locale, setLocale, languageOptions, t } = useTranslations();

  return (
    <div className="pt-4 border-t border-slate-800">
      <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold mb-3">{t('language')}</p>
      <div className="grid grid-cols-3 gap-2">
        {languageOptions.map((option) => (
          <button
            key={option.code}
            type="button"
            onClick={() => setLocale(option.code)}
            className={`text-xs font-semibold rounded-lg py-2 transition-all ${
              option.code === locale
                ? 'bg-slate-100 text-slate-900 border border-slate-300'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
