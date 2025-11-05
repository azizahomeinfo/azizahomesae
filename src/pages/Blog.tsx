import { Helmet } from "react-helmet";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, Clock, Calendar } from "lucide-react";
import { Link } from "react-router-dom";
import blogTopAgencies from "@/assets/blog-top-agencies.jpg";
import blogFurnishHome from "@/assets/blog-furnish-home.jpg";

const Blog = () => {
  const articles = [
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
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Blog - Aziza Home | Interior Design & Furnishing Insights Dubai</title>
        <meta 
          name="description" 
          content="Expert insights on interior design agencies in Dubai, home furnishing tips, and luxury furniture packages for your Dubai property. Read our latest articles." 
        />
        <meta 
          name="keywords" 
          content="interior design blog Dubai, home furnishing tips, Dubai design agencies, luxury furniture Dubai, apartment furnishing guide" 
        />
        <link rel="canonical" href="https://azizahomes.com/blog" />
      </Helmet>

      <Navigation />

      <main>
        {/* Hero Section */}
        <section className="relative bg-gradient-to-br from-primary via-primary to-primary/90 text-primary-foreground py-24">
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
                        alt={article.title}
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
