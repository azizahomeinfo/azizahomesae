import { ArrowRight, Check, MessageCircle, MapPin, Users, Clock, Send, Palette, Package, Sparkles, Building2 } from "lucide-react";
import { useParams, Link, Navigate } from "react-router-dom";
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
import { getLocationPage, locationPages, locationPricing } from "@/data/locationPages";

const BASE_URL = "https://www.azizahomes.com";
const WA_BASE = "https://wa.me/971559779635";

const steps = [
  { icon: Send, title: "Send Apartment Details", desc: "Location, layout, timeline, and rental goal." },
  { icon: Palette, title: "Choose Package & Design", desc: "Essential, Premium, or Luxury direction." },
  { icon: Package, title: "We Furnish and Style", desc: "Sourcing, delivery, installation, styling, handover." },
  { icon: Sparkles, title: "List, Lease, or Move In", desc: "Ready for rental, holiday home, or your own home." },
];

// Lightweight conversion tracking (gtag + dataLayer), same event shape as
// the investor landing page so reports aggregate cleanly.
const trackWhatsAppClick = (tracking: string, label: string, pagePath: string) => {
  if (typeof window === "undefined") return;
  const w = window as any;
  const payload = { cta_id: tracking, cta_label: label, page_path: pagePath, destination: "whatsapp" };
  try {
    if (typeof w.gtag === "function") {
      w.gtag("event", "whatsapp_click", { ...payload, event_category: "engagement", event_label: tracking, transport_type: "beacon" });
    }
    w.dataLayer = w.dataLayer || [];
    w.dataLayer.push({ event: "whatsapp_click", ...payload });
  } catch (_) { /* never block navigation */ }
};

