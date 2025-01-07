const i18n = require('i18next');
const Backend = require('i18next-fs-backend');
const middleware = require('i18next-http-middleware');

i18n
  .use(Backend) // Use the file system backend to load translations
  .use(middleware.LanguageDetector) // Detect language from request
  .init({
    fallbackLng: 'en', // Default language
    preload: ['en', 'es', 'de'], // Preload supported languages
    backend: {
      loadPath: './locales/{{lng}}.json', // Path to the translation files
    },
    detection: {
      order: ['querystring', 'header'], // Detect language via querystring or header
      caches: false, // Do not cache language preference
    },
  });

module.exports = i18n;