import { useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import BreadcrumbNav from "@/components/BreadcrumbNav";
import StructuredData from "@/components/StructuredData";
import { MultilingualSEO } from "@/components/MultilingualSEO";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { supabase } from "@/lib/supabase-ssr";
import hero from "@/assets/minimalist-dubai-hero.jpg";
import g1 from "@/assets/portfolio-1.jpg";
import g2 from "@/assets/portfolio-2.jpeg";
import g3 from "@/assets/portfolio-10.jpeg";
import g4 from "@/assets/portfolio-12.jpeg";
import g5 from "@/assets/portfolio-15.jpg";
import g6 from "@/assets/portfolio-18.jpg";

const PATH = "/minimalist-apartment-furnishing-dubai";
const TITLE = "Minimalist Apartment Furnishing Dubai | Aziza Home";
const DESCRIPTION =
  "Turnkey minimalist apartment furnishing in Dubai. Calm, timeless interiors with full design, delivery, and installation in as little as 10 days.";
const KEYWORDS =
  "minimalist apartment furnishing dubai, minimalist interior design dubai, turnkey furnishing dubai, japandi dubai, apartment furnishing packages";

const highlights = [
  {
    title: "Studio & 1BR Minimalist Package",
    desc: "Curated low-profile furniture, soft neutrals, and clean lines — perfect for compact Dubai apartments.",
    points: ["All furniture included", "Soft textiles & lighting", "Installed in 5–7 days"],
  },
  {
    title: "2BR Designer Minimal",
    desc: "Architectural calm with a focal feature wall, natural materials, and warm minimalism for family homes.",
    points: ["Feature wall design", "Premium oak & linen palette", "Installed in 7–10 days"],
    featured: true,
  },
  {
    title: "Luxury Minimal Penthouse",
    desc: "High-end minimalism with custom millwork, sculptural lighting, and gallery-grade styling.",
    points: ["Custom millwork", "Designer lighting", "Full styling & art"],
  },
];

const gallery = [
  { src: g1, alt: "Minimalist Dubai apartment living room with neutral palette" },
  { src: g2, alt: "Minimalist bedroom Dubai apartment with oak headboard" },
  { src: g3, alt: "Minimalist dining area Dubai apartment with linen chairs" },
  { src: g4, alt: "Japandi-inspired minimalist Dubai apartment" },
  { src: g5, alt: "Clean-line minimalist Dubai apartment lounge" },
  { src: g6, alt: "Soft minimalist Dubai apartment with feature wall" },
];

const faqs = [
  {
    q: "How long does a minimalist furnishing project take in Dubai?",
    a: "Most studio and one-bedroom apartments are fully furnished and styled within 5–7 days. Two-bedroom homes typically complete in 7–10 days from package confirmation.",
  },
  {
    q: "What is included in the minimalist furnishing package?",
    a: "Everything: furniture, rugs, lighting, soft furnishings, decor, delivery, and installation. We hand over a ready-to-live or ready-to-list apartment.",
  },
  {
    q: "Can you work with my existing pieces?",
    a: "Yes. We can integrate select pieces you already own and design the rest of the apartment around them while keeping a cohesive minimalist palette.",
  },
  {
    q: "Do you furnish holiday homes and rental investments?",
    a: "Yes — minimalist interiors photograph exceptionally well and attract premium tenants. We tailor packages for long-term rentals and short-stay holiday homes.",
  },
  {
    q: "What does a minimalist apartment in Dubai cost?",
    a: "Our minimalist packages start from AED 22,500 for a studio. Full pricing depends on apartment size, finishes, and whether you choose Essential, Premium, or Luxury.",
  },
];

const formSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().max(20).optional(),
  message: z.string().trim().min(1).max(2000),
});

