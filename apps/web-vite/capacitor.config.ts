import type { CapacitorConfig } from '@capacitor/cli';

// Settings for the phone app (Android now, iPhone later). The phone app is this same web app, built into
// `dist/` and shown inside a native shell.
//
// CAP_DEV=1 is for testing against a local API over plain http (for example from the Android emulator).
// Never use it for a build you share: real builds talk to the API over https only.
const dev = process.env.CAP_DEV === '1';

const config: CapacitorConfig = {
  // The app id identifies the app to Google Play and the App Store and can NOT be changed after the first
  // store release. Change it now if you want your own name (letters, dots, no spaces), then run `cap sync`.
  appId: 'com.familyexpense.tracker',
  appName: 'Family Expense Tracker',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: dev,
  },
  android: {
    allowMixedContent: dev,
  },
  plugins: {
    SplashScreen: {
      // Hidden from the app code once the first screen is ready (see src/native.ts).
      launchAutoHide: false,
      backgroundColor: '#f5f8ff',
      showSpinner: false,
    },
    Keyboard: {
      // Shrink the page when the keyboard opens, so the focused field stays visible.
      resize: 'body',
    },
  },
};

export default config;
