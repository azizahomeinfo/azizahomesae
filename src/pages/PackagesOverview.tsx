import { useState } from "react";
import { Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight } from "lucide-react";
import package1 from "@/assets/package-1.jpg";
import package2 from "@/assets/package-2.jpg";
import package3 from "@/assets/package-3.jpg";

type RoomType = "studio" | "1b" | "2b" | "3b";

interface Package {
  id: string;
  name: string;
  description: string;
  image: string;
  badge?: string;
  prices: {
    studio: string;
    "1b": string;
    "2b": string;
    "3b": string;
  };
}

const packages: Package[] = [
  {
    id: "essential",
    name: "Essential Furnishing Package",
    description: "Perfect for starting your minimalist journey. This package includes living room essentials, bedroom furniture set, quality materials, and basic styling consultation to transform your space with timeless Japandi aesthetics.",
    image: package1,
    prices: {
      studio: "2,999 USD",
      "1b": "4,499 USD",
      "2b": "6,999 USD",
      "3b": "8,999 USD",
    },
  },
  {
    id: "complete",
    name: "Complete Furnishing Package",
    description: "Transform your entire home with our most popular package. Includes full home furnishing with living, dining & bedroom sets, premium materials, comprehensive styling consultation, and 3D visualization to see your dream space before it's built.",
    image: package2,
    badge: "Most Popular",
    prices: {
      studio: "5,999 USD",
      "1b": "8,499 USD",
      "2b": "11,999 USD",
      "3b": "14,999 USD",
    },
  },
  {
    id: "premium",
    name: "Premium Furnishing Package",
    description: "Experience luxury living with our premium package. Featuring designer pieces, bespoke furniture selections, comprehensive styling services, and premium materials throughout. Perfect for those who demand excellence in every detail.",
    image: package3,
    prices: {
      studio: "8,999 USD",
      "1b": "12,499 USD",
      "2b": "16,999 USD",
      "3b": "21,999 USD",
    },
  },
];

const roomTypes = [
  { value: "studio" as RoomType, label: "Studio" },
  { value: "1b" as RoomType, label: "1 Bedroom" },
  { value: "2b" as RoomType, label: "2 Bedrooms" },
  { value: "3b" as RoomType, label: "3 Bedrooms" },
];

const PackagesOverview = () => {
  const [selectedRoom, setSelectedRoom] = useState<RoomType>("studio");

  return (
    <div className="min-h-screen">
      <Navigation />
      
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Choose Your Package Style
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Select from our curated furnishing packages designed to suit every style and budget
            </p>
          </div>

          {/* Room Type Selector */}
          <div className="flex flex-wrap justify-center gap-2 md:gap-4 mb-12">
            {roomTypes.map((room) => (
              <Button
                key={room.value}
                variant={selectedRoom === room.value ? "default" : "outline"}
                onClick={() => setSelectedRoom(room.value)}
                className="min-w-[120px]"
              >
                {room.label}
              </Button>
            ))}
          </div>

          {/* Packages Grid */}
          <div className="space-y-16">
            {packages.map((pkg, index) => (
              <div
                key={pkg.id}
                className={`flex flex-col ${
                  index % 2 === 0 ? "lg:flex-row" : "lg:flex-row-reverse"
                } gap-8 items-center`}
              >
                {/* Image */}
                <div className="w-full lg:w-1/2 relative">
                  {pkg.badge && (
                    <Badge className="absolute top-4 right-4 z-10 bg-accent text-accent-foreground">
                      {pkg.badge}
                    </Badge>
                  )}
                  <div className="aspect-[4/3] rounded-lg overflow-hidden bg-muted">
                    <img
                      src={pkg.image}
                      alt={pkg.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>

                {/* Content */}
                <div className="w-full lg:w-1/2 space-y-6">
                  <div>
                    <h2 className="text-3xl font-bold mb-4">{pkg.name}</h2>
                    <p className="text-muted-foreground leading-relaxed">
                      {pkg.description}
                    </p>
                  </div>

                  {/* Price Display */}
                  <div className="bg-card border border-border rounded-lg p-6">
                    <div className="flex items-baseline justify-between mb-6">
                      <span className="text-sm text-muted-foreground">
                        {roomTypes.find((r) => r.value === selectedRoom)?.label}
                      </span>
                      <div className="text-right">
                        <p className="text-3xl font-bold">
                          from {pkg.prices[selectedRoom]}
                        </p>
                      </div>
                    </div>

                    <Link to={`/product/${pkg.id}-${selectedRoom}`}>
                      <Button className="w-full" size="lg">
                        View Details
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </div>

                  {/* All Room Prices */}
                  <div className="grid grid-cols-2 gap-3">
                    {roomTypes.map((room) => (
                      <button
                        key={room.value}
                        onClick={() => setSelectedRoom(room.value)}
                        className={`p-3 rounded-md border transition-smooth text-left ${
                          selectedRoom === room.value
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <div className="text-xs text-muted-foreground mb-1">
                          {room.label}
                        </div>
                        <div className="font-semibold">
                          from {pkg.prices[room.value]}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* CTA Section */}
          <div className="mt-16 text-center bg-accent/10 rounded-lg p-8 md:p-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              Need a Custom Solution?
            </h2>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
              Can't find exactly what you're looking for? We offer custom furnishing packages tailored to your specific needs and preferences.
            </p>
            <Link to="/#contact">
              <Button size="lg" variant="default">
                Contact Us for Custom Package
              </Button>
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PackagesOverview;
