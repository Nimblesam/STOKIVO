import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

export type AppMode = "full" | "pos";

interface AppModeContextValue {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
  isFullMode: boolean;
  isPosMode: boolean;
}

const AppModeContext = createContext<AppModeContextValue | undefined>(undefined);

function detectMode(): AppMode {
  // Check URL param first (?mode=pos)
  const params = new URLSearchParams(window.location.search);
  const urlMode = params.get("mode");
  if (urlMode === "pos") return "pos";

  // Check localStorage override
  const stored = localStorage.getItem("stokivo_app_mode");
  if (stored === "pos") return "pos";

  // Check if running in Electron
  if (typeof window !== "undefined" && (window as any).electronAPI) return "pos";

  // Check if standalone PWA on mobile
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches
    || (navigator as any).standalone === true;
  const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent);
  if (isStandalone && isMobile) return "pos";

  return "full";
}

export function AppModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<AppMode>(detectMode);

  const setMode = (newMode: AppMode) => {
    localStorage.setItem("stokivo_app_mode", newMode);
    setModeState(newMode);
  };

  const value: AppModeContextValue = {
    mode,
    setMode,
    isFullMode: mode === "full",
    isPosMode: mode === "pos",
  };

  return (
    <AppModeContext.Provider value={value}>
      {children}
    </AppModeContext.Provider>
  );
}

export function useAppMode() {
  const ctx = useContext(AppModeContext);
  if (!ctx) throw new Error("useAppMode must be used within AppModeProvider");
  return ctx;
}
