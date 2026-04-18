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
  if (typeof window === "undefined") return "full";

  const ua = navigator.userAgent || "";

  // Detect native shells (Electron desktop app, Capacitor/Cordova mobile, Android WebView, custom UA marker).
  const isElectron = !!(window as any).electronAPI || / Electron\//i.test(ua);
  const isCapacitor = !!(window as any).Capacitor || !!(window as any).cordova;
  const isAndroidWebView = /Android/i.test(ua) && /\bwv\b/i.test(ua);
  const hasStokivoUA = /Stokivo(POS)?\//i.test(ua);
  const isNativeShell = isElectron || isCapacitor || isAndroidWebView || hasStokivoUA;

  // URL param override (?mode=pos / ?mode=full) — works everywhere for manual testing.
  const params = new URLSearchParams(window.location.search);
  const urlMode = params.get("mode");
  if (urlMode === "pos") return "pos";
  if (urlMode === "full") return "full";

  // localStorage override — ONLY honored inside native shells. On regular web browsers
  // (stokivo.com / *.lovable.app), we ignore any stale "pos" value left over from
  // previous testing so the public marketing/landing site always loads.
  if (isNativeShell) {
    const stored = localStorage.getItem("stokivo_app_mode");
    if (stored === "pos") return "pos";
    if (stored === "full") return "full";
    // Default for native shells = POS
    return "pos";
  }

  // Regular web browser → always FULL mode (landing/marketing/business app).
  // Do not auto-switch to POS for PWA / mobile / standalone — those visitors should
  // still see the landing page.
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
