'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'tr' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'tr',
  setLanguage: () => {},
  toggleLanguage: () => {},
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('tr');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('agentforge_language');
      if (saved === 'en' || saved === 'tr') {
        setLanguageState(saved);
      }
    } catch {
      // LocalStorage access might fail in restricted iframe environments
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('agentforge_language', lang);
    } catch {
      // Ignore storage errors
    }
  };

  const toggleLanguage = () => {
    setLanguage(language === 'tr' ? 'en' : 'tr');
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
