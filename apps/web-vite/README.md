# Web app (Vite + React)

The Family Expense Tracker web app, built with Vite, React 19, React Router 7, Tailwind 3 and TanStack Query.
It replaced the old Next.js app and is also what the phone app (Capacitor) will wrap.

## Run it

From the repository root:

```bash
corepack yarn install
corepack yarn workspace @repo/web-vite dev        # http://localhost:5173
corepack yarn workspace @repo/web-vite build      # type check + production build into dist/
corepack yarn workspace @repo/web-vite test       # service worker tests
```

The API must be running (`corepack yarn workspace @repo/backend dev`, port 3001). In development the app finds the API
on the same host at port 3001. To point it elsewhere, set `VITE_API_URL` (see `.env.example`). **Always set it for
production builds and for the phone app**, because the page host is not the API host there.

## How it is organised

- `src/router.tsx` lists every screen. Pages load the first time they are opened.
- `src/app/...` keeps the folder layout the old Next.js app had (`_components`, `_lib`, one folder per page).
- `public/` holds the files served as they are: the icons, `manifest.webmanifest`, `sw.js`, `offline.html`, `offline.js`.
- `vercel.json` holds the single-page-app rewrite, the security headers (including the Content-Security-Policy) and
  the cache rules.

## Things to know

- **Security policy:** the site only allows scripts from itself. Do not add inline `<script>` blocks to `index.html`
  or `offline.html`; put the code in a file instead (that is why `public/offline.js` exists).
- **Service worker:** `public/sw.js` only runs in production builds. To release a new version of it, change `VERSION`.
  It never stores API responses or pages. `tests/sw.test.mjs` checks this.
- **Icons:** the PNG files in `public/` were generated once from the old logo code. To change the logo, replace the PNGs.

## Phone app (Android, with Capacitor)

The phone app is this same web app, built into `dist/` and shown inside a native Android shell. The Android project
is in `android/` (it is source code: commit it). Settings are in `capacitor.config.ts`.

**What is already set up:** the project and its plugins (secure storage for the sign-in token, status bar, back button,
splash screen, keyboard), no service worker or install banner inside the app, backups switched off
(`allowBackup="false"`), and a build that refuses to run without an API address.

**What you need on your computer** (one time): [Android Studio](https://developer.android.com/studio) with its
default SDK. It includes the Java 21 that Android builds need. (A plain Java 8 install, as on some machines, is too
old: let Android Studio's own Java be used.) Allow about 15 GB of free disk space.

### Build and run it

1. Create `apps/web-vite/.env.app.local` from `.env.app.example` and put your live API address in it (https, no
   trailing slash).
2. From the repository root:

   ```bash
   corepack yarn workspace @repo/web-vite cap:sync   # builds the web app for the phone and copies it into android/
   corepack yarn workspace @repo/web-vite cap:open   # opens the project in Android Studio
   ```

3. In Android Studio press Run, and pick an emulator or a phone connected with USB debugging turned on.
   To get an installable file instead: Build, Generate App Bundles or APKs, Build APK(s).

Run `cap:sync` again after every change to the web app or to a Capacitor plugin. **If the app shows a warning that a
plugin "is not part of this app build", you forgot to run it.**

### Testing against your local API from the emulator

The emulator reaches your computer at `10.0.2.2`. Use plain http only for this, and only for your own testing:

```bash
# in .env.app.local:  VITE_API_URL=http://10.0.2.2:3001
CAP_DEV=1 corepack yarn workspace @repo/web-vite cap:sync
```

`CAP_DEV=1` allows plain http inside the app. Never share a build made with it, and run `cap:sync` again without it
before building anything you hand to someone.

### Before a store release

- **App id:** `com.familyexpense.tracker` in `capacitor.config.ts` is permanent once published. Change it first if you
  want your own, then run `cap:sync` (and rename the folder under `android/app/src/main/java` if you used a new id; the
  easiest way is to delete `android/`, run `corepack yarn cap add android` again and re-apply the manifest change below).
- **Icon and splash screen:** the app currently shows Capacitor's default icon. Put a 1024x1024 `assets/icon-only.png`
  and a 2732x2732 `assets/splash.png` in this folder and run `npx @capacitor/assets generate --android`.
- **Version:** raise `versionCode` (and `versionName`) in `android/app/build.gradle` for every release.
- **Signing:** create a keystore in Android Studio (Build, Generate Signed App Bundle). Keep the `.jks` file and its
  passwords in a password manager. It is git-ignored: never commit it, and never lose it, or you cannot update the app.
- **Google Play:** a one-time $25 developer account.
- **If you reset `android/`:** keep `android:allowBackup="false"` in `android/app/src/main/AndroidManifest.xml`.

### iPhone

An iPhone app can only be built on a Mac with Xcode, so it is not set up yet. When you have a Mac: add the package
(`corepack yarn workspace @repo/web-vite add @capacitor/ios`), run `corepack yarn cap add ios`, then open it with
`corepack yarn cap open ios`. Releasing needs an Apple developer account ($99 a year). Until then the installable web
app (see above) already works on iPhones.

### Good to know

- **API access:** the API already accepts the app's addresses (`https://localhost` on Android, `capacitor://localhost`
  on iPhone), because it allows any `localhost` origin. If you ever tighten the API's allowed origins, add those two.
- **Sign-in token:** stored in Android's encrypted storage (Keystore), not in plain browser storage. Other settings
  (dismissed alerts, last category) stay in the app's web storage.
- **Invite links:** a link from an invite email opens the website. Opening it directly in the app needs Android App
  Links (a hosted `assetlinks.json` and an intent filter); this is not set up yet.
- **Status bar spacing:** the app adds spacing under the status bar only if the system does not already do it. Check it
  on a real phone and adjust the `.native-app` rule in `src/index.css` if needed.

## Deploying on Vercel

Everything is set in the Vercel dashboard; the repository needs no change.

1. **Environment variable:** Project, Settings, Environment Variables. Add `VITE_API_URL` = the Render API address
   (no trailing slash), type **Config**, for Production and Preview.
2. **Root directory:** Settings, General, Root Directory: `apps/web-vite`. Keep "Include source files outside of
   the Root Directory" on. The Framework Preset comes from `vercel.json` (Vite).
3. **Redeploy** the latest commit with the build cache turned off.
4. **Check the live site:** log in, add and delete an expense, open the Settings page, reload a deep link such as
   `/budget`, and install the app. Check that the browser console shows no errors.
5. **Roll back if needed:** Deployments, open the last good deployment, Promote to Production.

People who already installed the old app get the new one automatically. The new service worker (version 2)
removes the old Next.js caches the first time it runs.
