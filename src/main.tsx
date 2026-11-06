import { createRoot, hydrateRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";
import "./i18n/config";

const root = document.getElementById("root")!;
const app = (
  <HelmetProvider>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </HelmetProvider>
);

/**
 * Hydrate only the page that was actually pre-rendered for this URL. dist/index.html is both the
 * homepage and the SPA fallback, so /workspace (and any route without its own file) arrives carrying
 * the marketing homepage's markup; hydrating that fails the mismatch check, React discards the whole
 * tree and re-renders — which looks like the page breaking on a hard refresh. prerender.js stamps
 * each file with the route it belongs to, so the comparison is exact.
 */
const tidy = (p: string) => (p.length > 1 ? p.replace(/\/+$/, "") : p);
const prerenderedFor = document.querySelector('meta[name="prerendered-path"]')?.getAttribute("content");
const isOwnPage = !!prerenderedFor && tidy(prerenderedFor) === tidy(window.location.pathname);

if (import.meta.env.PROD && isOwnPage && root.innerHTML.trim().length > 0) {
  hydrateRoot(root, app);
} else {
  root.innerHTML = ""; // drop another page's markup before mounting, so nothing flashes
  createRoot(root).render(app);
}
