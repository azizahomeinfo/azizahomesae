import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import ProductDetail from "./pages/ProductDetail";
import ProjectGallery from "./pages/ProjectGallery";
import PackagesOverview from "./pages/PackagesOverview";
import Services from "./pages/Services";
import Auth from "./pages/Auth";
import AboutUs from "./pages/AboutUs";
import ContactPage from "./pages/ContactPage";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import SeoStatus from "./pages/SeoStatus";
import MinimalistApartmentDubai from "./pages/MinimalistApartmentDubai";
import InvestorsFurnishingDubai from "./pages/InvestorsFurnishingDubai";
import LocationFurnishing from "./pages/LocationFurnishing";
import IntentFurnishing from "./pages/IntentFurnishing";
import CaseStudy from "./pages/CaseStudy";
import { lazy, Suspense } from "react";

/**
 * Publishing replaces the hashed bundles and DELETES the old ones, so a tab opened before a deploy
 * gets a 404 the moment it finally imports the workspace: "Failed to fetch dynamically imported
 * module", and the screen simply never arrives (Veronica, 2026-11-05: "cannot reach the workflow,
 * fail to catch" — four deploys that day). UpdateNotice only asks the person to reload, and only
 * every few minutes, so it cannot catch a navigation in between. The cure is the one the browser
 * needs anyway: fetch the new index. Reload once, remembered for the tab so a genuinely broken
 * build (or being offline) shows the error instead of looping.
 */
const RELOADED = "ws.stale-chunk-reload";
const freshChunk = <T,>(load: () => Promise<T>): Promise<T> =>
  load().then((m) => {
    try { sessionStorage.removeItem(RELOADED); } catch { /* private window: nothing to clear */ }
    return m;
  }).catch((err) => {
    let retried = true;
    try {
      retried = sessionStorage.getItem(RELOADED) === "1";
      if (!retried) sessionStorage.setItem(RELOADED, "1");
    } catch { retried = true; } // can't remember: never reload, show the error
    if (retried) throw err;
    window.location.reload();
    return new Promise<T>(() => {}); // the reload takes over; never resolve
  });

const Workspace = lazy(() => freshChunk(() => import("./workspace/WorkspaceApp")));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/services" element={<Services />} />
        <Route path="/about" element={<AboutUs />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/blog/:slug" element={<BlogPost />} />
        <Route path="/portfolio" element={<ProjectGallery />} />
        <Route path="/portfolio/:slug" element={<CaseStudy />} />
        <Route path="/packages" element={<PackagesOverview />} />
        <Route path="/product/:handle" element={<ProductDetail />} />
        <Route path="/seo-status" element={<SeoStatus />} />
        <Route path="/minimalist-apartment-furnishing-dubai" element={<MinimalistApartmentDubai />} />
        <Route path="/investors-furnishing-dubai" element={<InvestorsFurnishingDubai />} />
        <Route path="/furnishing/:slug" element={<LocationFurnishing />} />
        <Route path="/holiday-home-furnishing-dubai" element={<IntentFurnishing />} />
        <Route path="/villa-furnishing-dubai" element={<IntentFurnishing />} />
        <Route path="/workspace/*" element={
          <Suspense fallback={null}><Workspace /></Suspense>
        } />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
