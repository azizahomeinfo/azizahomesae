import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import founderImage from "@/assets/founder-veronica.jpg";
import teamImage from "@/assets/team-photo.jpg";

const AboutUs = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="pt-32 pb-20">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-20 animate-fade-in">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-light mb-6 text-foreground">
              About Aziza Home
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
              Creating harmonious spaces that blend Japanese minimalism with Scandinavian warmth
            </p>
          </div>

          {/* Founder Section */}
          <div className="grid md:grid-cols-2 gap-12 items-center mb-32 animate-fade-in">
            <div className="order-2 md:order-1">
              <h2 className="text-3xl md:text-4xl font-light mb-6 text-foreground">
                Our Founder
              </h2>
              <h3 className="text-2xl font-medium mb-4 text-primary">
                Veronica Xu
              </h3>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  Founded in 2022, Aziza Home was born from a passion for creating spaces that embody tranquility, 
                  functionality, and timeless beauty. Veronica Xu, our founder and lead designer, brings a unique 
                  vision that seamlessly merges the Japanese concept of wabi-sabi—finding beauty in imperfection—with 
                  the clean, functional elegance of Scandinavian design, known as Japandi.
                </p>
                <p>
                  With a commitment to excellence and an eye for detail, Veronica has built Aziza Home on the 
                  principles of providing the best service to clients while delivering premium quality at affordable 
                  prices. Every project is approached with the understanding that your home is more than just a 
                  space—it's a reflection of who you are.
                </p>
                <p>
                  Under Veronica's leadership, Aziza Home has become synonymous with sophisticated simplicity, 
                  helping clients in Dubai create havens that are both aesthetically stunning and deeply personal.
                </p>
              </div>
            </div>
            <div className="order-1 md:order-2">
              <div className="relative overflow-hidden rounded-lg shadow-2xl">
                <img 
                  src={founderImage} 
                  alt="Veronica Xu, Founder of Aziza Home" 
                  className="w-full h-[500px] object-cover sepia-[0.15] contrast-[1.05] brightness-[1.02]"
                />
              </div>
            </div>
          </div>

          {/* Team Section */}
          <div className="grid md:grid-cols-2 gap-12 items-center animate-fade-in">
            <div>
              <div className="relative overflow-hidden rounded-lg shadow-2xl">
                <img 
                  src={teamImage} 
                  alt="Aziza Home Design Team" 
                  className="w-full h-[500px] object-cover sepia-[0.15] contrast-[1.05] brightness-[1.02]"
                />
              </div>
            </div>
            <div>
              <h2 className="text-3xl md:text-4xl font-light mb-6 text-foreground">
                Our Team
              </h2>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  At Aziza Home, we believe that exceptional design is a collaborative effort. Our talented team 
                  of designers, project managers, and craftspeople work together to bring your vision to life with 
                  precision and care.
                </p>
                <p>
                  Each team member brings unique expertise and a shared passion for creating spaces that inspire. 
                  From initial consultation to final installation, we maintain open communication and meticulous 
                  attention to detail, ensuring every project exceeds expectations.
                </p>
                <p>
                  Our diverse backgrounds and specialized skills allow us to tackle projects of any scale—from 
                  intimate apartment renovations to large-scale residential and commercial spaces. What unites us 
                  is our commitment to the Japandi aesthetic and our dedication to delivering premium quality 
                  without compromising accessibility.
                </p>
                <p>
                  We approach each project as a partnership, working closely with our clients to understand their 
                  lifestyle, preferences, and aspirations. This collaborative spirit, combined with our technical 
                  expertise, enables us to create homes that are not just beautifully designed, but truly livable.
                </p>
              </div>
            </div>
          </div>

          {/* Values Section */}
          <div className="mt-32 animate-fade-in">
            <h2 className="text-3xl md:text-4xl font-light mb-12 text-center text-foreground">
              Our Values
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center p-8 bg-card rounded-lg border border-border">
                <h3 className="text-xl font-medium mb-4 text-foreground">Premium Quality</h3>
                <p className="text-muted-foreground">
                  We source the finest materials and work with skilled craftspeople to ensure every detail 
                  meets our exacting standards.
                </p>
              </div>
              <div className="text-center p-8 bg-card rounded-lg border border-border">
                <h3 className="text-xl font-medium mb-4 text-foreground">Affordability</h3>
                <p className="text-muted-foreground">
                  Beautiful design should be accessible. We offer transparent pricing and packages that 
                  deliver exceptional value.
                </p>
              </div>
              <div className="text-center p-8 bg-card rounded-lg border border-border">
                <h3 className="text-xl font-medium mb-4 text-foreground">Client-Centric Service</h3>
                <p className="text-muted-foreground">
                  Your satisfaction is our priority. We listen, adapt, and go above and beyond to make 
                  your design journey seamless.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default AboutUs;
