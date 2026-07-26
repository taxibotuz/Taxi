import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import translations, { Language } from './translations';

interface I18nContextType {
  lang: Language;
  setLang: (l: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextType>({
  lang: 'uz',
  setLang: () => {},
  t: (key) => key,
});

function getInitialLang(): Language {
  try {
    const ls = localStorage.getItem('taxigo_lang');
    if (ls === 'uz' || ls === 'ru') return ls;
  } catch {}
  return 'uz';
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>(getInitialLang);

  const setLang = useCallback((l: Language) => {
    setLangState(l);
    try { localStorage.setItem('taxigo_lang', l); } catch {}
  }, []);

  const t = useCallback((key: string, params?: Record<string, string | number>): string => {
    let value = translations[lang]?.[key] || translations.uz[key] || key;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        value = value.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
      });
    }
    return value;
  }, [lang]);

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation() {
  return useContext(I18nContext);
}
