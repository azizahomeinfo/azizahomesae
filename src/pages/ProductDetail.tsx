import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
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

  const productPrice = selectedVariant?.price ? parseFloat(selectedVariant.price.amount).toFixed(0) : '0';
  const productDescription = product.description ? product.description.substring(0, 155) : 'Premium furnishing package for Dubai properties';

  return (
    <>
      <Helmet>
        <title>{product.title} - AED {productPrice} | Aziza Home Dubai Furnishing Packages</title>
        <meta name="description" content={productDescription} />
        <meta name="keywords" content={`${product.title}, Dubai furnishing package, furniture package Dubai, home furnishing Dubai, Aziza Home`} />
        <link rel="canonical" href={`https://azizahomes.com/product/${handle}`} />
        
        {/* Open Graph Meta Tags */}
        <meta property="og:type" content="product" />
        <meta property="og:title" content={`${product.title} - AED ${productPrice}`} />
        <meta property="og:description" content={productDescription} />
        <meta property="og:url" content={`https://azizahomes.com/product/${handle}`} />
        {product.images?.edges?.[0] && (
          <meta property="og:image" content={product.images.edges[0].node.url} />
        )}
        <meta property="og:site_name" content="Aziza Home" />
        
        {/* Product Schema */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            "name": product.title,
            "description": productDescription,
            "image": product.images?.edges?.[0]?.node.url,
            "offers": {
              "@type": "Offer",
              "price": productPrice,
              "priceCurrency": "AED",
              "availability": selectedVariant?.availableForSale ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
              "seller": {
                "@type": "Organization",
                "name": "Aziza Home"
              }
            }
          })}
        </script>
      </Helmet>
      
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
                AED {parseFloat(selectedVariant?.price.amount || '0').toFixed(0)}
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
    </>
  );
};

export default ProductDetail;
