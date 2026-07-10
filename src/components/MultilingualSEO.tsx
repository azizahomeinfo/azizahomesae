import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";

interface MultilingualSEOProps {
  title: string;
  description: string;
  path: string;
  keywords?: string;
  image?: string;
}

// Valid BCP-47 / Open Graph locale codes per supported language.
// (Previously generated invalid values like "zh_ZH", "de_DE", "ru_RU".)
const OG_LOCALES: Record<string, string> = {
  en: "en_US",
  ar: "ar_AE",
  zh: "zh_CN",
  de: "de_DE",
  fr: "fr_FR",
  it: "it_IT",
  ru: "ru_RU",
};

export const MultilingualSEO = ({ 
  title, 
  description, 
  path, 
  keywords,
  image = "https://lemuscsvkmpqggfkpfkp.supabase.co/storage/v1/object/public/images/hero-image-new.jpg"
}: MultilingualSEOProps) => {
  const { i18n } = useTranslation();
  const currentLang = i18n.language || 'en';
  const ogLocale = OG_LOCALES[currentLang] || OG_LOCALES.en;
  const baseUrl = "https://www.azizahomes.com";
  const fullUrl = `${baseUrl}${path}`;

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <html lang={currentLang} />
      <title>{title}</title>
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}
      
      {/* Canonical URL (self-referencing) */}
      <link rel="canonical" href={fullUrl} />

      {/* NOTE: hreflang alternates are intentionally omitted. The language
          switcher translates content client-side at the SAME URL (?lang=xx
          does not produce distinct, separately-crawlable pages), so declaring
          per-language hreflang alternates would violate Google's requirement
          that each alternate be a unique, self-referencing URL and would
          surface as hreflang errors in Search Console. Re-introduce these only
          once real localized routes (e.g. /ar/..., /de/...) exist. */}

      {/* Open Graph locale (single valid value for the current language) */}
      <meta property="og:locale" content={ogLocale} />
      <meta property="og:type" content="website" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:image" content={image} />
      <meta property="og:site_name" content="Aziza Home" />
      
      {/* Twitter Card Tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
      
      {/* Indexing directives */}
      <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
      <meta name="googlebot" content="index, follow" />
      
      {/* Language-specific meta tags */}
      <meta httpEquiv="content-language" content={currentLang} />
    </Helmet>
  );
};
