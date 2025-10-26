import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card } from "@/components/ui/card";
import portfolio1 from "@/assets/portfolio-1.jpg";
import portfolio12 from "@/assets/portfolio-12.jpeg";
import portfolio2 from "@/assets/portfolio-2.jpeg";
import portfolio3 from "@/assets/portfolio-3.jpeg";
import portfolio4 from "@/assets/portfolio-4.jpeg";
import portfolio5 from "@/assets/portfolio-5.jpeg";
import portfolio6 from "@/assets/portfolio-6.jpeg";
import portfolio7 from "@/assets/portfolio-7.jpeg";
import portfolio8 from "@/assets/portfolio-8.jpeg";
import portfolio9 from "@/assets/portfolio-9.jpeg";

const ProjectGallery = () => {
  const portfolio = [
    {
      id: 1,
      title: "Jumeirah Park Project",
      description: "This stunning 7 bedroom villa was beautifully brought to life by our talented interior designer. Every space was thoughtfully reimagined through our bespoke furniture, custom joinery, and premium fit out services. The result is a luxurious sanctuary featuring elegant formal seating areas, a refined living room, tailored walk-in wardrobes, children's bedrooms, and a functional home office.",
      images: [
        portfolio1,
        portfolio12,
        portfolio2,
        portfolio3,
        portfolio4,
        portfolio5,
        portfolio6,
        portfolio7,
        portfolio8,
        portfolio9,
      ]
    }
  ];

  return (
    <div className="min-h-screen">
      <Navigation />
      
      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <h1 className="font-heading text-5xl md:text-6xl text-center mb-6">
            Portfolio
          </h1>
          <p className="text-center text-lg text-muted-foreground max-w-3xl mx-auto">
            Discover our carefully curated collection of interior design portfolio
          </p>
        </div>
      </section>

      {/* Portfolio */}
      <section className="py-12 px-4">
        <div className="container mx-auto max-w-6xl">
          {portfolio.map((project) => (
            <div key={project.id} className="mb-24">
              {/* Project Header */}
              <div className="grid md:grid-cols-2 gap-8 items-center mb-12">
                <div>
                  <h2 className="font-heading text-4xl md:text-5xl mb-6">
                    {project.title}
                  </h2>
                  <p className="text-lg leading-relaxed text-foreground/80">
                    {project.description}
                  </p>
                </div>
                <div>
                  <img 
                    src={project.images[0]} 
                    alt={project.title}
                    className="w-full h-[500px] object-cover rounded-lg shadow-lg"
                  />
                </div>
              </div>

              {/* Secondary Images */}
              <div className="grid md:grid-cols-2 gap-8 mb-8">
                <div className="overflow-hidden rounded-lg shadow-lg">
                  <img 
                    src={project.images[1]} 
                    alt={`${project.title} - Detail 1`}
                    className="w-full h-[400px] object-cover transition-smooth hover:scale-110"
                  />
                </div>
                <div className="space-y-6">
                  <p className="text-lg leading-relaxed text-foreground/80">
                    Our custom joinery played a key role in reimagining this stunning villa. By focusing on intricate details and the unique needs of our client, we crafted a home that seamlessly blends functionality with refined aesthetics.
                  </p>
                  <h3 className="font-heading text-2xl">The Project</h3>
                </div>
              </div>

              {/* Image Grid - 3 columns */}
              <div className="grid md:grid-cols-3 gap-6">
                {project.images.slice(2).map((image, idx) => (
                  <div key={idx} className="overflow-hidden rounded-lg shadow-lg">
                    <img 
                      src={image} 
                      alt={`${project.title} - Detail ${idx + 2}`}
                      className="w-full h-[300px] object-cover transition-smooth hover:scale-110 cursor-pointer"
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Add More Portfolio CTA */}
          <Card className="p-12 text-center bg-card/50 backdrop-blur">
            <h3 className="font-heading text-3xl mb-4">More Portfolio Coming Soon</h3>
            <p className="text-lg text-muted-foreground">
              We're constantly working on new exciting portfolio pieces. Check back soon for more inspiration.
            </p>
          </Card>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default ProjectGallery;
