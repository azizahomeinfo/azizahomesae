import portfolio13New from "@/assets/portfolio-1-3.jpg";
import diningNew from "@/assets/dining-new.jpg";
import portfolio18 from "@/assets/portfolio-18.jpg";
import bedroomNew from "@/assets/bedroom-new.jpg";

const projects = [
  {
    id: 1,
    title: "Sophisticated Living Space",
    category: "Living Room",
    image: portfolio13New,
    description: "Sculptural furniture and warm walnut tones perfectly balanced with elegant coastal views",
  },
  {
    id: 2,
    title: "Elegant Dining Experience",
    category: "Dining",
    image: diningNew,
    description: "Organic forms meet minimalist design with a stunning marble table and natural wood accents",
  },
  {
    id: 3,
    title: "Contemporary TV Media Wall",
    category: "TV Media Wall",
    image: portfolio18,
    description: "Modern entertainment center featuring clean paneling and integrated lighting for a refined look",
  },
  {
    id: 4,
    title: "Serene Bedroom Retreat",
    category: "Bedroom",
    image: bedroomNew,
    description: "Tranquil sanctuary featuring textured wall art, statement bubble lighting, and warm neutral tones",
  },
];

const Projects = () => {
  return (
    <section id="portfolio" className="py-20 md:py-32 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-heading font-semibold text-foreground mb-4 uppercase tracking-wide">
            Our Portfolio
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Explore our portfolio of thoughtfully designed spaces that blend Japanese and Scandinavian aesthetics
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
          {projects.map((project) => (
            <div key={project.id} className="group cursor-pointer">
              <div className="relative overflow-hidden mb-4 aspect-[4/5]">
                <img
                  src={project.image}
                  alt={project.title}
                  loading="lazy"
                  className="w-full h-full object-cover transition-smooth group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/10 transition-smooth" />
              </div>
              <div className="space-y-2">
                <span className="text-xs uppercase tracking-wider text-primary font-medium">
                  {project.category}
                </span>
                <h3 className="text-xl md:text-2xl font-heading font-medium text-foreground">
                  {project.title}
                </h3>
                <p className="text-muted-foreground">
                  {project.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Projects;
