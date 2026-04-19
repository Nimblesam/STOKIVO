import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => ({
  build: {
    target: "es2015", // 🔥 Target older devices like Sunmi V2 Pro (Android 7.1/10)
    outDir: "dist",
    assetsDir: "assets",
    cssCodeSplit: false, // Better compatibility for some WebViews
  },
  base: "./",

  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },

  plugins: [
    react(),
    mode === "development" && componentTagger()
  ].filter(Boolean),

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));