import project1 from "@/assets/project-1.jpg";
import project2 from "@/assets/project-2.jpg";
import project3 from "@/assets/project-3.jpg";
import project4 from "@/assets/project-4.jpg";

const projects = [
  {
    id: 1,
    title: "Serene Bedroom Retreat",
    category: "Bedroom",
    image: project1,
    description: "Natural oak furniture with minimalist bedding creates a peaceful sanctuary",
  },
  {
    id: 2,
    title: "Modern Dining Space",
    category: "Dining",
    image: project2,
    description: "Scandinavian-Japanese fusion with warm wood tones and clean lines",
  },
  {
    id: 3,
    title: "Elegant Living Room",
    category: "Living",
    image: project3,
    description: "Cream sectional and natural elements for a welcoming atmosphere",
  },
  {
    id: 4,
    title: "Productive Home Office",
    category: "Office",
    image: project4,
    description: "Functional workspace with natural materials and thoughtful design",
  },
];

const Projects = () => {
  return (
    <section id="portfolio" className="py-20 md:py-32 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-heading font-semibold text-foreground mb-4">
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
