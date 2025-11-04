import { useState } from "react";
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
