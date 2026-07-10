import { ArrowRight, MessageCircle, MapPin, Package, Clock, Building2 } from "lucide-react";
import { useParams, Link, Navigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import BreadcrumbNav from "@/components/BreadcrumbNav";
import StructuredData from "@/components/StructuredData";
import { MultilingualSEO } from "@/components/MultilingualSEO";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { getCaseStudy, caseStudies } from "@/data/caseStudies";
import { locationPages } from "@/data/locationPages";

const BASE_URL = "https://www.azizahomes.com";
const WA_BASE = "https://wa.me/971559779635";

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

const CaseStudy = () => {
  const { slug } = useParams<{ slug: string }>();
  const project = getCaseStudy(slug);

  if (!project) {
    return <Navigate to="/portfolio" replace />;
  }

  const PATH = `/portfolio/${project.slug}`;
  const waMsg = encodeURIComponent(`Hi, I saw your ${project.building} project and would like a similar furnishing for my property!`);
  const waLink = `${WA_BASE}?text=${waMsg}`;
  const hero = project.images[project.heroIndex];
  const areaPage = project.areaSlug ? locationPages.find((p) => p.slug === project.areaSlug) : undefined;
  const otherProjects = caseStudies.filter((c) => c.slug !== project.slug).slice(0, 3);

  const CTA = ({ label, tracking }: { label: string; tracking: string }) => (
    <a
      href={waLink}
      target="_blank"
      rel="noopener noreferrer"
      data-cta={tracking}
      aria-label={label}
      onClick={() => trackWhatsAppClick(tracking, label, PATH)}
      onAuxClick={() => trackWhatsAppClick(tracking, label, PATH)}
    >
      <Button size="lg">
        <MessageCircle className="mr-2 h-4 w-4" />
        {label}
      </Button>
    </a>
  );

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `${project.building} — ${project.packageTier} Furnishing Project`,
    image: project.images.map((i) => `${BASE_URL}${i.src}`),
    author: { "@type": "Organization", name: "Aziza Home", url: BASE_URL },
    publisher: {
      "@type": "Organization",
      name: "Aziza Home",
      logo: { "@type": "ImageObject", url: `${BASE_URL}/aziza-logo.png` },
    },
    description: project.metaDescription,
    mainEntityOfPage: { "@type": "WebPage", "@id": `${BASE_URL}${PATH}` },
  };

  return (
    <div className="min-h-screen bg-background">
      <MultilingualSEO title={project.title} description={project.metaDescription} keywords={project.keywords} path={PATH} />
      <StructuredData
        breadcrumbs={[
          { name: "Home", url: BASE_URL },
          { name: "Portfolio", url: `${BASE_URL}/portfolio` },
          { name: project.building, url: `${BASE_URL}${PATH}` },
        ]}
        pageTitle={project.h1}
        pageDescription={project.metaDescription}
      />
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(articleSchema)}</script>
      </Helmet>
      <Navigation />

      {/* Hero */}
      <section className="relative pt-24 pb-12 md:pb-16 overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <img src={hero.src} alt={hero.alt} width={1920} height={1080} fetchPriority="high" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/80 to-background" />
        </div>
        <div className="container mx-auto px-4 pt-4">
          <BreadcrumbNav items={[{ label: "Portfolio", href: "/portfolio" }, { label: project.building }]} />
        </div>
        <div className="container mx-auto px-4 pt-8 md:pt-14 pb-6 max-w-4xl text-center">
          <span className="inline-block px-4 py-1 bg-primary/10 text-primary rounded-full text-xs md:text-sm font-medium mb-5 tracking-wide uppercase">
            Real Project · {project.packageTier} Package
          </span>
          <h1 className="text-4xl md:text-6xl font-bold mb-4 leading-[1.05] tracking-tight">{project.h1}</h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">{project.subtitle}</p>
          <CTA label="Get a Similar Setup" tracking="cta_hero_whatsapp_case" />
        </div>
      </section>

      {/* Project facts */}
      <section className="py-8 border-y border-border bg-secondary/30">
        <div className="container mx-auto px-4 max-w-4xl">
          <dl className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <dt className="flex items-center justify-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground mb-1"><Building2 className="h-3.5 w-3.5" /> Building</dt>
              <dd className="font-semibold text-sm md:text-base">{project.building}</dd>
            </div>
            <div>
              <dt className="flex items-center justify-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground mb-1"><MapPin className="h-3.5 w-3.5" /> Area</dt>
              <dd className="font-semibold text-sm md:text-base">{project.area}</dd>
            </div>
            <div>
              <dt className="flex items-center justify-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground mb-1"><Package className="h-3.5 w-3.5" /> Package</dt>
              <dd className="font-semibold text-sm md:text-base">{project.packageTier}</dd>
            </div>
            <div>
              <dt className="flex items-center justify-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground mb-1"><Clock className="h-3.5 w-3.5" /> Timeline</dt>
              <dd className="font-semibold text-sm md:text-base">{project.timeline}</dd>
            </div>
          </dl>
        </div>
      </section>

      {/* Narrative + gallery interleaved */}
      <section className="py-16 md:py-20">
        <div className="container mx-auto px-4 max-w-3xl space-y-12">
          {project.sections.map((s, idx) => (
            <div key={s.heading} className="space-y-4">
              <h2 className="text-2xl md:text-3xl font-bold">{s.heading}</h2>
              {s.paragraphs.map((p, i) => (
                <p key={i} className="text-muted-foreground">{p}</p>
              ))}
              {project.images[idx + 1] && (
                <figure className="pt-2">
                  <img
                    src={project.images[idx + 1].src}
                    alt={project.images[idx + 1].alt}
                    loading="lazy"
                    className="w-full rounded-lg border border-border"
                  />
                  <figcaption className="text-xs text-muted-foreground mt-2 text-center italic">
                    {project.images[idx + 1].caption}
                  </figcaption>
                </figure>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Cross-links */}
      <section className="py-16 md:py-20 bg-secondary/30">
        <div className="container mx-auto px-4 max-w-4xl text-center space-y-8">
          <h2 className="text-2xl md:text-3xl font-bold">Want This for Your Property?</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            This project used our {project.packageTier} package. Send us your building and layout on WhatsApp and we'll recommend the right tier and share the full guide with pricing.
          </p>
          <CTA label="Start My Project on WhatsApp" tracking="cta_final_whatsapp_case" />
          <div className="flex flex-wrap justify-center gap-4 pt-4 text-sm">
            <Link to="/packages" className="text-primary underline underline-offset-4">View all packages</Link>
            {areaPage && (
              <Link to={`/furnishing/${areaPage.slug}`} className="text-primary underline underline-offset-4">
                Furnishing in {areaPage.areaName}
              </Link>
            )}
            <Link to="/portfolio" className="text-primary underline underline-offset-4">More projects</Link>
          </div>
          {otherProjects.length > 0 && (
            <div className="grid sm:grid-cols-3 gap-4 pt-6 text-left">
              {otherProjects.map((c) => (
                <Link key={c.slug} to={`/portfolio/${c.slug}`} className="group bg-card border border-border rounded-lg p-5 hover:border-primary transition-colors">
                  <h3 className="font-semibold mb-1 group-hover:text-primary transition-colors">{c.building}</h3>
                  <p className="text-sm text-muted-foreground">{c.packageTier} package · {c.timeline}</p>
                  <span className="inline-flex items-center text-sm text-primary mt-3">
                    View project <ArrowRight className="ml-1 h-3.5 w-3.5" />
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default CaseStudy;
