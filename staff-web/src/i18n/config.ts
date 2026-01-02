import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Cookies from 'js-cookie';
import hu from './locales/hu.json';
import en from './locales/en.json';

// Custom language detector that reads from cookie
const cookieLanguageDetector = {
  name: 'cookieDetector',
  lookup() {
    return Cookies.get('lang') || 'hu';
  },
  cacheUserLanguage(lng: string) {
    Cookies.set('lang', lng, { expires: 365, path: '/' });
  },
};

const languageDetector = new LanguageDetector();
languageDetector.addDetector(cookieLanguageDetector);

i18n
  .use(languageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      hu: { translation: hu },
      en: { translation: en },
    },
    fallbackLng: 'hu',
    detection: {
      order: ['cookieDetector', 'navigator'],
      caches: [],
    },
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;



