import { ArrowRight, Check, MessageCircle, Camera, Users, Clock, MapPin, Send, Palette, Package, Sparkles } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import BreadcrumbNav from "@/components/BreadcrumbNav";
import StructuredData from "@/components/StructuredData";
import { MultilingualSEO } from "@/components/MultilingualSEO";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import hero from "@/assets/investors-furnishing-hero.jpg";
import g1 from "@/assets/portfolio-1.jpg";
import g2 from "@/assets/portfolio-2.jpeg";
import g3 from "@/assets/portfolio-10.jpeg";
import g4 from "@/assets/portfolio-12.jpeg";
import g5 from "@/assets/portfolio-15.jpg";
import g6 from "@/assets/portfolio-18.jpg";

const PATH = "/investors-furnishing-dubai";
const TITLE = "Dubai Apartment Furnishing Packages for Investors | Aziza Home";
const DESCRIPTION =
  "Turnkey apartment furnishing packages in Dubai for investors, landlords and holiday-home owners. Improve rental appeal with design, sourcing, delivery, installation and styling by Aziza Home.";
const KEYWORDS =
  "dubai apartment furnishing packages, apartment furnishing dubai, investor furnishing dubai, rental-ready apartment dubai, holiday home furnishing dubai, airbnb furnishing dubai, turnkey furnishing dubai, furniture packages dubai, long-term rental furnishing dubai";

const WA_BASE = "https://wa.me/971559779635";
const WA_MSG = encodeURIComponent("Hi, I would like to know more about your furnishing packages!");
const waLink = (tracking: string) => `${WA_BASE}?text=${WA_MSG}`;

