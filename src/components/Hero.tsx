import heroImage from "@/assets/hero-image.jpg";
import { Button } from "@/components/ui/button";

const Hero = () => {
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <>
      {/* Showcase Video Section */}
      <section className="relative w-full h-[60vh] md:h-[70vh] overflow-hidden">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover"
        >
          <source src="https://www.w3schools.com/html/mov_bbb.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>
        <div className="absolute inset-0 bg-gradient-to-b from-background/20 via-background/40 to-background/60" />
        <div className="absolute inset-0 flex items-center justify-center">
          <h2 className="text-3xl md:text-5xl lg:text-6xl font-heading font-semibold text-foreground text-center px-4">
            Bringing Your Vision to Life
          </h2>
        </div>
      </section>

      <section id="hero" className="relative h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <img src={heroImage} alt="Minimalist Japandi interior design" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-background/50 to-background/80" />
        </div>

        <div className="relative z-10 container mx-auto px-4 text-center">
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-heading font-semibold text-foreground mb-6 animate-in fade-in slide-in-from-bottom-4 duration-1000">
          Timeless Elegance,<br />Minimalist Beauty
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-200">
          Transform your space with our curated Japandi-style interior design and complete furnishing solutions
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-300">
          <Button onClick={() => scrollToSection("portfolio")} size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground">
            View Our Work
          </Button>
          <Button onClick={() => scrollToSection("packages")} size="lg" variant="outline" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground">
            Explore Packages
          </Button>
        </div>
      </div>
    </section>
    </>
  );
};

export default Hero;
