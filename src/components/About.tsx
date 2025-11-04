const About = () => {
  return (
    <section id="about" className="py-20 md:py-32 bg-background" aria-labelledby="about-heading">
      <div className="container mx-auto px-4">
        <article className="max-w-4xl mx-auto">
          <header className="text-center mb-12">
            <h2 id="about-heading" className="text-3xl md:text-5xl font-heading font-semibold text-foreground mb-6 uppercase tracking-wide">
              About Aziza Home
            </h2>
            <div className="w-20 h-1 bg-primary mx-auto mb-8" />
          </header>

          <div className="space-y-6 text-lg text-foreground/80 leading-relaxed">
            <p>
              At Aziza Home, we believe that a well-designed space is essential to living well. Our philosophy merges the timeless minimalism of Japanese design with the warm functionality of Scandinavian aesthetics—creating interiors that are both beautiful and livable. We specialize in turnkey furnishing packages for Dubai apartments, serving investors, expats, and holiday home owners across premium areas including Dubai Marina, Downtown Dubai, Business Bay, and Dubai Harbour.
            </p>
            <p>
              With years of experience in interior design and furniture production, we create harmonious spaces that reflect your personal style while delivering move-in ready solutions. Whether you're an investor seeking to increase rental value, a relocating professional needing expat home setup, or a property owner looking for holiday home furnishing in Dubai, our complete apartment setup service handles everything remotely—from furniture selection to delivery and installation.
            </p>
            <p>
              From concept to completion, we offer comprehensive A-Z furnishing packages featuring luxury furniture packages, custom designer pieces, and durable furniture perfect for rental properties. Our same-day furniture delivery Dubai service and quick home furnishing solutions ensure your space is rent-ready when you need it. Whether it's a complete 2-bedroom furnishing package in Downtown Dubai or short-term rental styling for Dubai Marina properties, we deliver higher ROI through curated home furnishing that maximizes occupancy and rental value.
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
              <div className="text-4xl font-heading font-semibold text-primary mb-2">★★★★★</div>
              <div className="text-muted-foreground">Award Winning Design</div>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
};

export default About;
