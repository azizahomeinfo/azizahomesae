import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import ar from './locales/ar.json';
import zh from './locales/zh.json';
import de from './locales/de.json';
import fr from './locales/fr.json';
import it from './locales/it.json';
import ru from './locales/ru.json';

import enPages from './locales/pages/en.json';
import arPages from './locales/pages/ar.json';
import zhPages from './locales/pages/zh.json';
import dePages from './locales/pages/de.json';
import frPages from './locales/pages/fr.json';
import itPages from './locales/pages/it.json';
import ruPages from './locales/pages/ru.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en, pages: enPages },
      ar: { translation: ar, pages: arPages },
      zh: { translation: zh, pages: zhPages },
      de: { translation: de, pages: dePages },
      fr: { translation: fr, pages: frPages },
      it: { translation: it, pages: itPages },
      ru: { translation: ru, pages: ruPages },
    },
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
