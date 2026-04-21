import { createContext, useContext, useState, type ReactNode } from "react";

export type AppMode = "full" | "pos";

interface AppModeContextValue {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
  isFullMode: boolean;
  isPosMode: boolean;
  isNativeShell: boolean;
}

const AppModeContext = createContext<AppModeContextValue | undefined>(undefined);

function detectNativeShell(): boolean {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent || "";
  const isElectron = !!(window as any).electronAPI || / Electron\//i.test(ua);
  const capacitor = (window as any).Capacitor;
  const capacitorPlatform = typeof capacitor?.getPlatform === "function" ? capacitor.getPlatform() : undefined;
  const isCapacitorNative = typeof capacitor?.isNativePlatform === "function"
    ? capacitor.isNativePlatform()
    : !!capacitor && !!capacitorPlatform && capacitorPlatform !== "web";
  const isCapacitor = isCapacitorNative || !!(window as any).cordova;
  const isAndroidWebView = /Android/i.test(ua) && /\bwv\b/i.test(ua);
  const hasStokivoUA = /Stokivo(POS)?\//i.test(ua);
  return isElectron || isCapacitor || isAndroidWebView || hasStokivoUA;
}

function detectMode(): AppMode {
  if (typeof window === "undefined") return "full";

  const isNativeShell = detectNativeShell();

  // URL param override (?mode=pos / ?mode=full) — works everywhere for manual testing.
  const params = new URLSearchParams(window.location.search);
  const urlMode = params.get("mode");
  if (urlMode === "pos") return "pos";
  if (urlMode === "full") return "full";

  // Native shells (Android/Desktop) are LOCKED to POS mode — no Full Mode switching.
  if (isNativeShell) return "pos";

  // Regular web browser → always FULL mode (landing/marketing/business app).
  return "full";
}

export function AppModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<AppMode>(detectMode);
  const [isNativeShell] = useState<boolean>(detectNativeShell);

  const setMode = (newMode: AppMode) => {
    // Native shells (Android/Desktop) cannot leave POS mode.
    if (isNativeShell && newMode === "full") return;
    localStorage.setItem("stokivo_app_mode", newMode);
    setModeState(newMode);
  };

  const value: AppModeContextValue = {
    mode,
    setMode,
    isFullMode: mode === "full",
    isPosMode: mode === "pos",
    isNativeShell,
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
