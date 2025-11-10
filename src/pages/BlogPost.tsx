import { Helmet } from "react-helmet-async";
import { useParams, Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import BreadcrumbNav from "@/components/BreadcrumbNav";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, Clock } from "lucide-react";
import blogTopAgencies from "@/assets/blog-top-agencies.jpg";
import blogFurnishHome from "@/assets/blog-furnish-home.jpg";
import blogDubaiInvestment from "@/assets/blog-dubai-investment.jpg";

const generateBlogStructuredData = (article: any, slug: string) => ({
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "headline": article.title,
  "image": article.image,
  "datePublished": article.date,
  "dateModified": article.date,
  "author": {
    "@type": "Organization",
    "name": "Aziza Home",
    "url": "https://azizahomes.com"
  },
  "publisher": {
    "@type": "Organization",
    "name": "Aziza Home",
    "logo": {
      "@type": "ImageObject",
      "url": "https://azizahomes.com/aziza-logo.png"
    }
  },
  "description": article.content.substring(0, 160).replace(/<[^>]*>/g, ''),
  "mainEntityOfPage": {
    "@type": "WebPage",
    "@id": `https://azizahomes.com/blog/${slug}`
  }
});

const BlogPost = () => {
  const { slug } = useParams();

  // Related articles mapping
  const relatedArticles: Record<string, Array<{id: string; title: string; category: string}>> = {
    "top-7-interior-design-agencies-dubai": [
      { id: "quick-efficient-ways-to-furnish-your-home", title: "Quick & Efficient Ways to Furnish Your Home", category: "Home Furnishing" },
      { id: "where-to-invest-dubai-best-roi-property-growth", title: "Where to Invest in Dubai for the Best ROI", category: "Investment Guide" }
    ],
    "quick-efficient-ways-to-furnish-your-home": [
      { id: "top-7-interior-design-agencies-dubai", title: "Top 7 Interior Design Agencies in Dubai", category: "Interior Design" },
      { id: "where-to-invest-dubai-best-roi-property-growth", title: "Where to Invest in Dubai for the Best ROI", category: "Investment Guide" }
    ],
    "where-to-invest-dubai-best-roi-property-growth": [
      { id: "quick-efficient-ways-to-furnish-your-home", title: "Quick & Efficient Ways to Furnish Your Home", category: "Home Furnishing" },
      { id: "top-7-interior-design-agencies-dubai", title: "Top 7 Interior Design Agencies in Dubai", category: "Interior Design" }
    ]
  };

  const articles = {
    "top-7-interior-design-agencies-dubai": {
      title: "Top 7 Interior Design Agencies in Dubai",
      image: blogTopAgencies,
      date: "November 4, 2025",
      readTime: "8 min read",
      category: "Interior Design",
      content: `
        <p>True to its sky-scraping heights as that of the Burj Khalifa, it has all the grandeur inside its seven-star hotel rooms that perfectly define the idealistic ambition and creative absolute excellence in interior design agencies in Dubai, where the spaces come alive through the balancing act between artistry and precision in execution, thus making them very alluring, stimulating, and memorable environments.</p>

        <p>Whether your plans encompass constructing a very elaborate high-end residential estate, or create a state-of-the-art commercial environment for generations to come, or perhaps add even that touch of personal reflection into a hospitality venue, finding the right design partner becomes paramount because top agencies do not just beautify spaces; they are the experience architects, storyteller eloquent enough to forge spaces with usability and aspiration.</p>

        <p>Listed below are the seven top agencies working in interior design that are changing Dubai's built environment, starting with one of the most reputable names in the business.</p>

        <h2>1. Aziza Homes</h2>
        
        <p>Aziza Homes leads the list of prime interior designing firms with warmth and dedication to excellence for innovation and client satisfaction. Aziza Homes embodies a perfect balance of modern design philosophy with classical elegance, creating spaces that appear both modern and timeless.</p>

        <p>Aziza Homes is differentiated in the marketplace through a holistic approach to interior design. Instead of relying upon a prescribed style, they deeply listen to the needs of clients, understand the individual context of each project, and develop tailored solutions in accordance with the particular vision and lifestyle of the client. Their portfolio ranges from luxury residences to high-end commercial spaces and sophisticated hospitality settings in Dubai and beyond.</p>

        <p>Driven by years of experience, the designers, project managers and craftspeople at Aziza Homes understand that great interiors are born out of great creative vision and brilliant execution. So, they will supervise the whole design process from conception until installation, ensuring continuity of care and very high detail orientation between each stage.</p>

        <p>The firm has acquired the ability to source rare materials, custom furniture and very unique decorative elements from which each client is free to become a partner of the very unique design solutions. An avant-garde, minimalist penthouse with sprawling views of Dubai Marina could very well become a classic-villa homage in Emirates Hills, yet Aziza Homes manages to bring out interiors beyond expectations and well beyond time.</p>

        <p>In addition, Aziza Homes designs beautiful, tangible spaces from nebulous ideas. A knack for superb craft execution is further supplemented by Aziza Homes' reputation for exceptional professionalism and responsiveness to the clients' needs.</p>

        <h2>2. Bishop Design</h2>

        <p>Among many things, Bishop Design has gained a reputation of being one of the most versatile interior design companies in Dubai. Their experience of more than twenty years in the region spans residential designs alone to large-scale hospitality developments, retail environments, and commercial headquarters.</p>

        <p>Flexibility in accommodating varying types of projects and client preferences is the strength of Bishop Design. No matter whether it is modern minimalism, classic Arabic grace, or eclectic liciousness, Bishop Design reflects the true creativity of outstanding results within versatility.</p>

        <h2>3. Luxury Antonovich Design</h2>

        <p>Luxury Antonovich Design is probably, in fact, the most consummate example for any client desiring ultra-glam glamour and maximalist interiors. Specializing in royal, super-luxurious homes, this company designs interiors with an abundance of opulent fabrics, complicated detailing, and extravagant decorations.</p>

        <h2>4. Sneha Divias Atelier</h2>

        <p>Sneha Divias Atelier brings a fresh, artistic approach to interior design in Dubai. Known for bold use of color, innovative spatial planning, and eclectic mix of styles, this boutique firm creates spaces that are uniquely expressive and deeply personal.</p>

        <h2>5. 4SPACE Design</h2>

        <p>4SPACE Design has built a strong reputation for contemporary, functional spaces that prioritize comfort without sacrificing style. Their portfolio includes a diverse range of projects, from sleek urban apartments to spacious family villas.</p>

        <h2>6. Algedra Interior Design</h2>

        <p>Algedra Interior Design combines international expertise with local knowledge to deliver sophisticated interiors across residential, commercial, and hospitality sectors. Their strength lies in their ability to blend different cultural influences seamlessly.</p>

        <h2>7. Zen Interiors</h2>

        <p>Zen Interiors specializes in creating calm, harmonious spaces inspired by minimalist and contemporary design principles. Their work is characterized by clean lines, neutral palettes, and thoughtful use of natural materials.</p>

        <h2>Why Choose Aziza Homes for Your Interior Design Needs?</h2>
        <p>Whether you're furnishing a luxury villa, preparing an investment property, or setting up your new home in Dubai, <a href="/services" style="color: hsl(var(--primary)); text-decoration: underline;">Aziza Homes offers comprehensive interior design and furnishing services</a> tailored to your specific needs. Our team combines creative excellence with efficient execution, delivering stunning results in just 10-15 business days.</p>
        
        <p>Ready to transform your space? <a href="/contact" style="color: hsl(var(--primary)); text-decoration: underline;">Get in touch with us today</a> to discuss your project, or explore our <a href="/packages" style="color: hsl(var(--primary)); text-decoration: underline;">furniture packages</a> designed for investors, expats, and homeowners.</p>
      `
    },
    "quick-efficient-ways-to-furnish-your-home": {
      title: "Quick & Efficient Ways to Furnish Your Home",
      image: blogFurnishHome,
      date: "November 4, 2025",
      readTime: "6 min read",
      category: "Home Furnishing",
      content: `
        <p>Furnishing a home can seem overwhelming. Whether you are moving into a new space or creating a fresher feel for your home, choosing the furniture, matching the colors, and putting together the whole look often become such long, tedious, stressful tasks. The good news is that it doesn't have to be this way. With the right approach and support, you can furnish your space quickly, efficiently, and within budget — without sacrificing style or quality.</p>

        <p>In this article, we'll explore practical strategies to simplify the furnishing process, saving you time, money, and stress. Whether you're an investor preparing a property for rental or an expat settling into a new home, these tips will help you furnish your space effectively.</p>

        <h2>1. Start with a Clear Plan</h2>
        <p>Before shopping, take time to think about your needs, preferences, and budget. This will help you avoid impulsive purchases and make smarter decisions:</p>
        <ul>
          <li><strong>Measure your space:</strong> Knowing the dimensions ensures furniture fits well and avoids cramped or overly sparse rooms.</li>
          <li><strong>Define your style:</strong> Decide if you prefer modern, minimalist, classic, or eclectic design. A cohesive style makes your space feel harmonious.</li>
          <li><strong>Prioritize essentials:</strong> Begin with key pieces (bed, sofa, dining table) before adding decorative items.</li>
          <li><strong>Set a realistic budget:</strong> Decide how much you can spend on each room and stick to it.</li>
        </ul>
        <p>Having a plan reduces decision fatigue and keeps you on track, ensuring a faster, more efficient furnishing process.</p>

        <h2>2. Choose a Full Furnishing Package</h2>
        <p>One of the fastest and most efficient ways to furnish a home is to opt for a complete furnishing package. Instead of sourcing individual items from different suppliers, a package offers:</p>
        <ul>
          <li><strong>Coordinated design:</strong> All pieces are selected to complement each other, ensuring a cohesive look.</li>
          <li><strong>Time savings:</strong> Skip the endless browsing and shopping trips.</li>
          <li><strong>Cost efficiency:</strong> Bundled packages often offer better value than buying items separately.</li>
          <li><strong>Convenience:</strong> Everything is delivered and installed at once, so your home is ready to live in immediately.</li>
        </ul>
        <p>For property investors and expats, <a href="/packages" style="color: hsl(var(--primary)); text-decoration: underline;">full furnishing packages</a> (like those offered by Aziza Home) are especially practical — eliminating the hassle and guaranteeing rental-ready spaces in record time.</p>

        <h2>3. Focus on Quality Over Quantity</h2>
        <p>It's tempting to buy lots of items to fill space quickly, but investing in quality pieces is smarter:</p>
        <ul>
          <li><strong>Durability:</strong> High-quality furniture lasts longer and withstands wear and tear, reducing replacement costs.</li>
          <li><strong>Aesthetic appeal:</strong> Well-crafted items elevate the look of any space.</li>
          <li><strong>Better resale value:</strong> Quality pieces maintain value and are easier to sell if needed.</li>
        </ul>
        <p>For rental properties, quality furniture attracts better tenants, reduces maintenance issues, and increases rental income.</p>

        <h2>4. Leverage Professional Expertise</h2>
        <p>Hiring an interior design or furnishing service can dramatically speed up the process and improve results. Professional designers:</p>
        <ul>
          <li>Understand space planning and create functional, beautiful layouts.</li>
          <li>Source furniture quickly from trusted suppliers.</li>
          <li>Avoid common mistakes (like oversized furniture or poor color coordination).</li>
          <li>Manage logistics, delivery, and installation.</li>
        </ul>
        <p>At Aziza Home, we specialize in delivering complete, customized <a href="/services" style="color: hsl(var(--primary)); text-decoration: underline;">furnishing solutions</a> in just 10-15 business days. We handle everything from concept to installation, allowing you to focus on enjoying your space.</p>

        <h2>5. Opt for Multi-Functional Furniture</h2>
        <p>If you're working with a smaller space or limited budget, multi-functional furniture is key:</p>
        <ul>
          <li>Sofa beds for guest rooms or studios.</li>
          <li>Extendable dining tables.</li>
          <li>Storage ottomans and benches.</li>
          <li>Wall-mounted desks.</li>
        </ul>
        <p>These pieces maximize utility without crowding your space.</p>

        <h2>6. Don't Forget Lighting and Accessories</h2>
        <p>Lighting and accessories are often afterthoughts, but they can transform a room:</p>
        <ul>
          <li><strong>Lighting:</strong> Layer different types (ambient, task, accent) to create warmth and functionality.</li>
          <li><strong>Accessories:</strong> Cushions, rugs, artwork, and plants add personality and warmth.</li>
        </ul>
        <p>These finishing touches make a house feel like a home — and for rental properties, they boost appeal significantly.</p>

        <h2>7. Work with Reliable Suppliers and Delivery Services</h2>
        <p>Unreliable suppliers can derail even the best plans. Look for providers with:</p>
        <ul>
          <li>Strong reputations and positive reviews.</li>
          <li>Fast and dependable delivery services.</li>
          <li>Transparent pricing and clear timelines.</li>
        </ul>
        <p>At Aziza Home, we manage the entire process in-house — from manufacturing to delivery — ensuring timely, high-quality results every time.</p>

        <h2>8. Consider Rental-Ready or Investor-Focused Solutions</h2>
        <p>If you're furnishing a property for rental, focus on:</p>
        <ul>
          <li><strong>Neutral, timeless design:</strong> Appeals to a wider tenant base.</li>
          <li><strong>Durability:</strong> Withstands tenant use and reduces maintenance.</li>
          <li><strong>Fast turnaround:</strong> The sooner your property is furnished, the sooner you can start earning rental income.</li>
        </ul>
        <p>Aziza Home's <a href="/packages" style="color: hsl(var(--primary)); text-decoration: underline;">rental packages</a> are specifically designed to help investors maximize ROI and attract quality tenants quickly.</p>

        <h2>Final Thoughts</h2>
        <p>Furnishing your home doesn't have to be stressful or time-consuming. With a clear plan, smart choices, and the right support, you can create a beautifully furnished space quickly and efficiently — whether it's for your personal use or for generating rental income.</p>
        <p>At Aziza Home, we specialize in simplifying the furnishing process, offering <a href="/packages" style="color: hsl(var(--primary)); text-decoration: underline;">curated packages</a> delivered in just 10-15 business days. From <a href="/services" style="color: hsl(var(--primary)); text-decoration: underline;">expat relocations to investor properties</a>, we take care of everything — so you can move in, rent out, or enjoy your space stress-free.</p>
        <p><strong>Ready to furnish your home the smart way?</strong> <a href="/contact" style="color: hsl(var(--primary)); text-decoration: underline;">Contact Aziza Home</a> today and let us bring your vision to life.</p>
      `
    },
    "where-to-invest-dubai-best-roi-property-growth": {
      title: "Where to Invest in Dubai for the Best ROI and Property Growth",
      image: blogDubaiInvestment,
      date: "November 5, 2025",
      readTime: "7 min read",
      category: "Investment Guide",
      content: `
        <p>Dubai's real estate market continues to attract global investors thanks to its tax-free environment, world-class infrastructure, and high demand for both short-term and long-term rentals. However, the key to maximizing your returns lies in <strong>choosing the right area</strong> — and understanding how professional furnishing can significantly boost your rental income and property value.</p>

        <h2>1. Downtown Dubai — Prime for Both Short-Term and Long-Term Rentals After Furnishing</h2>
        <p>Downtown Dubai is one of the most prestigious and reliable investment zones in Dubai. It's well known among investors and holiday home operators for its <strong>exceptionally strong short-term rental performance</strong> — driven by constant tourist demand, business travelers, and iconic attractions like the Burj Khalifa and Dubai Mall.</p>
        
        <p>However, beyond short stays, Downtown also performs <strong>remarkably well for long-term rentals</strong> — especially when the unit is beautifully furnished. Many investors who prefer to avoid the operational workload of dealing with holiday-home management find long-term leasing after furnishing to be a <strong>more stable, hassle-free option</strong> that still delivers excellent returns.</p>

        <h3>Case Study:</h3>
        <ul>
          <li><strong>2-Bedroom in Act One Tower</strong></li>
          <li><strong>Unfurnished annual rent:</strong> AED 180,000–200,000</li>
          <li><strong>After full furnishing by Aziza Home:</strong> Rented for <strong>AED 250,000 per year</strong></li>
          <li><strong>Result:</strong> ~25–35% increase in annual income with higher-quality tenants and faster leasing</li>
        </ul>

        <p>This demonstrates how a well-designed, move-in-ready property in a premium area like Downtown can easily outperform the market average — whether it's rented short-term or long-term.</p>

        <h2>2. Dubai Harbour — Best for Long-Term Appreciation</h2>
        <p>Dubai Harbour is rapidly evolving into one of the city's most luxurious waterfront destinations. With ongoing development, marina access, and proximity to Palm Jumeirah and Dubai Marina, it has become a <strong>top choice for capital appreciation</strong>.</p>
        
        <p>While short-term rentals are still maturing here, investors focusing on <strong>long-term property value growth</strong> can expect substantial appreciation over the coming years as new projects are completed and demand rises.</p>

        <h2>3. Jumeirah Village Circle (JVC) — Strong ROI for Long-Term Rentals</h2>
        <p>JVC remains a favorite for investors seeking <strong>high rental yields with a lower purchase price</strong>. Its growing community infrastructure, easy access to main roads, and family-friendly environment make it ideal for stable, long-term occupancy.</p>

        <h3>Case Study:</h3>
        <ul>
          <li><strong>1-Bedroom in Binghatti Project</strong></li>
          <li><strong>Unfurnished annual rent:</strong> AED 65,000–75,000</li>
          <li><strong>After Aziza Home full furnishing:</strong> Rented for <strong>AED 110,000 per year</strong></li>
          <li><strong>Result:</strong> Over <strong>45% increase in rental income</strong></li>
        </ul>

        <p>With tasteful modern furniture, cohesive décor, and practical design elements, the unit appealed to premium tenants — proving that <strong>furnishing transforms standard units into high-performing assets</strong>.</p>

        <h2>4. Why Furnishing Matters for ROI</h2>
        <p>Many investors underestimate how much <strong>professional furnishing and design</strong> can enhance their returns. A fully furnished apartment:</p>
        
        <ul>
          <li>Attracts higher-quality tenants or guests</li>
          <li>Commands higher rent or nightly rates</li>
          <li>Reduces vacancy time</li>
          <li>Enhances resale value and online visibility</li>
          <li>Provides flexibility between short-term and long-term strategies</li>
        </ul>

        <p>At Aziza Home, we specialize in transforming empty units into <strong>ready-to-rent, beautifully designed spaces</strong> that appeal to both the holiday-home market and long-term tenants — delivered within just 10–15 business days. <a href="/services" style="color: hsl(var(--primary)); text-decoration: underline;">Explore our furnishing services</a> to see how we can help maximize your investment returns.</p>

        <h2>Final Thoughts</h2>
        <p>Whether your focus is <strong>steady rental income</strong> (Downtown, JVC) or <strong>long-term appreciation</strong> (Dubai Harbour), the key to maximizing your returns lies in <strong>professional furnishing and presentation</strong>.</p>

        <p>Dubai's tenants and guests increasingly prefer turn-key, design-forward living spaces — and that's exactly what Aziza Home delivers: <strong>furnished properties that rent faster, at higher rates, and with less hassle.</strong></p>

        <p><strong>Want to boost your property's ROI?</strong><br><a href="/contact" style="color: hsl(var(--primary)); text-decoration: underline;">Contact us today</a> to learn how our <a href="/packages" style="color: hsl(var(--primary)); text-decoration: underline;">complete furnishing packages</a> can help you attract better tenants and increase your rental income. Check out our <a href="/services" style="color: hsl(var(--primary)); text-decoration: underline;">investor-focused services</a> for more details.</p>
      `
    }
  };

  const article = slug ? articles[slug as keyof typeof articles] : null;

  if (!article) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-4xl font-bold mb-4">Article Not Found</h1>
          <Link to="/blog">
            <Button>Back to Blog</Button>
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  // Generate full image URL for social sharing
  const getImageUrl = (slug: string) => {
    const imageMap: { [key: string]: string } = {
      "top-7-interior-design-agencies-dubai": "https://azizahomes.com/blog-top-agencies.jpg",
      "quick-efficient-ways-to-furnish-your-home": "https://azizahomes.com/blog-furnish-home.jpg",
      "where-to-invest-dubai-best-roi-property-growth": "https://azizahomes.com/blog-dubai-investment.jpg"
    };
    return imageMap[slug] || "https://azizahomes.com/hero-image-new.jpg";
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{article.title} - Aziza Home Blog | Interior Design & Real Estate Dubai</title>
        <meta name="description" content={article.content.substring(0, 160).replace(/<[^>]*>/g, '')} />
        <meta name="keywords" content={`${article.category}, Dubai interior design, home furnishing, property investment, Aziza Home`} />
        <link rel="canonical" href={`https://azizahomes.com/blog/${slug}`} />
        
        {/* Open Graph Meta Tags */}
        <meta property="og:type" content="article" />
        <meta property="og:title" content={article.title} />
        <meta property="og:description" content={article.content.substring(0, 160).replace(/<[^>]*>/g, '')} />
        <meta property="og:url" content={`https://azizahomes.com/blog/${slug}`} />
        <meta property="og:image" content={getImageUrl(slug || '')} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:site_name" content="Aziza Home" />
        
        {/* Twitter Card Meta Tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={article.title} />
        <meta name="twitter:description" content={article.content.substring(0, 160).replace(/<[^>]*>/g, '')} />
        <meta name="twitter:image" content={getImageUrl(slug || '')} />
        
        <script type="application/ld+json">
          {JSON.stringify(generateBlogStructuredData(article, slug || ''))}
        </script>
      </Helmet>

      <Navigation />

      <main>
        {/* Hero Image */}
        <div className="relative h-[60vh] overflow-hidden">
          <img 
            src={article.image} 
            alt={article.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
        </div>

        {/* Article Content */}
        <article className="container mx-auto px-4 -mt-32 relative z-10">
          <div className="max-w-4xl mx-auto">
            <BreadcrumbNav items={[
              { label: "Blog", href: "/blog" },
              { label: article.title }
            ]} />
            <Link to="/blog">
              <Button variant="ghost" className="mb-8">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Blog
              </Button>
            </Link>

            <div className="bg-card rounded-2xl shadow-2xl p-8 md:p-12">
              <div className="mb-6">
                <span className="bg-primary text-primary-foreground px-4 py-1.5 rounded-full text-sm font-medium">
                  {article.category}
                </span>
              </div>

              <h1 className="text-4xl md:text-5xl font-bold mb-6">
                {article.title}
              </h1>

              <div className="flex items-center gap-6 text-muted-foreground mb-8 pb-8 border-b">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>{article.date}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>{article.readTime}</span>
                </div>
              </div>

              <div 
                className="prose prose-lg max-w-none blog-content"
                dangerouslySetInnerHTML={{ __html: article.content }}
              />

              <div className="mt-12 pt-8 border-t">
                <div className="flex flex-col gap-6">
                  <div>
                    <h3 className="text-xl font-semibold mb-4">Related Articles</h3>
                    <div className="grid gap-4">
                      {Object.entries(articles)
                        .filter(([key]) => key !== slug)
                        .slice(0, 2)
                        .map(([key, relatedArticle]) => (
                          <Link 
                            key={key} 
                            to={`/blog/${key}`}
                            className="flex gap-4 p-4 rounded-lg border hover:border-primary transition-colors"
                          >
                            <img 
                              src={relatedArticle.image} 
                              alt={relatedArticle.title}
                              className="w-24 h-24 object-cover rounded"
                            />
                            <div className="flex-1">
                              <h4 className="font-semibold mb-2">{relatedArticle.title}</h4>
                              <p className="text-sm text-muted-foreground">{relatedArticle.category}</p>
                            </div>
                          </Link>
                        ))}
                    </div>
                  </div>
                  
                  <div className="flex gap-4">
                    <Link to="/blog">
                      <Button variant="outline">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        All Articles
                      </Button>
                    </Link>
                    <Link to="/packages">
                      <Button>
                        Explore Our Packages
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </article>

        <div className="h-20" />
      </main>

      <Footer />
    </div>
  );
};

export default BlogPost;
