import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import package1 from "@/assets/package-1.jpg";
import package2 from "@/assets/package-2.jpg";
import package3 from "@/assets/package-3.jpg";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import { getProducts, ShopifyProduct } from "@/lib/shopify";

const Packages = () => {
  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const [loading, setLoading] = useState(true);

  const packageImages = [package1, package2, package3];
  const packagePrices = ["22,500", "26,500", null]; // First two packages have fixed prices

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const fetchedProducts = await getProducts(3);
        setProducts(fetchedProducts);
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const handleWhatsAppClick = (product: ShopifyProduct, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const message = encodeURIComponent(`Hi, I'm interested in ${product.node.title}`);
    window.open(`https://wa.me/971559779635?text=${message}`, '_blank');
  };

  return (
    <section id="packages" className="py-20 md:py-32 bg-secondary/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-heading font-semibold text-foreground mb-4 uppercase tracking-wide">
            Furnishing Packages
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Complete A-Z solutions tailored to your vision. From essential pieces to bespoke luxury.
          </p>
        </div>

        {/* Package Options */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading packages...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">No products found</p>
            <p className="text-sm text-muted-foreground">Create a product by telling me what you want!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {products.slice(0, 3).map((product, index) => {
              const isFeatured = index === 1;
              const variant = product.node.variants.edges[0]?.node;
              
              return (
                <Link
                  key={product.node.id}
                  to={`/product/${product.node.handle}`}
                  className={`bg-card rounded-lg border transition-smooth hover:shadow-lg block overflow-hidden group ${
                    isFeatured ? "border-primary shadow-md" : "border-border"
                  }`}
                >
                  {isFeatured && (
                    <div className="absolute top-4 right-4 z-10 bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-full">
                      MOST POPULAR
                    </div>
                  )}
                  
                  <div className="relative aspect-[4/3] overflow-hidden bg-secondary/20">
                    <img 
                      src={packageImages[index]} 
                      alt={product.node.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-smooth"
                    />
                  </div>
                  
                  <div className="p-6">
                    <h3 className="text-xl font-heading font-semibold text-foreground mb-2">
                      {product.node.title}
                    </h3>
                    <p className="text-2xl font-bold text-primary mb-3">
                      from {packagePrices[index] || parseFloat(variant?.price.amount || '0').toLocaleString()} AED
                    </p>
                    <p className="text-muted-foreground text-sm mb-4 line-clamp-2">{product.node.description}</p>
                    
                    <Button
                      onClick={(e) => handleWhatsAppClick(product, e)}
                      className="w-full"
                      variant={isFeatured ? "default" : "outline"}
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      More Info on WhatsApp
                    </Button>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

export default Packages;
