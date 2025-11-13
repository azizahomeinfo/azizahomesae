import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";

interface BreadcrumbItem {
  name: string;
  url: string;
}

interface StructuredDataProps {
  breadcrumbs?: BreadcrumbItem[];
  pageTitle?: string;
  pageDescription?: string;
}

const StructuredData = ({ breadcrumbs, pageTitle, pageDescription }: StructuredDataProps = {}) => {
  const location = useLocation();
  const baseUrl = "https://azizahomes.com";
  // Organization Schema
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Aziza Home",
    "legalName": "Aziza Home Interior Design Services",
    "url": baseUrl,
    "logo": `${baseUrl}/aziza-logo.png`,
    "description": "Premium Japandi-style interior design and complete A-Z furnishing packages in Dubai. Transform your space with minimalist, timeless design.",
    "foundingDate": "2020",
    "email": "info@azizahome.com",
    "telephone": "+351-910-163-678",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "Lisbon",
      "addressCountry": "PT"
    },
    "contactPoint": {
      "@type": "ContactPoint",
      "telephone": "+351-910-163-678",
      "contactType": "Customer Service",
      "email": "info@azizahome.com",
      "areaServed": ["AE", "PT"],
      "availableLanguage": ["English", "Portuguese", "Arabic"]
    },
    "sameAs": [
      "https://www.instagram.com/azizahomeaes",
      "https://www.facebook.com/azizahome"
    ]
  };

  // LocalBusiness Schema for SEO
  const localBusinessSchema = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${baseUrl}#localbusiness`,
    "name": "Aziza Home",
    "image": `${baseUrl}/hero-image-new.jpg`,
    "description": pageDescription || "Premium interior design and turnkey furnishing packages in Dubai. Specializing in holiday homes, expat relocations, and investor properties.",
    "url": baseUrl,
    "telephone": "+351-910-163-678",
    "email": "info@azizahome.com",
    "priceRange": "€€€",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "Dubai Marina, Downtown Dubai, Business Bay",
      "addressLocality": "Dubai",
      "addressCountry": "AE"
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": "25.0772",
      "longitude": "55.1335"
    },
    "openingHoursSpecification": {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
      "opens": "09:00",
      "closes": "18:00"
    },
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
      "Home Staging Dubai"
    ],
    "sameAs": [
      "https://www.instagram.com/azizahomeaes",
      "https://www.facebook.com/azizahome"
    ]
  };

  // Dynamic Breadcrumb Schema
  const generateBreadcrumbSchema = () => {
    if (!breadcrumbs || breadcrumbs.length === 0) {
      // Generate default breadcrumbs based on current path
      const pathSegments = location.pathname.split('/').filter(Boolean);
      const defaultBreadcrumbs: BreadcrumbItem[] = [
        { name: "Home", url: baseUrl }
      ];

      let currentPath = '';
      pathSegments.forEach((segment) => {
        currentPath += `/${segment}`;
        const name = segment
          .split('-')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        defaultBreadcrumbs.push({
          name: pageTitle || name,
          url: `${baseUrl}${currentPath}`
        });
      });

      return {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": defaultBreadcrumbs.map((crumb, index) => ({
          "@type": "ListItem",
          "position": index + 1,
          "name": crumb.name,
          "item": crumb.url
        }))
      };
    }

    return {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": breadcrumbs.map((crumb, index) => ({
        "@type": "ListItem",
        "position": index + 1,
        "name": crumb.name,
        "item": crumb.url
      }))
    };
  };

  const breadcrumbSchema = generateBreadcrumbSchema();

  // Comprehensive Service Schemas
  const servicesSchemas = [
    {
      "@context": "https://schema.org",
      "@type": "Service",
      "@id": `${baseUrl}#service-turnkey`,
      "name": "Turnkey Furnishing Package Dubai",
      "provider": {
        "@type": "Organization",
        "@id": `${baseUrl}#organization`,
        "name": "Aziza Home"
      },
      "serviceType": "Interior Design and Furnishing",
      "description": "Complete A-Z turnkey furnishing packages for Dubai apartments. Move-in ready furniture solutions including design consultation, furniture selection, production, delivery, and installation. Perfect for investor properties, holiday homes, and expat relocations.",
      "areaServed": [
        {
          "@type": "City",
          "name": "Dubai Marina",
          "address": { "@type": "PostalAddress", "addressCountry": "AE" }
        },
        {
          "@type": "City",
          "name": "Downtown Dubai",
          "address": { "@type": "PostalAddress", "addressCountry": "AE" }
        },
        {
          "@type": "City",
          "name": "Business Bay",
          "address": { "@type": "PostalAddress", "addressCountry": "AE" }
        },
        {
          "@type": "City",
          "name": "Dubai Harbour",
          "address": { "@type": "PostalAddress", "addressCountry": "AE" }
        },
        {
          "@type": "City",
          "name": "JLT Dubai",
          "address": { "@type": "PostalAddress", "addressCountry": "AE" }
        }
      ],
      "offers": {
        "@type": "Offer",
        "availability": "https://schema.org/InStock",
        "priceRange": "€€€",
        "priceCurrency": "EUR"
      },
      "category": "Turnkey Furnishing Package",
      "hasOfferCatalog": {
        "@type": "OfferCatalog",
        "name": "Furnishing Packages",
        "itemListElement": [
          {
            "@type": "Offer",
            "itemOffered": {
              "@type": "Service",
              "name": "Living Room Package",
              "description": "Complete living room furnishing with Japandi-style furniture"
            }
          },
          {
            "@type": "Offer",
            "itemOffered": {
              "@type": "Service",
              "name": "Bedroom Package",
              "description": "Full bedroom setup with modern minimalist furniture"
            }
          },
          {
            "@type": "Offer",
            "itemOffered": {
              "@type": "Service",
              "name": "Complete Home Package",
              "description": "Entire apartment furnishing solution from A to Z"
            }
          }
        ]
      }
    },
    {
      "@context": "https://schema.org",
      "@type": "Service",
      "@id": `${baseUrl}#service-holiday-home`,
      "name": "Holiday Home Furnishing Dubai",
      "provider": {
        "@type": "Organization",
        "@id": `${baseUrl}#organization`,
        "name": "Aziza Home"
      },
      "serviceType": "Holiday Home Interior Design",
      "description": "Transform your Dubai holiday home into a premium vacation rental. Complete furnishing packages designed to maximize guest appeal and rental income with stylish Japandi-inspired interiors.",
      "areaServed": {
        "@type": "City",
        "name": "Dubai",
        "address": { "@type": "PostalAddress", "addressCountry": "AE" }
      },
      "offers": {
        "@type": "Offer",
        "availability": "https://schema.org/InStock",
        "priceRange": "€€€"
      }
    },
    {
      "@context": "https://schema.org",
      "@type": "Service",
      "@id": `${baseUrl}#service-expat`,
      "name": "Expat Relocation Services Dubai",
      "provider": {
        "@type": "Organization",
        "@id": `${baseUrl}#organization`,
        "name": "Aziza Home"
      },
      "serviceType": "Relocation and Furnishing Service",
      "description": "Hassle-free apartment furnishing for expats relocating to Dubai. We handle everything from furniture selection to installation, making your move stress-free with rent-ready, move-in ready solutions.",
      "areaServed": {
        "@type": "City",
        "name": "Dubai",
        "address": { "@type": "PostalAddress", "addressCountry": "AE" }
      },
      "offers": {
        "@type": "Offer",
        "availability": "https://schema.org/InStock",
        "priceRange": "€€€"
      }
    },
    {
      "@context": "https://schema.org",
      "@type": "Service",
      "@id": `${baseUrl}#service-investor`,
      "name": "Investor Property Furnishing Dubai",
      "provider": {
        "@type": "Organization",
        "@id": `${baseUrl}#organization`,
        "name": "Aziza Home"
      },
      "serviceType": "Property Investment Furnishing",
      "description": "Remote property furnishing services for Dubai investors. Increase rental value and ROI with professionally furnished apartments. Complete turnkey solutions for investment properties in premium Dubai locations.",
      "areaServed": {
        "@type": "City",
        "name": "Dubai",
        "address": { "@type": "PostalAddress", "addressCountry": "AE" }
      },
      "offers": {
        "@type": "Offer",
        "availability": "https://schema.org/InStock",
        "priceRange": "€€€"
      },
      "additionalType": "Investment Property Service"
    },
    {
      "@context": "https://schema.org",
      "@type": "Service",
      "@id": `${baseUrl}#service-interior-design`,
      "name": "Interior Design Services Dubai",
      "provider": {
        "@type": "Organization",
        "@id": `${baseUrl}#organization`,
        "name": "Aziza Home"
      },
      "serviceType": "Interior Design",
      "description": "Bespoke interior design services featuring Japandi style - a harmonious blend of Japanese minimalism and Scandinavian functionality. Custom design solutions for residential properties in Dubai.",
      "areaServed": {
        "@type": "City",
        "name": "Dubai",
        "address": { "@type": "PostalAddress", "addressCountry": "AE" }
      },
      "offers": {
        "@type": "Offer",
        "availability": "https://schema.org/InStock",
        "priceRange": "€€€"
      }
    }
  ];

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
        {JSON.stringify(localBusinessSchema)}
      </script>
      <script type="application/ld+json">
        {JSON.stringify(breadcrumbSchema)}
      </script>
      {servicesSchemas.map((schema, index) => (
        <script key={`service-${index}`} type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      ))}
      <script type="application/ld+json">
        {JSON.stringify(faqSchema)}
      </script>
    </Helmet>
  );
};

export default StructuredData;
