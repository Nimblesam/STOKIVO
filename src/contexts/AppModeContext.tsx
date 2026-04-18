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

  // Check URL param first (?mode=pos)
  const params = new URLSearchParams(window.location.search);
  const urlMode = params.get("mode");
  if (urlMode === "pos") return "pos";
  if (urlMode === "full") return "full";

  // Check localStorage override
  const stored = localStorage.getItem("stokivo_app_mode");
  if (stored === "pos") return "pos";
  if (stored === "full") return "full";

  // Check if running in Electron (desktop app)
  if ((window as any).electronAPI || / Electron\//i.test(ua)) return "pos";

  // Check if running inside Capacitor/Cordova (native mobile shell)
  if ((window as any).Capacitor || (window as any).cordova) return "pos";

  // Check if running inside an Android WebView (APK using WebView to load the site).
  // Android WebView UA contains "; wv)" — distinct from Chrome on Android.
  const isAndroidWebView = /Android/i.test(ua) && /\bwv\b/i.test(ua);
  if (isAndroidWebView) return "pos";

  // Custom UA marker we can inject from the APK shell for unambiguous detection
  if (/Stokivo(POS)?\//i.test(ua)) return "pos";

  // NOTE: We intentionally do NOT auto-switch to POS mode for standalone PWA on
  // mobile. Mobile web visitors (including those who added stokivo.com to their
  // home screen) should still see the marketing/landing site. POS mode is only
  // for the native app shells (Electron/Capacitor/Android WebView/custom UA) or
  // explicit ?mode=pos / localStorage override above.

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
