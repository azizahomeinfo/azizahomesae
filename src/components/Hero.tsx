import heroImage from "@/assets/hero-image-new.jpg";
import { Button } from "@/components/ui/button";
import { useEffect, useRef } from "react";
import Hls from "hls.js";

const Hero = () => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    
    if (video) {
      // Use local video file
      video.src = "/hero-video.mp4";
    }
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleVideoClick = () => {
    const video = videoRef.current;
    if (video) {
      if (!document.fullscreenElement) {
        video.requestFullscreen().catch(err => {
          console.log(`Error attempting to enable fullscreen: ${err.message}`);
        });
      } else {
        document.exitFullscreen();
      }
    }
  };

  return (
    <>
      {/* Showcase Video Section */}
      <section className="relative w-full h-[120vh] overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          poster={heroImage}
          onClick={handleVideoClick}
          className="w-full h-full object-cover cursor-pointer transition-transform hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/5 via-background/20 to-background pointer-events-none" />
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-white/80 text-sm pointer-events-none animate-pulse">
          Click video to view fullscreen
        </div>
      </section>

      <section id="hero" className="relative h-screen flex items-center justify-center overflow-hidden -mt-32">
        <div className="absolute inset-0">
          <img src={heroImage} alt="Minimalist Japandi interior design" className="w-full h-full object-cover object-center scale-105" />
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
    </section>
    </>
  );
};

export default Hero;
