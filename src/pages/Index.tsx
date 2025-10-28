import Navigation from "@/components/Navigation";
import Hero from "@/components/Hero";
import Projects from "@/components/Projects";
import Packages from "@/components/Packages";
import About from "@/components/About";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";
import ClientInfoDialog from "@/components/ClientInfoDialog";

const Index = () => {
  return (
    <div className="min-h-screen">
      <ClientInfoDialog />
      <Navigation />
      <Hero />
      <Projects />
      <Packages />
      <About />
      <Contact />
      <Footer />
    </div>
  );
};

export default Index;
