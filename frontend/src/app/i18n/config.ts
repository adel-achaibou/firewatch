import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import fr from "./locales/fr.json";

const savedLanguage = localStorage.getItem("firewatch-language");
// First visit: follow the browser language instead of always English
const browserLanguage = navigator.language.toLowerCase().startsWith("fr") ? "fr" : "en";
const initialLanguage = savedLanguage === "fr" || savedLanguage === "en" ? savedLanguage : browserLanguage;

void i18n.use(initReactI18next).init({
    resources: { en: { translation: en }, fr: { translation: fr } },
    lng: initialLanguage,
    fallbackLng: "en",
    interpolation: { escapeValue: false }
});

// Keep <html lang> in sync (accessibility + SEO)
document.documentElement.lang = initialLanguage;
i18n.on("languageChanged", (lng) => { document.documentElement.lang = lng; });

export default i18n;