import { Link } from "react-router-dom";
import package1 from "@/assets/package-1.jpg";
import package2 from "@/assets/package-2.jpg";
import package3 from "@/assets/package-3.jpg";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";

interface PackagesProps {
  onPackageClick?: () => void;
}

const localPackages = [
  {
    handle: "essential",
    title: "Aziza Essential Furnishing",
    price: "22,500",
    image: package1,
    description: "All furniture, decorative wall frames, rugs, lighting and table décor — everything you need for a complete, stylish living space.",
  },
  {
    handle: "premium",
    title: "Aziza Premium Furnishing",
    price: "26,500",
    image: package2,
    description: "Everything in Essential plus a focal feature wall and 1–4 wallpaper or paint applications for a designer-elevated finish.",
  },
  {
    handle: "luxury",
    title: "Aziza Luxury Furnishing",
    price: "30,500",
    image: package3,
    description: "Everything in Essential plus full feature wall design throughout the apartment for a complete luxury transformation.",
  },
];

const Packages = ({ onPackageClick }: PackagesProps) => {
  const handleWhatsAppClick = (title: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const message = encodeURIComponent(`Hi, I'm interested in ${title}`);
    window.open(`https://wa.me/971559779635?text=${message}`, '_blank');
  };

  return (
    <section id="packages" className="py-20 md:py-32 bg-secondary/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-heading font-semibold text-foreground mb-4 uppercase tracking-wide">
            Furnishing Packages
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Complete A-Z solutions tailored to your vision. From essential pieces to bespoke luxury.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {localPackages.map((pkg, index) => {
            const isFeatured = index === 1;
            const roomLabel = index === 0 ? 'Studio' : index === 1 ? '1 Bedroom' : '2 Bedroom';
            return (
              <Link
                key={pkg.handle}
                to="/packages"
                onClick={onPackageClick}
                className={`relative bg-card rounded-lg border transition-smooth hover:shadow-lg block overflow-hidden group ${
                  isFeatured ? "border-primary shadow-md" : "border-border"
                }`}
              >
                {isFeatured && (
                  <div className="absolute top-4 right-4 z-10 bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-full">
                    MOST POPULAR
                  </div>
                )}
                <div className="relative aspect-[4/3] overflow-hidden bg-secondary/20">
                  <img
                    src={pkg.image}
                    alt={`${pkg.title} - Dubai ${roomLabel} Apartment Furnishing Package Downtown Dubai Marina Business Bay`}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-smooth"
                  />
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-heading font-semibold text-foreground mb-2">
                    {pkg.title}
                  </h3>
                  <p className="text-2xl font-bold text-primary mb-3">
                    from {pkg.price} AED
                  </p>
                  <p className="text-muted-foreground text-sm mb-4 line-clamp-2">{pkg.description}</p>
                  <Button
                    onClick={(e) => handleWhatsAppClick(pkg.title, e)}
                    className="w-full"
                    variant={isFeatured ? "default" : "outline"}
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    More Info on WhatsApp
                  </Button>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Packages;
