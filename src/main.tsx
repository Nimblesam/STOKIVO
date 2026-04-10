import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initOfflineSync } from "./lib/offline-store";
import { supabase } from "./integrations/supabase/client";

// Initialize offline sync system
initOfflineSync(supabase);

const root = createRoot(document.getElementById("root")!);
root.render(<App />);
