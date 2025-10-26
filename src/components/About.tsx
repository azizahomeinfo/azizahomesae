const About = () => {
  return (
    <section id="about" className="py-20 md:py-32 bg-background">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl font-heading font-semibold text-foreground mb-6">
              About Aziza Home
            </h2>
            <div className="w-20 h-1 bg-primary mx-auto mb-8" />
          </div>

          <div className="space-y-6 text-lg text-foreground/80 leading-relaxed">
            <p>
              At Aziza Home, we believe that a well-designed space is essential to living well. Our philosophy merges the timeless minimalism of Japanese design with the warm functionality of Scandinavian aesthetics—creating interiors that are both beautiful and livable.
            </p>
            <p>
              With years of experience in interior design, we specialize in creating harmonious spaces that reflect your personal style while maintaining the clean lines and natural materials that define the Japandi aesthetic.
            </p>
            <p>
              From concept to completion, we offer comprehensive A-Z furnishing packages that take the stress out of designing your space. Whether you're furnishing a single room or an entire home, we're here to guide you through every step of the journey.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
            <div className="text-center">
              <div className="text-4xl font-heading font-semibold text-primary mb-2">500+</div>
              <div className="text-muted-foreground">Portfolio Completed</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-heading font-semibold text-primary mb-2">100%</div>
              <div className="text-muted-foreground">Client Satisfaction</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-heading font-semibold text-primary mb-2">10+</div>
              <div className="text-muted-foreground">Years Experience</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;
