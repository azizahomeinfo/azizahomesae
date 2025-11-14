import { useState } from "react";
import { Helmet } from "react-helmet-async";
import Navigation from "@/components/Navigation";
import Hero from "@/components/Hero";
import Projects from "@/components/Projects";
import Packages from "@/components/Packages";
import About from "@/components/About";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";
import ClientInfoDialog from "@/components/ClientInfoDialog";
import StructuredData from "@/components/StructuredData";

const Index = () => {
  const [packageClicked, setPackageClicked] = useState(false);

  return (
    <div className="min-h-screen">
      <Helmet>
        <title>Apartment Furnishing Dubai Downtown Marina Creek Harbour | Aziza Home</title>
        <meta name="description" content="Expert apartment furnishing in Dubai Downtown, Marina, and Creek Harbour. Transform your property with Aziza Home's premium interior design services. Increase rental income by 20-25%." />
        <meta name="keywords" content="Dubai interior design, home furnishing Dubai, holiday home packages, expat relocation Dubai, property investment furnishing, luxury interior design UAE" />
        <link rel="canonical" href="https://azizahomes.com/" />
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
        <meta name="googlebot" content="index, follow" />
        
        {/* Open Graph Meta Tags */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Aziza Home - Premium Interior Design & Furnishing in Dubai" />
        <meta property="og:description" content="Transform your Dubai property with expert interior design and furnishing services. Increase rental income by 20-25%." />
        <meta property="og:url" content="https://azizahomes.com/" />
        <meta property="og:image" content="https://azizahomes.com/hero-image-new.jpg" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:site_name" content="Aziza Home" />
        <meta property="og:locale" content="en_AE" />
        
        {/* Twitter Card Meta Tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Aziza Home - Premium Interior Design & Furnishing in Dubai" />
        <meta name="twitter:description" content="Transform your Dubai property with expert interior design and furnishing services. Increase rental income by 20-25%." />
        <meta name="twitter:image" content="https://azizahomes.com/hero-image-new.jpg" />
      </Helmet>
      <StructuredData />
      <ClientInfoDialog triggerOnPackageClick={packageClicked} />
      <Navigation />
      <main>
        <Hero />
        <Projects />
        <Packages onPackageClick={() => setPackageClicked(true)} />
        <About />
        <Contact />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
