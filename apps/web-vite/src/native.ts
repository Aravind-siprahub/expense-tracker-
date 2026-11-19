// Everything that only matters inside the phone app (Capacitor). On the website each of these is a no-op,
// so the same code runs in both places.
import { Capacitor } from '@capacitor/core';
import type { AsyncStore } from './app/_lib/tokenStorage';

/** True inside the Android / iPhone app, false in a normal browser. */
export const isNative: boolean = Capacitor.isNativePlatform();

/** True when the phone app's native side lists this plugin (Capacitor puts the list in `PluginHeaders`). */
function hasNativePlugin(name: string): boolean {
  const headers = (Capacitor as unknown as { PluginHeaders?: { name: string }[] }).PluginHeaders;
  return Array.isArray(headers) && headers.some((h) => h.name === name);
}

/**
 * The phone's secure storage (Android Keystore / iPhone Keychain) for the sign-in token. The plugin is loaded
 * only inside the phone app, so the website does not download it.
 */
export async function createSecureStore(): Promise<AsyncStore> {
  // Check the native side really has this plugin BEFORE touching it. If the plugin is missing from the app
  // (for example `cap sync` was not run after adding it), this plugin calls itself forever and freezes the
  // whole page, which a timeout cannot interrupt. Failing here lets the app open instead.
  if (!hasNativePlugin('SecureStorage')) {
    throw new Error('the SecureStorage plugin is not part of this app build: run "yarn cap:sync" and rebuild it');
  }
  const { SecureStorage } = await import('@aparajita/capacitor-secure-storage');
  return {
    async get(key) {
      const value = await SecureStorage.get(key);
      return typeof value === 'string' ? value : null;
    },
    async set(key, value) {
      await SecureStorage.set(key, value);
    },
    async remove(key) {
      await SecureStorage.remove(key);
    },
  };
}

/** Runs one start-up step; a failing plugin must never stop the app from opening. */
async function safely(label: string, step: () => Promise<unknown> | unknown) {
  try {
    await step();
  } catch (e) {
    console.warn(`[native] ${label} failed:`, e);
  }
}

/** Tidies up the phone app: status bar colours, the Android back button, the keyboard, and the splash screen. */
export async function setupNative() {
  if (!isNative) return;
  // Lets the stylesheet add phone-only spacing (for example under the status bar).
  document.documentElement.classList.add('native-app');

  // (The keyboard needs no code: capacitor.config.ts makes the page shrink when it opens.)
  const [{ App }, { StatusBar, Style }, { SplashScreen }] = await Promise.all([
    import('@capacitor/app'),
    import('@capacitor/status-bar'),
    import('@capacitor/splash-screen'),
  ]);

  await safely('status bar', async () => {
    await StatusBar.setStyle({ style: Style.Light }); // dark icons on the light page
    if (Capacitor.getPlatform() === 'android') await StatusBar.setBackgroundColor({ color: '#f5f8ff' });
  });

  await safely('back button', () =>
    // On a screen you can go back from, go back. On the first screen, close the app (like any Android app).
    App.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) window.history.back();
      else void App.exitApp();
    }),
  );

  // Show the app: the splash screen stays up until now (see capacitor.config.ts).
  await safely('splash screen', () => SplashScreen.hide());
}
