import React, { createContext, useContext, useState, useEffect } from 'react';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from '../src/translations/en.json';
import hi from '../src/translations/hi.json';
import te from '../src/translations/te.json';
import ta from '../src/translations/ta.json';
import kn from '../src/translations/kn.json';

export type Language = 'en' | 'hi' | 'te' | 'ta' | 'kn';

export interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    dir: 'ltr' | 'rtl';
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const SUPPORTED_LANGUAGES: { code: Language; name: string; native: string; dir: 'ltr' | 'rtl' }[] = [
    { code: 'en', name: 'English', native: 'English', dir: 'ltr' },
    { code: 'hi', name: 'Hindi', native: 'हिन्दी', dir: 'ltr' },
    { code: 'te', name: 'Telugu', native: 'తెలుగు', dir: 'ltr' },
    { code: 'ta', name: 'Tamil', native: 'தமிழ்', dir: 'ltr' },
    { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ', dir: 'ltr' },
];

const resources = {
    en: { translation: en },
    hi: { translation: hi },
    te: { translation: te },
    ta: { translation: ta },
    kn: { translation: kn },
};

// Initialize i18next
i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources,
        fallbackLng: 'en',
        debug: false,
        interpolation: {
            escapeValue: false,
        },
    });

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [language, setLanguage] = useState<Language>('en');

    useEffect(() => {
        const savedLang = localStorage.getItem('i18nextLng') as Language;
        if (savedLang && SUPPORTED_LANGUAGES.some(l => l.code === savedLang)) {
            setLanguage(savedLang);
        }
    }, []);

    const handleSetLanguage = (lang: Language) => {
        setLanguage(lang);
        i18n.changeLanguage(lang);
        localStorage.setItem('i18nextLng', lang);
        document.documentElement.lang = lang;
        document.documentElement.dir = SUPPORTED_LANGUAGES.find(l => l.code === lang)?.dir || 'ltr';
    };

    const value = {
        language,
        setLanguage: handleSetLanguage,
        dir: SUPPORTED_LANGUAGES.find(l => l.code === language)?.dir || 'ltr',
    };

    return (
        <LanguageContext.Provider value={value}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};