const LocationFurnishing = () => {
  const { slug } = useParams<{ slug: string }>();
  const page = getLocationPage(slug);

  if (!page) {
    return <Navigate to="/404" replace />;
  }

  const PATH = `/furnishing/${page.slug}`;
  const waMsg = encodeURIComponent(`Hi, I would like to furnish my property in ${page.areaName}!`);
  const waLink = `${WA_BASE}?text=${waMsg}`;

  const CTA = ({ label, tracking, variant = "default" as const }: { label: string; tracking: string; variant?: "default" | "outline" }) => (
    <a
      href={waLink}
      target="_blank"
      rel="noopener noreferrer"
      data-cta={tracking}
      aria-label={label}
      onClick={() => trackWhatsAppClick(tracking, label, PATH)}
      onAuxClick={() => trackWhatsAppClick(tracking, label, PATH)}
    >
      <Button size="lg" variant={variant}>
        <MessageCircle className="mr-2 h-4 w-4" />
        {label}
      </Button>
    </a>
  );

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: page.faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    serviceType: `Apartment Furnishing in ${page.areaName}`,
    provider: {
      "@type": "LocalBusiness",
      name: "Aziza Home",
      url: BASE_URL,
    },
    areaServed: {
      "@type": "Place",
      name: `${page.areaName}, Dubai, United Arab Emirates`,
    },
    description: page.metaDescription,
    offers: locationPricing.map((p) => ({
      "@type": "Offer",
      name: `${p.layout} Furnishing Package — ${page.areaName}`,
      priceCurrency: "AED",
      price: p.essential.replace(/[^0-9.]/g, ""),
    })),
  };

  const nearbyPages = page.nearby
    .map((s) => locationPages.find((p) => p.slug === s))
    .filter(Boolean) as typeof locationPages;

  return (
    <div className="min-h-screen bg-background">
      <MultilingualSEO title={page.title} description={page.metaDescription} keywords={page.keywords} path={PATH} />
      <StructuredData
        breadcrumbs={[
          { name: "Home", url: BASE_URL },
          { name: "Furnishing", url: `${BASE_URL}/services` },
          { name: page.areaName, url: `${BASE_URL}${PATH}` },
        ]}
        pageTitle={page.h1}
        pageDescription={page.metaDescription}
      />
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(serviceSchema)}</script>
      </Helmet>
      <Navigation />

      {/* Hero */}
      <section className="relative pt-24 pb-12 md:pb-20 overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <img src={page.heroImage} alt={page.heroAlt} width={1920} height={1080} fetchPriority="high" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/85 to-background" />
        </div>
        <div className="container mx-auto px-4 pt-4">
          <BreadcrumbNav items={[{ label: page.areaName }]} />
        </div>
        <div className="container mx-auto px-4 pt-8 md:pt-16 pb-6 max-w-4xl text-center">
          <span className="inline-block px-4 py-1 bg-primary/10 text-primary rounded-full text-xs md:text-sm font-medium mb-5 tracking-wide uppercase">
            {page.badge}
          </span>
          <h1 className="text-4xl md:text-6xl font-bold mb-5 leading-[1.05] tracking-tight">{page.h1}</h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">{page.subtitle}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
            <CTA label={`Furnish My ${page.areaName.split(" (")[0]} Property`} tracking="cta_hero_whatsapp_location" />
            <Link to="/packages">
              <Button size="lg" variant="outline">View All Packages</Button>
            </Link>
          </div>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs md:text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-primary" /> Dubai-based team</span>
            <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-primary" /> Remote-friendly for overseas owners</span>
            <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-primary" /> Standard setup 5–15 business days</span>
          </div>
        </div>
      </section>

      {/* Area context */}
      <section className="py-16 md:py-20">
        <div className="container mx-auto px-4 max-w-3xl">
          <h2 className="text-3xl md:text-4xl font-bold mb-6 text-center">Furnishing in {page.areaName}</h2>
          <div className="text-muted-foreground space-y-4">
            {page.intro.map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>
        </div>
      </section>

      {/* Why furnish here */}
      <section className="py-16 md:py-20 bg-secondary/30">
        <div className="container mx-auto px-4 max-w-5xl">
          <h2 className="text-3xl md:text-4xl font-bold mb-10 text-center">Why Furnish in {page.areaName}?</h2>
          <div className="grid md:grid-cols-3 gap-5">
            {page.whyFurnish.map((c) => (
              <div key={c.title} className="bg-card border border-border rounded-lg p-6">
                <Check className="h-6 w-6 text-primary mb-3" />
                <h3 className="font-semibold mb-2">{c.title}</h3>
                <p className="text-sm text-muted-foreground">{c.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 bg-card border border-border rounded-lg p-6">
            <div className="flex items-center gap-2 mb-3">
              <Building2 className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Communities & towers we furnish in {page.areaName}</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              {page.popularBuildings.join(" · ")} — and all other buildings in the area.
            </p>
          </div>
          <div className="text-center mt-10">
            <CTA label="Send My Property Details on WhatsApp" tracking="cta_area_whatsapp" />
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-16 md:py-20">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="text-center mb-8">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">Starting Package Prices</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              The same transparent package pricing applies across Dubai — final quotation depends on layout, appliance selection, access, and scope.
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
                {locationPricing.map((row, i) => (
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
            Prices are exclusive of appliances and 5% VAT. Appliance packages are available as an add-on.
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
            <h2 className="text-3xl md:text-4xl font-bold mb-3">From Empty Unit to Ready Home in {page.areaName}</h2>
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
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 md:py-20">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold">{page.areaName} Furnishing FAQ</h2>
          </div>
          <Accordion type="single" collapsible className="w-full">
            {page.faqs.map((f, i) => (
              <AccordionItem key={i} value={`item-${i}`}>
                <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Internal links: related areas + blog */}
      <section className="py-16 md:py-20 bg-secondary/30">
        <div className="container mx-auto px-4 max-w-5xl">
          <h2 className="text-2xl md:text-3xl font-bold mb-8 text-center">We Also Furnish Nearby</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {nearbyPages.map((n) => (
              <Link
                key={n.slug}
                to={`/furnishing/${n.slug}`}
                className="group bg-card border border-border rounded-lg p-5 hover:border-primary transition-colors"
              >
                <h3 className="font-semibold mb-1 group-hover:text-primary transition-colors">{n.areaName}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2">{n.subtitle}</p>
                <span className="inline-flex items-center text-sm text-primary mt-3">
                  Furnishing in {n.areaName.split(" (")[0]} <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </span>
              </Link>
            ))}
          </div>
          {page.relatedBlog && (
            <p className="text-center mt-8 text-sm text-muted-foreground">
              Related reading:{" "}
              <Link to={page.relatedBlog.href} className="text-primary underline underline-offset-4">
                {page.relatedBlog.title}
              </Link>
            </p>
          )}
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 md:py-24 bg-gradient-to-br from-primary/5 via-secondary/30 to-background">
        <div className="container mx-auto px-4 max-w-3xl text-center">
          <h2 className="text-3xl md:text-5xl font-bold mb-5 leading-tight">
            Ready to Furnish Your {page.areaName.split(" (")[0]} Property?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
            Send us your building, layout, and timeline. Our team will recommend the right package and share the full guide.
          </p>
          <CTA label="Start on WhatsApp" tracking="cta_final_whatsapp" />
          <p className="text-xs text-muted-foreground mt-6">
            Studio · 1BR · 2BR · 3BR · Townhouses & villas · Long-term rental · Holiday home · Overseas owners
          </p>
        </div>
      </section>

      {/* Sticky mobile WhatsApp */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-50 p-3 bg-background/95 backdrop-blur-md border-t border-border">
        <a
          href={waLink}
          target="_blank"
          rel="noopener noreferrer"
          data-cta="cta_sticky_mobile_whatsapp"
          onClick={() => trackWhatsAppClick("cta_sticky_mobile_whatsapp", "Get Package Guide", PATH)}
          onAuxClick={() => trackWhatsAppClick("cta_sticky_mobile_whatsapp", "Get Package Guide", PATH)}
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

export default LocationFurnishing;
