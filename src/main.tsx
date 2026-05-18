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

// Only hydrate if the root has pre-rendered content (SSR)
if (import.meta.env.PROD && root.innerHTML.trim().length > 0) {
  hydrateRoot(root, app);
} else {
  createRoot(root).render(app);
}
