import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import legacy from "@vitejs/plugin-legacy";

export default defineConfig(({ mode }) => ({
  build: {
    target: "es2015", // Polyfill for modern JS
    outDir: "dist",
    assetsDir: "assets",
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        manualChunks: undefined, // Simpler bundling for old devices
      },
    },
  },
  base: "./",

  plugins: [
    react(),
    legacy({
      targets: ["chrome >= 52", "android >= 7"], // Specifically target Sunmi V2 Pro / Android 7.1
      additionalLegacyPolyfills: ["regenerator-runtime/runtime"],
      renderLegacyChunks: true,
      polyfills: [
        "es.promise.finally",
        "es.array.flat",
        "es.array.flat-map",
        "es.object.from-entries",
        "es.string.replace-all",
        "web.dom-collections.for-each"
      ],
    }),
    mode === "development" && componentTagger()
  ].filter(Boolean),

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));

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