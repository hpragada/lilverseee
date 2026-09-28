import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.lilverse.app',
  appName: 'Lilverse',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
