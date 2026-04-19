import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.Stokivo.app',
  appName: 'Stokivo',
  webDir: 'dist',
  server: {
    androidScheme: 'capacitor', // The most compatible scheme for old Android 7 devices
    allowNavigation: ['*']
  },
  plugins: {
    Sunmi: {
      // Enables custom SunmiPlugin registered in MainActivity.java
    },
  },
};

export default config;