const MinimalistApartmentDubai = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const fd = new FormData(e.currentTarget);
      const data = {
        name: fd.get("name") as string,
        email: fd.get("email") as string,
        phone: (fd.get("phone") as string) || undefined,
        message: `[Minimalist Apartment Furnishing Dubai] ${fd.get("message") as string}`,
      };
      const validated = formSchema.parse(data);
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("contact_messages").insert({
        user_id: user?.id || null,
        name: validated.name,
        email: validated.email,
        phone: validated.phone || null,
        message: validated.message,
      });
      if (error) throw error;
      try {
        await supabase.functions.invoke("send-form-notification", {
          body: {
            formType: "contact",
            data: validated,
            recipientEmail: "info@azizahomes.com",
          },
        });
      } catch (_) { /* non-blocking */ }
      toast.success("Thanks! We'll be in touch with your minimalist quote shortly.");
      e.currentTarget.reset();
    } catch (err) {
      if (err instanceof z.ZodError) toast.error(err.errors[0].message);
      else toast.error("Failed to send. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <div className="min-h-screen bg-background">
      <MultilingualSEO title={TITLE} description={DESCRIPTION} keywords={KEYWORDS} path={PATH} />
      <StructuredData
        breadcrumbs={[
          { name: "Home", url: "https://azizahomes.com" },
          { name: "Minimalist Apartment Furnishing Dubai", url: `https://azizahomes.com${PATH}` },
        ]}
        pageTitle="Minimalist Apartment Furnishing Dubai"
        pageDescription={DESCRIPTION}
      />
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
      </Helmet>
      <Navigation />

      {/* Hero */}
      <section className="relative pt-24">
        <div className="container mx-auto px-4 pt-8">
          <BreadcrumbNav items={[{ label: "Minimalist Apartment Furnishing Dubai" }]} />
        </div>
        <div className="container mx-auto px-4 grid lg:grid-cols-2 gap-10 items-center py-10 md:py-16">
          <div>
            <span className="inline-block px-4 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium mb-4">
              Turnkey · 5–10 days
            </span>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              Minimalist Apartment Furnishing in Dubai
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-xl">
              Calm, timeless interiors with clean lines and warm neutrals. Full design,
              delivery, and installation — your apartment ready to live or list in as little as 10 days.
            </p>
            <div className="flex flex-wrap gap-3">
              <a href="#quote">
                <Button size="lg">
                  Request Free Quote
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </a>
              <a href="https://wa.me/971559779635?text=Hi%20Aziza%20Home%2C%20I%27m%20interested%20in%20minimalist%20apartment%20furnishing%20in%20Dubai." target="_blank" rel="noopener noreferrer">
                <Button size="lg" variant="outline">Chat on WhatsApp</Button>
              </a>
            </div>
          </div>
          <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-muted">
            <img
              src={hero}
              alt="Minimalist Dubai apartment interior with skyline view"
              width={1600}
              height={1024}
              className="absolute inset-0 w-full h-full object-cover"
            />
          </div>
        </div>
      </section>

      {/* Package Highlights */}
      <section className="py-20 bg-secondary/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Minimalist Package Highlights</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Three curated paths to a perfectly minimalist Dubai apartment.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {highlights.map((h) => (
              <div
                key={h.title}
                className={`bg-card rounded-lg border p-6 ${h.featured ? "border-primary shadow-md" : "border-border"}`}
              >
                {h.featured && (
                  <span className="inline-block text-xs font-medium bg-primary text-primary-foreground px-3 py-1 rounded-full mb-3">
                    MOST POPULAR
                  </span>
                )}
                <h3 className="text-xl font-semibold mb-2">{h.title}</h3>
                <p className="text-muted-foreground mb-4">{h.desc}</p>
                <ul className="space-y-2">
                  {h.points.map((p) => (
                    <li key={p} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Gallery */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Minimalist Interiors Gallery</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              A glimpse of recently furnished minimalist Dubai apartments.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-6xl mx-auto">
            {gallery.map((img) => (
              <div key={img.src} className="relative aspect-square overflow-hidden rounded-lg bg-muted">
                <img
                  src={img.src}
                  alt={img.alt}
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="py-20 bg-secondary/30">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Frequently Asked Questions</h2>
          </div>
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((f, i) => (
              <AccordionItem key={i} value={`item-${i}`}>
                <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Quote / Contact */}
      <section id="quote" className="py-20">
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Request Your Free Quote</h2>
            <p className="text-muted-foreground">
              Tell us about your apartment and we'll send a tailored minimalist proposal within 24 hours.
            </p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input name="name" placeholder="Your Name" required maxLength={100} />
            <Input name="email" type="email" placeholder="Your Email" required maxLength={255} />
            <Input name="phone" type="tel" placeholder="Phone Number (optional)" maxLength={20} />
            <Textarea
              name="message"
              placeholder="Apartment size, location, and timeline..."
              required
              maxLength={2000}
              className="min-h-[140px]"
            />
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Sending..." : "Request Free Quote"}
            </Button>
          </form>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default MinimalistApartmentDubai;