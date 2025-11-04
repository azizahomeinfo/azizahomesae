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
    "areaServed": [
      {
        "@type": "City",
        "name": "Dubai",
        "address": {
          "@type": "PostalAddress",
          "addressCountry": "AE"
        }
      },
      {
        "@type": "Country",
        "name": "Portugal"
      },
      {
        "@type": "Country",
        "name": "United Arab Emirates"
      }
    ],
    "serviceType": [
      "Interior Design Dubai",
      "Turnkey Furnishing Package Dubai",
      "Furniture Package Dubai",
      "Investor Apartment Furnishing",
      "Expat Relocation Services Dubai",
      "Holiday Home Furnishing Dubai",
      "Home Staging Dubai",
      "Dubai Relocation Furniture",
      "Rent-Ready Apartment Furnishing"
    ],
    "knowsAbout": [
      "Japandi furniture Dubai",
      "minimalist interior Dubai",
      "luxury furniture packages Dubai",
      "investor furniture pack Dubai",
      "expat home setup Dubai",
      "holiday home interior design Dubai",
      "Dubai Marina furnishing",
      "Downtown Dubai furniture packages"
    ],
    "sameAs": [
      "https://www.instagram.com/azizahome",
      "https://www.facebook.com/azizahome"
    ]
  };

  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": "Dubai Turnkey Furniture Package",
    "provider": {
      "@type": "InteriorDesignService",
      "name": "Aziza Home"
    },
    "areaServed": [
      {
        "@type": "City",
        "name": "Dubai"
      },
      {
        "@type": "City",
        "name": "Dubai Marina"
      },
      {
        "@type": "City",
        "name": "Downtown Dubai"
      },
      {
        "@type": "City",
        "name": "Business Bay"
      },
      {
        "@type": "City",
        "name": "Dubai Harbour"
      },
      {
        "@type": "City",
        "name": "JLT Dubai"
      }
    ],
    "serviceType": "Turnkey Furnishing Package",
    "description": "Complete A-Z furnishing packages for Dubai apartments - investor properties, holiday homes, expat relocations. Move-in ready furniture solutions for Dubai Marina, Downtown, Business Bay, and premium areas."
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "Do you provide turnkey furnishing packages in Dubai?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes, we offer complete turnkey furnishing packages for Dubai apartments in Dubai Marina, Downtown Dubai, Business Bay, Dubai Harbour, and JLT. Our packages are rent-ready and move-in ready for investors and expats."
        }
      },
      {
        "@type": "Question",
        "name": "What areas in Dubai do you service?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "We provide furniture packages and interior design services across premium Dubai areas including Dubai Marina, Downtown Dubai, Business Bay, Dubai Harbour, JLT, and Dubai Creek Harbour for both holiday homes and investment properties."
        }
      },
      {
        "@type": "Question",
        "name": "Can you furnish my investment apartment remotely in Dubai?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes, we specialize in remote investor apartment furnishing for Dubai properties. Our turnkey service includes furniture selection, production, delivery, and complete setup - perfect for increasing rental value and achieving higher ROI."
        }
      },
      {
        "@type": "Question",
        "name": "What style of furniture do you offer for Dubai apartments?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "We specialize in Japandi-style furniture - a blend of Japanese minimalism and Scandinavian functionality. Our luxury furniture packages feature designer pieces, modern living room sets, and custom furniture perfect for Dubai's premium properties."
        }
      }
    ]
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(organizationSchema)}
      </script>
      <script type="application/ld+json">
        {JSON.stringify(serviceSchema)}
      </script>
      <script type="application/ld+json">
        {JSON.stringify(faqSchema)}
      </script>
      <link rel="canonical" href="https://azizahome.com" />
      <meta name="keywords" content="turnkey furnishing Dubai, furniture package Dubai, investor apartment furnishing Dubai, Dubai relocation furniture, expat home setup Dubai, holiday home furnishing Dubai, Japandi furniture Dubai, Dubai Marina furniture, Downtown Dubai furnishing, luxury furniture packages Dubai, move in ready furniture Dubai, apartment setup Dubai, Business Bay furnishing, rent-ready apartment Dubai" />
    </Helmet>
  );
};

export default StructuredData;
