import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor config — Android (Sunmi) build.
 *
 * IMPORTANT:
 *  - No `server.url` is set, so the app loads the bundled `dist/` assets.
 *    This makes the POS work offline and lets AppModeContext detect the
 *    native shell (Capacitor.isNativePlatform() === true) → POS mode.
 *  - `androidScheme: "https"` is the Capacitor default; required for modern
 *    WebView APIs (service workers, secure cookies for Supabase auth).
 */
const config: CapacitorConfig = {
  appId: 'com.Stokivo.app',
  appName: 'Stokivo',
  webDir: 'dist',
  android: {
    allowMixedContent: true,
  },
  plugins: {
    Sunmi: {
      // Custom SunmiPlugin registered in MainActivity.java
    },
  },
};

export default config;
