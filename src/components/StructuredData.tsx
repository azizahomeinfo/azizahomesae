import { Helmet } from "react-helmet";

const StructuredData = () => {
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "InteriorDesignService",
    "name": "Aziza Home",
    "description": "Premium Japandi-style interior design and complete A-Z furnishing packages. Transform your space with minimalist, timeless design.",
    "url": "https://azizahome.com",
    "logo": "https://azizahome.com/aziza-logo.png",
    "image": "https://azizahome.com/hero-image.jpg",
    "telephone": "+351-910-163-678",
    "email": "info@azizahome.com",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "Lisbon",
      "addressCountry": "PT"
    },
    "priceRange": "€€€",
    "areaServed": "Portugal",
    "serviceType": ["Interior Design", "Furniture Package", "Home Staging", "Expat Relocation Services"],
    "sameAs": [
      "https://www.instagram.com/azizahome",
      "https://www.facebook.com/azizahome"
    ]
  };

  const localBusinessSchema = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": "Aziza Home",
    "description": "Premium interior design studio specializing in Japandi aesthetic and complete furnishing solutions",
    "image": "https://azizahome.com/hero-image.jpg",
    "telephone": "+351-910-163-678",
    "email": "info@azizahome.com",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Lisbon",
      "addressCountry": "PT"
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": 38.7223,
      "longitude": -9.1393
    },
    "url": "https://azizahome.com",
    "priceRange": "€€€",
    "openingHoursSpecification": [
      {
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        "opens": "09:00",
        "closes": "18:00"
      }
    ]
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(organizationSchema)}
      </script>
      <script type="application/ld+json">
        {JSON.stringify(localBusinessSchema)}
      </script>
      <link rel="canonical" href="https://azizahome.com" />
    </Helmet>
  );
};

export default StructuredData;
