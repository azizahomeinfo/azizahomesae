import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
      },
      output: {
        assetFileNames: (assetInfo) => {
          // Keep sitemap.xml, robots.txt, llms.txt and _headers in root without hashing
          if (assetInfo.name === 'sitemap.xml' || assetInfo.name === 'robots.txt' || assetInfo.name === 'llms.txt' || assetInfo.name === '_headers') {
            return '[name][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        },
      },
    },
    assetsInlineLimit: 0,
    copyPublicDir: true,
  },
  publicDir: 'public',
  ssr: {
    noExternal: ['react-helmet-async', 'lucide-react', 'zustand', '@supabase/supabase-js', 'hls.js'],
  },
}));
