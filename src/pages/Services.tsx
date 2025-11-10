import { ArrowRight } from "lucide-react";
import { Helmet } from "react-helmet-async";
import Navigation from "@/components/Navigation";
import BreadcrumbNav from "@/components/BreadcrumbNav";
import Footer from "@/components/Footer";
import StructuredData from "@/components/StructuredData";
import { Button } from "@/components/ui/button";
import serviceHolidayHome from "@/assets/service-holiday-home-new.jpg";
import serviceExpatRelocate from "@/assets/service-expat-generated.jpg";
import serviceInvestor from "@/assets/service-investor.jpg";
import serviceInteriorDesign from "@/assets/service-interior-design.jpg";

const services = [
  {
    id: 1,
    title: "Holiday Home A-Z Furnishing Packages",
    description: "Transform your holiday home into a stunning retreat with our comprehensive furnishing packages. We handle everything from furniture selection to final styling, creating spaces that attract premium guests and maximize your rental income. Our curated packages include high-quality furniture, decor, and essential amenities tailored specifically for Dubai's luxury vacation rental market.",
    image: serviceHolidayHome,
  },
  {
    id: 2,
    title: "Expat Relocate Furnishing Packages",
    description: "Moving to Dubai? We make your relocation seamless with our all-inclusive expat furnishing packages. Whether you're settling into an apartment or villa, we provide thoughtfully designed furniture solutions that blend comfort with style. From essential pieces to complete home setups, we ensure your new Dubai residence feels like home from day one.",
    image: serviceExpatRelocate,
  },
  {
    id: 3,
    title: "Investor Package",
    description: "Maximize your property investment returns with our specialized Investor Package. Our expertly furnished properties increase your long-term rental profits by 20-25% per year. We understand what tenants seek in Dubai's competitive market and deliver furnished spaces that command premium rents while reducing vacancy periods. Our strategic approach to furnishing ensures your property stands out and attracts quality, long-term tenants willing to pay more for move-in ready homes.",
    image: serviceInvestor,
    highlight: true,
  },
  {
    id: 4,
    title: "Interior Design & Fit-Out Service",
    description: "Bring your dream home to life with our bespoke interior design and fit-out services. Our experienced designers work closely with you to understand your vision, lifestyle, and preferences. From initial concept to final execution, we manage every detail of your project—space planning, material selection, custom furniture, lighting design, and complete fit-out. We create beautiful, functional spaces that reflect your personality and enhance your daily living experience in Dubai.",
    image: serviceInteriorDesign,
  },
];

const Services = () => {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Our Services - Interior Design & Furnishing Dubai | Aziza Home</title>
        <meta name="description" content="Explore Aziza Home's comprehensive furnishing services in Dubai: Holiday Home Packages, Expat Relocation, Investor Packages with 20-25% ROI increase, and Custom Interior Design." />
        <meta name="keywords" content="Dubai furnishing services, holiday home furnishing, expat relocation Dubai, investor property packages, interior design Dubai, fit-out services UAE" />
        <link rel="canonical" href="https://azizahomes.com/services" />
        <meta name="robots" content="index, follow" />
        
        {/* Open Graph Meta Tags */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Our Services - Interior Design & Furnishing Dubai" />
        <meta property="og:description" content="Comprehensive furnishing and design solutions for Dubai properties. Holiday homes, expat relocations, and investor packages with 20-25% ROI increase." />
        <meta property="og:url" content="https://azizahomes.com/services" />
        <meta property="og:image" content="https://azizahomes.com/service-holiday-home-new.jpg" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:site_name" content="Aziza Home" />
        
        {/* Twitter Card Meta Tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Our Services - Interior Design & Furnishing Dubai" />
        <meta name="twitter:description" content="Holiday homes, expat relocations, and investor packages with 20-25% ROI increase." />
        <meta name="twitter:image" content="https://azizahomes.com/service-holiday-home-new.jpg" />
      </Helmet>
      <StructuredData 
        breadcrumbs={[
          { name: "Home", url: "https://azizahomes.com" },
          { name: "Services", url: "https://azizahomes.com/services" }
        ]}
        pageTitle="Services"
        pageDescription="Explore Aziza Home's comprehensive furnishing services in Dubai: Holiday Home Packages, Expat Relocation, Investor Packages with 20-25% ROI increase, and Custom Interior Design."
      />
      <Navigation />
      
      {/* Hero Section */}
      <section className="pt-32 pb-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <BreadcrumbNav items={[{ label: "Services" }]} />
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              Our Services in Dubai
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
              Comprehensive furnishing and design solutions tailored for Dubai's luxury property market. 
              From holiday homes to dream residences, we bring your vision to life.
            </p>
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="pb-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="space-y-20">
            {services.map((service, index) => (
              <div
                key={service.id}
                className={`grid md:grid-cols-2 gap-8 items-center ${
                  index % 2 === 1 ? "md:grid-flow-dense" : ""
                }`}
              >
                {/* Image */}
                <div className={`${index % 2 === 1 ? "md:col-start-2" : ""}`}>
                  <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-muted">
                    <img 
                      src={service.image} 
                      alt={`${service.title} - Dubai ${service.id === 1 ? 'Holiday Home Furnishing Marina Creek Harbour' : service.id === 2 ? 'Expat Relocation Furniture Package Downtown Business Bay' : service.id === 3 ? 'Investor Property Furnishing Package ROI Rental Income Dubai' : 'Custom Interior Design Services Dubai'}`}
                      loading="lazy"
                      className="absolute inset-0 w-full h-full object-cover"
                      style={service.id === 1 ? { objectPosition: 'center 60%' } : undefined}
                    />
                  </div>
                </div>

                {/* Content */}
                <div className={`${index % 2 === 1 ? "md:col-start-1 md:row-start-1" : ""}`}>
                  <div className="space-y-4">
                    {service.highlight && (
                      <span className="inline-block px-4 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
                        Maximize Your Returns
                      </span>
                    )}
                    <h2 className="text-3xl md:text-4xl font-bold">{service.title}</h2>
                    <p className="text-muted-foreground text-lg leading-relaxed">
                      {service.description}
                    </p>
                    <a href="https://wa.me/971559779635" target="_blank" rel="noopener noreferrer">
                      <Button size="lg" className="mt-4">
                        Consult on WhatsApp
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Transform Your Space?
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Contact us today to discuss your project and discover how we can bring your vision to life. Explore our <a href="/packages" className="text-primary hover:underline font-medium">furniture packages</a> or read our <a href="/blog" className="text-primary hover:underline font-medium">expert insights on interior design and property investment</a>.
          </p>
          <a href="https://wa.me/971559779635" target="_blank" rel="noopener noreferrer">
            <Button size="lg" className="text-lg px-8">
              Get Started on WhatsApp
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </a>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Services;