// Conversion tracking — fires to Google Ads / GA4 (gtag), GTM dataLayer,
// Meta Pixel (fbq) if loaded, and a first-party log in ab_events.
const trackWhatsAppClick = (tracking: string, label: string) => {
  if (typeof window === "undefined") return;
  const w = window as any;
  const payload = {
    cta_id: tracking,
    cta_label: label,
    page_path: PATH,
    destination: "whatsapp",
  };
  try {
    // Google Ads / GA4
    if (typeof w.gtag === "function") {
      w.gtag("event", "whatsapp_click", {
        ...payload,
        event_category: "engagement",
        event_label: tracking,
        transport_type: "beacon",
      });
      // Google Ads conversion — replace AW-XXXX/abcDEF with your conversion ID/label
      if (w.GOOGLE_ADS_CONVERSION_ID) {
        w.gtag("event", "conversion", {
          send_to: w.GOOGLE_ADS_CONVERSION_ID,
          event_callback: () => {},
        });
      }
    }
    // GTM dataLayer fallback
    w.dataLayer = w.dataLayer || [];
    w.dataLayer.push({ event: "whatsapp_click", ...payload });
    // Meta Pixel (if present)
    if (typeof w.fbq === "function") {
      w.fbq("trackCustom", "WhatsAppClick", payload);
    }
  } catch (_) { /* never block navigation */ }

  // First-party log (non-blocking, fire-and-forget)
  try {
    const sessionId =
      w.sessionStorage?.getItem("aziza_session_id") ||
      (() => {
        const id = `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
        try { w.sessionStorage?.setItem("aziza_session_id", id); } catch (_) {}
        return id;
      })();
    void import("@/integrations/supabase/client").then(({ supabase }) => {
      supabase.from("ab_events").insert({
        session_id: sessionId,
        path: PATH,
        experiment: "investors_lp",
        variant: tracking,
        event_type: "whatsapp_click",
        language: typeof navigator !== "undefined" ? navigator.language : null,
      });
    });
  } catch (_) { /* ignore */ }
};

const portfolio = [
  { src: g1, label: "Downtown Dubai 2BR" },
  { src: g2, label: "JVC 1BR" },
  { src: g3, label: "Business Bay Apartment" },
  { src: g4, label: "Dubai Marina Rental Setup" },
  { src: g5, label: "Creek Harbour Furnishing" },
  { src: g6, label: "Holiday Home Ready Setup" },
];

const packages = [
  {
    name: "Essential",
    tag: "Clean and rental-ready",
    desc: "For investors who want a complete setup without wall design.",
    points: ["Furniture", "Curtains", "Rugs", "Basic décor", "Delivery & installation"],
  },
  {
    name: "Premium",
    tag: "Most popular for ROI-focused investors",
    desc: "Stronger visual appeal and better listing photos.",
    points: ["Complete furnishing", "Enhanced styling", "Feature wall / wall enhancement", "Stronger visual impact"],
    featured: true,
  },
  {
    name: "Luxury",
    tag: "For premium listings and holiday homes",
    desc: "Higher-value apartments and stronger market positioning.",
    points: ["Complete furnishing", "Upgraded wall design", "Richer styling", "More premium finish"],
  },
];

const pricing = [
  { layout: "Studio", essential: "from AED 18.1K", premium: "from AED 24.0K", luxury: "from AED 27.2K" },
  { layout: "1 Bedroom", essential: "from AED 23.7K", premium: "from AED 31.8K", luxury: "from AED 35.9K" },
  { layout: "2 Bedroom", essential: "from AED 34.9K", premium: "from AED 45.9K", luxury: "from AED 50.5K" },
  { layout: "3 Bedroom", essential: "from AED 43.3K", premium: "from AED 58.0K", luxury: "from AED 61.7K" },
];

const steps = [
  { icon: Send, title: "Send Apartment Details", desc: "Location, layout, timeline, and rental goal." },
  { icon: Palette, title: "Choose Package & Design", desc: "Essential, Premium, or Luxury direction." },
  { icon: Package, title: "We Furnish and Style", desc: "Sourcing, delivery, installation, styling, handover." },
  { icon: Sparkles, title: "List, Lease, or Launch", desc: "Ready for long-term rental or holiday-home setup." },
];

const faqs = [
  {
    q: "How long does furnishing take?",
    a: "Standard furnishing usually takes 5–18 business days after payment, site access, and final confirmation. Fast-track may be available subject to stock and building access.",
  },
  {
    q: "Can furnishing increase my rental income?",
    a: "Professional furnishing can improve rental appeal and help position the apartment at a stronger rental level. Based on selected previous projects, long-term rental positioning may increase around 15%–20%, depending on location, market demand, unit condition, and management quality.",
  },
  {
    q: "Can I choose individual items?",
    a: "Our standard packages are curated by Aziza Home. Clients choose the package tier and design direction. Individual item selection is not included in the standard package.",
  },
  {
    q: "Do you work with overseas owners?",
    a: "Yes. We can coordinate remotely with overseas landlords and investors, including updates, installation, and handover.",
  },
  {
    q: "Are appliances included?",
    a: "Both with-appliance and without-appliance package options are available.",
  },
];

const CTA = ({ label, tracking, variant = "default", size = "lg", className = "" }: { label: string; tracking: string; variant?: "default" | "outline" | "secondary"; size?: "default" | "lg"; className?: string }) => (
  <a
    href={waLink(tracking)}
    target="_blank"
    rel="noopener noreferrer"
    data-cta={tracking}
    aria-label={label}
    onClick={() => trackWhatsAppClick(tracking, label)}
    onAuxClick={() => trackWhatsAppClick(tracking, label)}
  >
    <Button size={size} variant={variant} className={className}>
      <MessageCircle className="mr-2 h-4 w-4" />
      {label}
    </Button>
  </a>
);

const InvestorsFurnishingDubai = () => {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    serviceType: "Apartment Furnishing for Investors",
    provider: {
      "@type": "LocalBusiness",
      name: "Aziza Home",
      areaServed: "Dubai, United Arab Emirates",
      url: "https://www.azizahomes.com",
    },
    areaServed: "Dubai",
    description: DESCRIPTION,
    offers: pricing.map((p) => ({
      "@type": "Offer",
      name: `${p.layout} Furnishing Package`,
      priceCurrency: "AED",
      price: p.essential.replace(/[^0-9.]/g, ""),
    })),
  };

  return (
    <div className="min-h-screen bg-background">
      <MultilingualSEO title={TITLE} description={DESCRIPTION} keywords={KEYWORDS} path={PATH} />
      <StructuredData
        breadcrumbs={[
          { name: "Home", url: "https://www.azizahomes.com" },
          { name: "Investor Furnishing Dubai", url: `https://www.azizahomes.com${PATH}` },
        ]}
        pageTitle="Dubai Apartment Furnishing for Investors"
        pageDescription={DESCRIPTION}
      />
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(serviceSchema)}</script>
      </Helmet>
      <Navigation />

      {/* Hero */}
      <section className="relative pt-24 pb-12 md:pb-20 overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <img src={hero} alt="Premium furnished Dubai apartment with skyline view" width={1920} height={1080} fetchPriority="high" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/85 to-background" />
        </div>
        <div className="container mx-auto px-4 pt-4">
          <BreadcrumbNav items={[{ label: "Investor Furnishing Dubai" }]} />
        </div>
        <div className="container mx-auto px-4 pt-8 md:pt-16 pb-6 max-w-4xl text-center">
          <span className="inline-block px-4 py-1 bg-primary/10 text-primary rounded-full text-xs md:text-sm font-medium mb-5 tracking-wide uppercase">
            For Dubai Investors & Landlords
          </span>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-5 leading-[1.05] tracking-tight">
            Furnish Faster.<br className="hidden sm:block" /> Rent Better. Earn More.
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-4 max-w-2xl mx-auto">
            Turnkey furnishing packages for Dubai investors, landlords, and holiday-home owners who want their apartment ready to list, lease, and perform.
          </p>
          <p className="text-sm md:text-base text-muted-foreground/80 mb-8 max-w-xl mx-auto">
            Studio, 1BR, 2BR and 3BR packages — from design direction to sourcing, delivery, installation, styling and handover.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
            <CTA label="Get Investor Package Guide on WhatsApp" tracking="cta_hero_whatsapp_investor_guide" />
            <a href="#portfolio">
              <Button size="lg" variant="outline">View Before & After Results</Button>
            </a>
          </div>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs md:text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-primary" /> Dubai-based team</span>
            <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-primary" /> Investor-focused packages</span>
            <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-primary" /> Standard setup 5–15 business days</span>
          </div>
        </div>
      </section>

      {/* Portfolio Proof */}
      <section id="portfolio" className="py-16 md:py-20 bg-secondary/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10 max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">See How Furnishing Changes the Value Perception of a Property</h2>
            <p className="text-muted-foreground">
              In Dubai's rental market, presentation matters. A well-furnished apartment can look more premium online, attract stronger tenant interest, and help owners position the property more competitively.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 max-w-6xl mx-auto">
            {portfolio.map((img) => (
              <div key={img.label} className="group relative aspect-square overflow-hidden rounded-lg bg-muted">
                <img src={img.src} alt={`${img.label} — furnished by Aziza Home`} loading="lazy" className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                  <span className="text-white text-xs md:text-sm font-medium">{img.label}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <CTA label="Send My Apartment Details on WhatsApp" tracking="cta_portfolio_whatsapp" />
          </div>
        </div>
      </section>

      {/* ROI Education */}
      <section className="py-16 md:py-20">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Furnished Apartments Can Rent Better</h2>
            <div className="max-w-3xl mx-auto text-muted-foreground space-y-3">
              <p>An unfurnished apartment often competes mainly on price. A professionally furnished apartment competes on lifestyle, convenience, and visual appeal.</p>
              <p>Based on selected previous Aziza Home projects, professionally furnished apartments may achieve around <span className="text-foreground font-semibold">15%–20% higher rental positioning</span> for long-term rentals, depending on the building, location, unit condition, market demand, and furnishing quality.</p>
              <p>For holiday homes, design-led furnishing helps your listing stand out on Airbnb and short-term rental platforms, where photos and first impressions strongly influence bookings.</p>
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-5 mb-8">
            {[
              { icon: Camera, title: "Better Photos", desc: "A styled apartment performs better visually on property portals and holiday-home platforms." },
              { icon: Users, title: "Stronger Tenant Appeal", desc: "Move-in-ready homes attract tenants who value convenience and presentation." },
              { icon: Clock, title: "Faster Rental Readiness", desc: "We manage sourcing, delivery, installation, styling, and handover." },
            ].map((c) => (
              <div key={c.title} className="bg-card border border-border rounded-lg p-6">
                <c.icon className="h-6 w-6 text-primary mb-3" />
                <h3 className="font-semibold mb-2">{c.title}</h3>
                <p className="text-sm text-muted-foreground">{c.desc}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground/80 text-center max-w-2xl mx-auto mb-8 italic">
            Rental results are not guaranteed and depend on market conditions, pricing, location, and property management.
          </p>
          <div className="text-center">
            <CTA label="Get Investor Package Guide" tracking="cta_roi_whatsapp" />
          </div>
        </div>
      </section>

      {/* Packages */}
      <section className="py-16 md:py-20 bg-secondary/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Choose the Package That Matches Your Investment Goal</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {packages.map((p) => (
              <div key={p.name} className={`relative bg-card rounded-lg border p-6 flex flex-col ${p.featured ? "border-primary shadow-lg md:-translate-y-2" : "border-border"}`}>
                {p.featured && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-medium bg-primary text-primary-foreground px-3 py-1 rounded-full">
                    MOST POPULAR
                  </span>
                )}
                <h3 className="text-2xl font-semibold mb-1">{p.name}</h3>
                <p className="text-xs uppercase tracking-wide text-primary mb-3">{p.tag}</p>
                <p className="text-sm text-muted-foreground mb-4">{p.desc}</p>
                <ul className="space-y-2 mb-6 flex-1">
                  {p.points.map((pt) => (
                    <li key={pt} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <CTA label="Compare Packages on WhatsApp" tracking="cta_packages_whatsapp" />
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-16 md:py-20">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="text-center mb-8">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">Starting Package Prices</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Final quotation depends on layout, appliance selection, access, scope, and selected package tier.
            </p>
          </div>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm md:text-base">
              <thead className="bg-secondary/50">
                <tr>
                  <th className="text-left p-4 font-semibold">Layout</th>
                  <th className="text-left p-4 font-semibold">Essential</th>
                  <th className="text-left p-4 font-semibold text-primary">Premium</th>
                  <th className="text-left p-4 font-semibold">Luxury</th>
                </tr>
              </thead>
              <tbody>
                {pricing.map((row, i) => (
                  <tr key={row.layout} className={i % 2 ? "bg-card" : "bg-background"}>
                    <td className="p-4 font-medium">{row.layout}</td>
                    <td className="p-4 text-muted-foreground">{row.essential}</td>
                    <td className="p-4">{row.premium}</td>
                    <td className="p-4 text-muted-foreground">{row.luxury}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground mt-4 text-center italic">
            Prices are exclusive of appliances and 5% VAT. Appliance packages are available as an add-on for ready-to-rent and holiday-home setups.
          </p>
          <div className="text-center mt-8">
            <CTA label="Get Full Package Guide on WhatsApp" tracking="cta_pricing_whatsapp" />
          </div>
        </div>
      </section>

      {/* Process */}
      <section className="py-16 md:py-20 bg-secondary/30">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">From Empty Unit to Rental-Ready Home</h2>
          </div>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-5">
            {steps.map((s, i) => (
              <div key={s.title} className="relative bg-card border border-border rounded-lg p-5">
                <div className="flex items-center gap-3 mb-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold">{i + 1}</span>
                  <s.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold mb-1">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <CTA label="Start on WhatsApp" tracking="cta_process_whatsapp" />
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 md:py-20">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold">Investor FAQ</h2>
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

      {/* Final CTA */}
      <section className="py-16 md:py-24 bg-gradient-to-br from-primary/5 via-secondary/30 to-background">
        <div className="container mx-auto px-4 max-w-3xl text-center">
          <h2 className="text-3xl md:text-5xl font-bold mb-5 leading-tight">Ready to Make Your Dubai Apartment Rental-Ready?</h2>
          <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
            Send us your apartment location, layout, rental goal, and timeline. Our team will share the investor package guide and recommend the most suitable option.
          </p>
          <CTA label="Get Investor Package Guide on WhatsApp" tracking="cta_final_whatsapp" />
          <p className="text-xs text-muted-foreground mt-6">
            Studio · 1BR · 2BR · 3BR · Long-term rental · Holiday home · Overseas owners
          </p>
        </div>
      </section>

      {/* Sticky mobile WhatsApp */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-50 p-3 bg-background/95 backdrop-blur-md border-t border-border">
        <a
          href={waLink("cta_sticky_mobile_whatsapp")}
          target="_blank"
          rel="noopener noreferrer"
          data-cta="cta_sticky_mobile_whatsapp"
          onClick={() => trackWhatsAppClick("cta_sticky_mobile_whatsapp", "Get Package Guide")}
          onAuxClick={() => trackWhatsAppClick("cta_sticky_mobile_whatsapp", "Get Package Guide")}
        >
          <Button size="lg" className="w-full">
            <MessageCircle className="mr-2 h-5 w-5" />
            Get Package Guide
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </a>
      </div>
      <div className="md:hidden h-20" aria-hidden="true" />

      <Footer />
    </div>
  );
};

export default InvestorsFurnishingDubai;