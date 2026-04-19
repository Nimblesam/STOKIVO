import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.Stokivo.app',
  appName: 'Stokivo',
  webDir: 'dist',
  server: {
    androidScheme: 'http',
    hostname: 'app', // Using 'app' instead of 'localhost' to bypass loopback restrictions
    allowNavigation: ['*']
  },
  plugins: {
    Sunmi: {
      // Enables custom SunmiPlugin registered in MainActivity.java
    },
  },
};

export default config;
