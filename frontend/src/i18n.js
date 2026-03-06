import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import all locales
import it from './locales/it.json';
import en from './locales/en.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import de from './locales/de.json';
import zh from './locales/zh.json';
import pt from './locales/pt.json';
import nl from './locales/nl.json';
import ru from './locales/ru.json';
import tr from './locales/tr.json';
import ar from './locales/ar.json';
import ja from './locales/ja.json';
import ko from './locales/ko.json';
import hi from './locales/hi.json';
import sv from './locales/sv.json';
import da from './locales/da.json';
import fi from './locales/fi.json';
import el from './locales/el.json';
import ro from './locales/ro.json';
import hu from './locales/hu.json';
import pl from './locales/pl.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      it: { translation: it },
      en: { translation: en },
      es: { translation: es },
      fr: { translation: fr },
      de: { translation: de },
      zh: { translation: zh },
      pt: { translation: pt },
      nl: { translation: nl },
      ru: { translation: ru },
      tr: { translation: tr },
      ar: { translation: ar },
      ja: { translation: ja },
      ko: { translation: ko },
      hi: { translation: hi },
      sv: { translation: sv },
      da: { translation: da },
      fi: { translation: fi },
      el: { translation: el },
      ro: { translation: ro },
      hu: { translation: hu },
      pl: { translation: pl },
    },
    fallbackLng: 'it',
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
  });

// Handle RTL for Arabic
i18n.on('languageChanged', (lng) => {
  document.documentElement.dir = lng === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.lang = lng;
});

export default i18n;