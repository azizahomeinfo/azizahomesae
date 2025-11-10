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
        {JSON.stringify(localBusinessSchema)}
      </script>
      <script type="application/ld+json">
        {JSON.stringify(breadcrumbSchema)}
      </script>
      <script type="application/ld+json">
        {JSON.stringify(serviceSchema)}
      </script>
      <script type="application/ld+json">
        {JSON.stringify(faqSchema)}
      </script>
    </Helmet>
  );
};

export default StructuredData;
