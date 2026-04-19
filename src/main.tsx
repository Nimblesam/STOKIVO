import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initOfflineSync } from "./lib/offline-store";
import { supabase } from "./integrations/supabase/client";

// POLYFILLS for older Android WebViews (Sunmi V2 Pro)
import ResizeObserver from 'resize-observer-polyfill';
if (typeof window !== 'undefined' && !window.ResizeObserver) {
  window.ResizeObserver = ResizeObserver;
}

// Fix for global not defined in some environments
if (typeof global === 'undefined') {
  (window as any).global = window;
}

// Initialize offline sync system
initOfflineSync(supabase);

const root = createRoot(document.getElementById("root")!);
root.render(<App />);
