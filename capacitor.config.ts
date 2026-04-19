import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.Stokivo.app',
  appName: 'Stokivo',
  webDir: 'dist',
  server: {
    androidScheme: 'https', // Reverting to https for bridge stability
    allowNavigation: ['*']
  },
  plugins: {
    Sunmi: {
      // Enables custom SunmiPlugin registered in MainActivity.java
    },
  },
};

export default config;
