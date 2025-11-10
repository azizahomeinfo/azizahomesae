import heroImage from "@/assets/hero-image-new.jpg";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Play } from "lucide-react";

const Hero = () => {
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const youtubeVideoId = "BnkV-TlYDJQ";

  const scrollToSection = (id: string) => {
    if (typeof window === 'undefined') return;
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handlePlayClick = () => {
    setIsVideoPlaying(true);
  };

  return (
    <>
      <header id="hero" className="relative h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <img 
            src={heroImage} 
            alt="Elegant Japandi interior design featuring minimalist furniture, natural materials, and serene aesthetic by Aziza Home" 
            className="w-full h-full object-cover object-center scale-105" 
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/20 via-background/50 to-background/80" />
        </div>

        <div className="relative z-10 container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-heading font-semibold text-foreground mb-6 animate-in fade-in slide-in-from-bottom-4 duration-1000 uppercase tracking-wide">
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
      </header>

      {/* YouTube Video Section */}
      <section className="relative w-full h-[120vh] overflow-hidden bg-background" aria-label="Portfolio showcase video">
        {!isVideoPlaying ? (
          <div 
            onClick={handlePlayClick}
            className="relative w-full h-full cursor-pointer group"
          >
            <img 
              src={heroImage} 
              alt="Play Aziza Home portfolio showcase video"
              className="w-full h-full object-cover transition-transform group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-24 h-24 rounded-full bg-primary/90 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Play className="w-12 h-12 text-primary-foreground ml-1" fill="currentColor" />
              </div>
            </div>
            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-white text-sm animate-pulse">
              Click to play video
            </div>
          </div>
        ) : (
          <iframe
            className="w-full h-full"
            src={`https://www.youtube.com/embed/${youtubeVideoId}?autoplay=1&rel=0`}
            title="Aziza Home Portfolio Showcase"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        )}
      </section>
    </>
  );
};

export default Hero;
