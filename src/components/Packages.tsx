import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import packageImage from "@/assets/package-complete.jpg";
import { Button } from "@/components/ui/button";
import { Check, ShoppingCart } from "lucide-react";
import { getProducts, ShopifyProduct } from "@/lib/shopify";
import { useCartStore } from "@/stores/cartStore";
import { toast } from "sonner";

const Packages = () => {
  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const addItem = useCartStore(state => state.addItem);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const fetchedProducts = await getProducts(10);
        setProducts(fetchedProducts);
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const handleAddToCart = (product: ShopifyProduct, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const variant = product.node.variants.edges[0]?.node;
    if (!variant) return;

    const cartItem = {
      product,
      variantId: variant.id,
      variantTitle: variant.title,
      price: variant.price,
      quantity: 1,
      selectedOptions: variant.selectedOptions || []
    };
    
    addItem(cartItem);
    toast.success("Added to cart", {
      description: `${product.node.title} has been added to your cart.`
    });
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

        {/* Hero Package Image */}
        <div className="mb-16 rounded-lg overflow-hidden max-w-5xl mx-auto">
          <img src={packageImage} alt="Complete furnishing package" className="w-full h-auto object-cover" />
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
            {products.map((product, index) => {
              const isFeatured = product.node.title.toLowerCase().includes('complete');
              const variant = product.node.variants.edges[0]?.node;
              const image = product.node.images.edges[0]?.node;
              
              return (
                <Link
                  key={product.node.id}
                  to={`/product/${product.node.handle}`}
                  className={`bg-card p-8 rounded-lg border transition-smooth hover:shadow-lg block ${
                    isFeatured ? "border-primary shadow-md md:scale-105" : "border-border"
                  }`}
                >
                  {isFeatured && (
                    <div className="inline-block bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-full mb-4">
                      MOST POPULAR
                    </div>
                  )}
                  
                  {image && (
                    <div className="mb-4 rounded-lg overflow-hidden bg-secondary/20">
                      <img 
                        src={image.url} 
                        alt={image.altText || product.node.title}
                        className="w-full h-48 object-cover"
                      />
                    </div>
                  )}
                  
                  <h3 className="text-2xl font-heading font-semibold text-foreground mb-2">
                    {product.node.title}
                  </h3>
                  <p className="text-xl font-bold text-primary mb-4">
                    {variant?.price.currencyCode} ${parseFloat(variant?.price.amount || '0').toFixed(2)}
                  </p>
                  <p className="text-muted-foreground mb-6 line-clamp-3">{product.node.description}</p>
                  
                  <Button
                    onClick={(e) => handleAddToCart(product, e)}
                    className={isFeatured ? "w-full" : "w-full"}
                    variant={isFeatured ? "default" : "outline"}
                  >
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Add to Cart
                  </Button>
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
