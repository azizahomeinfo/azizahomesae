import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";

interface MultilingualSEOProps {
  title: string;
  description: string;
  path: string;
  keywords?: string;
  image?: string;
}

const languages = [
  { code: "en", name: "English" },
  { code: "ar", name: "العربية" },
  { code: "zh", name: "中文" },
  { code: "de", name: "Deutsch" },
  { code: "fr", name: "Français" },
  { code: "it", name: "Italiano" },
  { code: "ru", name: "Русский" },
];

export const MultilingualSEO = ({ 
  title, 
  description, 
  path, 
  keywords,
  image = "https://lemuscsvkmpqggfkpfkp.supabase.co/storage/v1/object/public/images/hero-image-new.jpg"
}: MultilingualSEOProps) => {
  const { i18n } = useTranslation();
  const currentLang = i18n.language || 'en';
  const baseUrl = "https://azizahomes.com";
  const fullUrl = `${baseUrl}${path}`;

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <html lang={currentLang} />
      <title>{title}</title>
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}
      
      {/* Canonical URL */}
      <link rel="canonical" href={fullUrl} />
      
      {/* Hreflang Tags for Language Alternatives */}
      {languages.map(lang => (
        <link 
          key={lang.code}
          rel="alternate" 
          hrefLang={lang.code} 
          href={`${baseUrl}${path}?lang=${lang.code}`} 
        />
      ))}
      <link rel="alternate" hrefLang="x-default" href={fullUrl} />
      
      {/* Open Graph Tags with Language */}
      <meta property="og:locale" content={currentLang === 'en' ? 'en_US' : currentLang === 'ar' ? 'ar_AE' : `${currentLang}_${currentLang.toUpperCase()}`} />
      {languages.filter(l => l.code !== currentLang).map(lang => (
        <meta 
          key={`og-${lang.code}`}
          property="og:locale:alternate" 
          content={lang.code === 'en' ? 'en_US' : lang.code === 'ar' ? 'ar_AE' : `${lang.code}_${lang.code.toUpperCase()}`} 
        />
      ))}
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
      
      {/* Language-specific meta tags */}
      <meta httpEquiv="content-language" content={currentLang} />
    </Helmet>
  );
};
