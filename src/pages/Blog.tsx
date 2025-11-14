import { Helmet } from "react-helmet-async";
import Navigation from "@/components/Navigation";
import BreadcrumbNav from "@/components/BreadcrumbNav";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, Clock, Calendar } from "lucide-react";
import { Link } from "react-router-dom";
import blogTopAgencies from "@/assets/blog-top-agencies.jpg";
import blogFurnishHome from "@/assets/blog-furnish-home.jpg";
import blogDubaiInvestment from "@/assets/blog-dubai-investment.jpg";
import blogRentalRoi from "@/assets/blog-rental-roi-downtown.jpg";
import blogHolidayRoi from "@/assets/blog-holiday-roi-marina.jpg";
import blogJvcFamily from "@/assets/blog-jvc-family-rentals.jpg";

const Blog = () => {
  const articles = [
    {
      id: "maximize-rental-roi-downtown-dubai",
      title: "Maximize Your Annual Rental ROI in Downtown Dubai",
      excerpt: "Upgrade your interior. Increase your rental returns by 10–15% per year — without changing your location. Perfect for apartments in Grande Signature Residence, Forte Tower, Act One | Act Two Towers, Burj Crown, and Burj Royale.",
      image: blogRentalRoi,
      date: "November 14, 2025",
      readTime: "9 min read",
      category: "Investment Guide"
    },
    {
      id: "maximize-holiday-home-roi-dubai-marina",
      title: "Maximize Your Holiday Home ROI in Dubai Marina",
      excerpt: "Transform your Dubai Marina property into a high-performing holiday rental. Increase your nightly rates by 20–30% and achieve 70%+ occupancy with strategic interior design.",
      image: blogHolidayRoi,
      date: "November 14, 2025",
      readTime: "8 min read",
      category: "Investment Guide"
    },
    {
      id: "jvc-family-rental-furnishing-roi-guide",
      title: "JVC Family Rental Furnishing: Maximize Your ROI with Long-Term Tenants",
      excerpt: "Attract stable family tenants in Jumeirah Village Circle with strategic furnishing. Increase your rental income by 12–18% and reduce vacancy with family-friendly design.",
      image: blogJvcFamily,
      date: "November 14, 2025",
      readTime: "7 min read",
      category: "Investment Guide"
    },
    {
      id: "top-7-interior-design-agencies-dubai",
      title: "Top 7 Interior Design Agencies in Dubai",
      excerpt: "True to its sky-scraping heights as that of the Burj Khalifa, it has all the grandeur inside its seven-star hotel rooms that perfectly define the idealistic ambition and creative absolute excellence in interior design agencies in Dubai.",
      image: blogTopAgencies,
      date: "November 4, 2025",
      readTime: "8 min read",
      category: "Interior Design"
    },
    {
      id: "quick-efficient-ways-to-furnish-your-home",
      title: "Quick & Efficient Ways to Furnish Your Home",
      excerpt: "Furnishing a home can seem overwhelming. Whether you are moving into a new space or creating a fresher feel for your home, choosing the furniture, matching the colors, and putting together the whole look often become such long, tedious, stressful tasks.",
      image: blogFurnishHome,
      date: "November 4, 2025",
      readTime: "6 min read",
      category: "Home Furnishing"
    },
    {
      id: "where-to-invest-dubai-best-roi-property-growth",
      title: "Where to Invest in Dubai for the Best ROI and Property Growth",
      excerpt: "Dubai's real estate market continues to attract global investors thanks to its tax-free environment, world-class infrastructure, and high demand for both short-term and long-term rentals. Discover the key areas for maximum returns.",
      image: blogDubaiInvestment,
      date: "November 5, 2025",
      readTime: "7 min read",
      category: "Investment Guide"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Blog - Aziza Home | Interior Design & Furnishing Insights Dubai</title>
        <meta 
          name="description" 
          content="Expert insights on interior design agencies in Dubai, home furnishing tips, property investment strategies, and luxury furniture packages. Read our latest articles." 
        />
        <meta name="keywords" content="Dubai interior design blog, home furnishing tips, property investment Dubai, interior design agencies, expat relocation guide, holiday home furnishing" />
        <link rel="canonical" href="https://azizahomes.com/blog" />
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
        <meta name="googlebot" content="index, follow" />
        
        {/* Open Graph Meta Tags */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Blog - Interior Design & Furnishing Insights Dubai" />
        <meta property="og:description" content="Expert insights on interior design, home furnishing, and property investment in Dubai." />
        <meta property="og:url" content="https://azizahomes.com/blog" />
        <meta property="og:image" content="https://azizahomes.com/blog-top-agencies.jpg" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:site_name" content="Aziza Home" />
        
        {/* Twitter Card Meta Tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Blog - Interior Design & Furnishing Insights Dubai" />
        <meta name="twitter:description" content="Expert insights on interior design, home furnishing, and property investment in Dubai." />
        <meta name="twitter:image" content="https://azizahomes.com/blog-top-agencies.jpg" />
      </Helmet>

      <Navigation />

      <main>
        {/* Hero Section */}
        <section className="relative bg-gradient-to-br from-primary via-primary to-primary/90 text-primary-foreground pt-32 pb-24">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl">
              <h1 className="text-5xl md:text-6xl font-bold mb-6">
                Design Insights & Tips
              </h1>
              <p className="text-xl opacity-90 leading-relaxed">
                Expert advice on interior design, home furnishing, and creating beautiful spaces in Dubai
              </p>
            </div>
          </div>
        </section>

        {/* Articles Grid */}
        <section className="py-20 bg-background">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center mb-12">
              <p className="text-lg text-muted-foreground">
                Looking for expert guidance? Explore our <a href="/services" className="text-primary hover:underline font-medium">professional furnishing services</a> and <a href="/packages" className="text-primary hover:underline font-medium">ready-to-go furniture packages</a> designed for Dubai properties.
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-8 max-w-7xl mx-auto">
              {articles.map((article) => (
                <Link 
                  key={article.id} 
                  to={`/blog/${article.id}`}
                  className="group"
                >
                  <Card className="h-full overflow-hidden border-2 hover:border-primary transition-all duration-300 hover:shadow-xl">
                    <div className="relative overflow-hidden aspect-video">
                      <img 
                        src={article.image} 
                        alt={`${article.title} - ${article.id === 'top-7-interior-design-agencies-dubai' ? 'Top Interior Design Agencies Dubai Comparison Aziza Home Downtown Marina' : article.id === 'quick-efficient-ways-to-furnish-your-home' ? 'Quick Home Furnishing Guide Dubai Apartment Furniture Packages Downtown Marina Business Bay' : 'Dubai Property Investment ROI Guide Best Areas Downtown Marina Creek Harbour Furnishing Packages'}`}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute top-4 left-4">
                        <span className="bg-primary text-primary-foreground px-4 py-1.5 rounded-full text-sm font-medium">
                          {article.category}
                        </span>
                      </div>
                    </div>
                    
                    <CardContent className="p-8">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4" />
                          <span>{article.date}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-4 h-4" />
                          <span>{article.readTime}</span>
                        </div>
                      </div>

                      <h2 className="text-2xl font-bold mb-4 group-hover:text-primary transition-colors">
                        {article.title}
                      </h2>
                      
                      <p className="text-muted-foreground mb-6 leading-relaxed line-clamp-3">
                        {article.excerpt}
                      </p>

                      <div className="flex items-center gap-2 text-primary font-medium group-hover:gap-3 transition-all">
                        <span>Read Article</span>
                        <ArrowRight className="w-5 h-5" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Blog;
