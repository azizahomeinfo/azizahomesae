import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getProductByHandle } from "@/lib/shopify";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/stores/cartStore";
import { ArrowLeft, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";

const ProductDetail = () => {
  const { handle } = useParams();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const addItem = useCartStore(state => state.addItem);

  useEffect(() => {
    const fetchProduct = async () => {
      if (!handle) return;
      
      try {
        setLoading(true);
        const productData = await getProductByHandle(handle);
        setProduct(productData);
        if (productData?.variants?.edges?.[0]) {
          setSelectedVariant(productData.variants.edges[0].node);
        }
      } catch (error) {
        console.error('Error fetching product:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [handle]);

  const handleAddToCart = () => {
    if (!product || !selectedVariant) return;

    const cartItem = {
      product: { node: product },
      variantId: selectedVariant.id,
      variantTitle: selectedVariant.title,
      price: selectedVariant.price,
      quantity: 1,
      selectedOptions: selectedVariant.selectedOptions || []
    };
    
    addItem(cartItem);
    toast.success("Added to cart", {
      description: `${product.title} has been added to your cart.`
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <div className="container mx-auto px-4 py-20 flex items-center justify-center">
          <div className="text-center">
            <p className="text-muted-foreground">Loading product...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <div className="container mx-auto px-4 py-20">
          <div className="text-center">
            <h1 className="text-2xl font-heading mb-4">Product not found</h1>
            <Link to="/">
              <Button variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to home
              </Button>
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navigation />
      <div className="container mx-auto px-4 py-20 md:py-32">
        <Link to="/" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to packages
        </Link>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="space-y-4">
            {product.images?.edges?.map((image: any, index: number) => (
              <div key={index} className="rounded-lg overflow-hidden bg-secondary/20">
                <img 
                  src={image.node.url} 
                  alt={image.node.altText || product.title}
                  className="w-full h-auto object-cover"
                />
              </div>
            ))}
          </div>

          <div className="space-y-6">
            <div>
              <h1 className="text-4xl font-heading font-semibold mb-4">{product.title}</h1>
              <p className="text-3xl font-bold text-primary">
                {selectedVariant?.price.currencyCode} ${parseFloat(selectedVariant?.price.amount || '0').toFixed(2)}
              </p>
            </div>

            <div className="prose prose-sm max-w-none">
              <p className="text-muted-foreground">{product.description}</p>
            </div>

            {product.options?.length > 0 && product.options[0].values.length > 1 && (
              <div className="space-y-4">
                {product.options.map((option: any) => (
                  <div key={option.name}>
                    <label className="block text-sm font-medium mb-2">{option.name}</label>
                    <div className="flex gap-2 flex-wrap">
                      {option.values.map((value: string) => {
                        const variant = product.variants.edges.find((v: any) =>
                          v.node.selectedOptions.some((opt: any) => opt.name === option.name && opt.value === value)
                        );
                        const isSelected = selectedVariant?.id === variant?.node.id;
                        
                        return (
                          <Button
                            key={value}
                            variant={isSelected ? "default" : "outline"}
                            onClick={() => setSelectedVariant(variant?.node)}
                            disabled={!variant?.node.availableForSale}
                          >
                            {value}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <Button 
              onClick={handleAddToCart}
              className="w-full" 
              size="lg"
              disabled={!selectedVariant?.availableForSale}
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              Add to Cart
            </Button>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default ProductDetail;
