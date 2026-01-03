// Intl.PluralRules polyfill check
// Modern Expo SDK (54+) with Hermes should support Intl.PluralRules natively
// If not available, i18next will use compatibilityJSON v3 mode (no polyfill needed)
// This avoids import warnings for non-exported subpaths

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import hu from './locales/hu.json';
import en from './locales/en.json';

const LANGUAGE_KEY = 'app_language';

// Initialize with default language (will be updated after AsyncStorage read)
i18n
  .use(initReactI18next)
  .init({
    resources: {
      hu: { translation: hu },
      en: { translation: en },
    },
    fallbackLng: 'hu',
    lng: 'hu', // Default to Hungarian
    interpolation: {
      escapeValue: false,
    },
    compatibilityJSON: 'v3', // Use v3 format for better compatibility
  });

// Load saved language preference
AsyncStorage.getItem(LANGUAGE_KEY)
  .then((lang) => {
    if (lang && (lang === 'hu' || lang === 'en')) {
      i18n.changeLanguage(lang);
    }
  })
  .catch((error) => {
    console.error('Failed to load language preference:', error);
  });

// Helper to change language and persist
export const changeLanguage = async (lng: 'hu' | 'en') => {
  try {
    await AsyncStorage.setItem(LANGUAGE_KEY, lng);
    await i18n.changeLanguage(lng);
  } catch (error) {
    console.error('Failed to save language preference:', error);
  }
};

export default i18n;

