import packageImage from "@/assets/package-complete.jpg";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

const packages = [
  {
    name: "Essential",
    description: "Perfect for starting your minimalist journey",
    features: [
      "Living room essentials",
      "Bedroom furniture set",
      "Quality materials",
      "Basic styling consultation",
    ],
  },
  {
    name: "Complete",
    description: "Transform your entire home",
    features: [
      "Full home furnishing",
      "Living, dining & bedroom sets",
      "Premium materials",
      "Comprehensive styling consultation",
      "3D visualization",
    ],
    featured: true,
  },
  {
    name: "Luxury",
    description: "Ultimate bespoke experience",
    features: [
      "Custom furniture design",
      "Artisan craftsmanship",
      "Complete A-Z solution",
      "Personal designer service",
      "Installation & setup",
      "Lifetime support",
    ],
  },
];

const Packages = () => {
  const scrollToContact = () => {
    const element = document.getElementById("contact");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section id="packages" className="py-20 md:py-32 bg-secondary/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-heading font-semibold text-foreground mb-4">
            Furnishing Packages
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Complete A-Z solutions tailored to your vision. From essential pieces to bespoke luxury.
          </p>
        </div>

        {/* Hero Package Image */}
        <div className="mb-16 rounded-lg overflow-hidden max-w-5xl mx-auto">
          <img src={packageImage} alt="Complete furnishing package" className="w-full h-auto object-cover" />
        </div>

        {/* Package Options */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {packages.map((pkg, index) => (
            <div
              key={index}
              className={`bg-card p-8 rounded-lg border transition-smooth hover:shadow-lg ${
                pkg.featured ? "border-primary shadow-md scale-105" : "border-border"
              }`}
            >
              {pkg.featured && (
                <div className="inline-block bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-full mb-4">
                  MOST POPULAR
                </div>
              )}
              <h3 className="text-2xl font-heading font-semibold text-foreground mb-2">
                {pkg.name}
              </h3>
              <p className="text-muted-foreground mb-6">{pkg.description}</p>
              <ul className="space-y-3 mb-8">
                {pkg.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-foreground">{feature}</span>
                  </li>
                ))}
              </ul>
              <Button
                onClick={scrollToContact}
                className={pkg.featured ? "w-full bg-primary hover:bg-primary/90" : "w-full"}
                variant={pkg.featured ? "default" : "outline"}
              >
                Get Started
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Packages;
