import React, { createContext, useContext, useState, useEffect } from 'react';
import translations from './i18n';

const LangContext = createContext();

export function LangProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem('clinic_lang') || 'zh');

  const changeLang = (l) => {
    setLang(l);
    localStorage.setItem('clinic_lang', l);
  };

  const t = (key) => translations[lang]?.[key] || translations['zh']?.[key] || key;

  return (
    <LangContext.Provider value={{ lang, changeLang, t }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}

export function LangSwitcher() {
  const { lang, changeLang } = useLang();
  const langs = [
    { code: 'zh', label: '中文' },
    { code: 'kk', label: 'Қаз' },
    { code: 'ru', label: 'Рус' },
  ];
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {langs.map(l => (
        <button
          key={l.code}
          onClick={() => changeLang(l.code)}
          style={{
            padding: '4px 10px',
            borderRadius: 6,
            border: '1px solid',
            fontSize: 12,
            cursor: 'pointer',
            fontWeight: lang === l.code ? 600 : 400,
            background: lang === l.code ? 'rgba(255,255,255,0.25)' : 'transparent',
            color: lang === l.code ? '#fff' : 'rgba(255,255,255,0.6)',
            borderColor: lang === l.code ? 'rgba(255,255,255,0.5)' : 'transparent',
            transition: 'all 0.15s',
          }}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
