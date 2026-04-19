import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.Stokivo.app',
  appName: 'Stokivo',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    hostname: 'localhost', // Force correct spelling to override any hidden 'locahost' typo
    allowNavigation: ['*']
  },
  plugins: {
    Sunmi: {
      // Enables custom SunmiPlugin registered in MainActivity.java
    },
  },
};

export default config;
