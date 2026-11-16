# StackWeave Repository Setup & Technical Audit Report

**Date:** 2026-11-16  
**Repository:** [https://github.com/AmitGharge/stackweave](https://github.com/AmitGharge/stackweave)  
**Evaluated Branch:** `evaluation/baseline`  
**Location:** `e:\Expense Tracker\family-expense-tracker`

---

## Executive Summary
The StackWeave repository has been cloned, configured, and verified. It is a **production-ready full-stack monorepo starter template** (Next.js 15 + Expo 55 + Express + Prisma + Turborepo). 

> [!IMPORTANT]
> The current codebase is a **scaffolding/starter template** containing only boilerplate demo models (`User` and `Post`). **No expense tracker features exist in the repository yet.** Development of features based on `Family_Expense_Tracker_PRD.docx` must begin from this verified baseline.

---

## 1. Repository Structure
```
family-expense-tracker/
├── apps/
│   ├── backend/             # Express.js API server (TypeScript, tsup, tsx)
│   ├── mobile/              # React Native app (Expo 55, NativeWind, Reanimated)
│   └── web/                 # Next.js 15 web app (React 19, TailwindCSS, TanStack Query)
├── packages/
│   ├── api-client/          # Shared TanStack Query client & fetcher wrappers
│   ├── db/                  # Prisma schema, migrations, and singleton client
│   ├── eslint-config/       # Shared ESLint configuration
│   ├── tailwind-config/     # Shared Tailwind theme & colors
│   ├── types/               # Shared TypeScript domain interfaces
│   ├── typescript-config/   # Shared tsconfig bases
│   └── validators/          # Shared Zod validation schemas
├── neon.ts                  # Neon infrastructure-as-code configuration
├── package.json             # Root workspace config (Yarn 4.1.1 + Turborepo)
├── turbo.json               # Pipeline build/lint/dev task orchestration
└── yarn.lock                # Deterministic lockfile (Yarn v8 format)
```

---

## 2. Installed Dependency & Runtime Versions

| Tool / Package | Installed Version | Repository Target | Status |
| :--- | :--- | :--- | :--- |
| **Node.js** | `v24.17.0` | `>= 22.x` | ✅ Compatible |
| **Yarn (Corepack)** | `4.1.1` | `yarn@4.1.1` | ✅ Exact match via Corepack |
| **Global Yarn** | `1.22.22` | N/A | ⚠️ Causes conflicts if invoked directly |
| **Next.js** | `15.5.14` | `^15.1.3` | ✅ Installed |
| **React / React-DOM** | `19.0.0` | `^19.0.0` | ✅ Installed |
| **Expo SDK** | `55.0.11` | `~55.0.11` | ✅ Installed |
| **React Native** | `0.83.0` | `0.83.0` | ✅ Installed |
| **Express** | `4.21.2` | `^4.19.2` | ✅ Installed |
| **Prisma CLI / Client** | `5.22.0` | `^5.13.0` | ✅ Installed & Generated |
| **Turborepo** | `2.9.3` | `^2.9.3` | ✅ Installed |
| **Neon CLI** | `9.5.0` | `latest` | ✅ Installed globally |

---

## 3. Successful Installation Steps
1. **Repository Clone**: Cloned repository and checked out isolated baseline branch:
   ```bash
   git clone https://github.com/AmitGharge/stackweave family-expense-tracker
   git checkout -b evaluation/baseline
   ```
2. **Dependency Resolution**: Installed all monorepo dependencies via Corepack Yarn:
   ```bash
   corepack yarn install
   ```
   *(799 packages added, node_modules linked successfully in 41s).*
3. **Neon Cloud Database Provisioning**:
   - Linked to Neon Project `crimson-recipe-76411541` (branch: `production` in `aws-ap-southeast-1`).
   - Pulled pooled `DATABASE_URL` and unpooled `DATABASE_URL_UNPOOLED` into `.env`.
   - Updated `packages/db/schema.prisma` with `directUrl` for migrations.
   - Pushed schema to Neon PostgreSQL:
     ```bash
     corepack yarn workspace @repo/db db:push
     ```

---

## 4. Successful Build and Test Results

### Production Build (`corepack yarn build`)
- `@repo/backend`: Built with `tsup` in **140ms** (`dist/index.js` generated).
- `@repo/web`: Next.js 15 production build compiled in **7.0s** with 4/4 static pages generated.
- Turborepo result: `Tasks: 2 successful, 2 total`.

### End-to-End API & Database Verification
The backend server was started on port `3001` and tested against live Neon PostgreSQL:

| Endpoint | Method | Payload / Action | Result | Verification Output |
| :--- | :--- | :--- | :--- | :--- |
| `/` | `GET` | Health check | `200 OK` | `"Hello World!"` |
| `/users` | `GET` | Initial database check | `200 OK` | `[]` (Table exists, clean) |
| `/users` | `POST` | `{"name":"Neon Tester","email":"test@neon.tech"}` | `201 Created` | Record inserted with `id: 1` |
| `/posts` | `POST` | `{"title":"Hello Neon","content":"...","authorId":1}` | `201 Created` | Record inserted with foreign key |
| `/posts` | `GET` | Relational query | `200 OK` | Returns post joined with author object |

---

## 5. Failed Commands & Actual Errors

### 1. Direct `yarn` / `npm run build` invocation
- **Command:** `yarn workspace ...` or `npm run build`
- **Error:** `error This project's package.json defines "packageManager": "yarn@4.1.1". However the current global version of Yarn is 1.22.22.`
- **Cause:** Global Yarn 1.22.22 in `D:\npm-global` takes precedence over Corepack unless `corepack yarn` is explicitly invoked.

### 2. ESLint Check (`corepack yarn lint`)
- **Command:** `corepack yarn lint` (`next lint` in `apps/web`)
- **Error:** Prompted interactively: `? How would you like to configure ESLint? Strict / Base` and exited with code 1 in non-interactive shell.
- **Cause:** `apps/web` has no `.eslintrc` or `eslint.config.mjs` initialized for Next.js 15.

### 3. Backend TypeScript Unused Variable Warnings
- **Command:** `tsc --noEmit` in `apps/backend`
- **Errors:**
  - `src/index.ts(16,15): error TS6133: 'req' is declared but its value is never read.`
  - `src/index.ts(22,26): error TS6133: 'req' is declared but its value is never read.`
  - `src/index.ts(60,26): error TS6133: 'req' is declared but its value is never read.`

### 4. Expo Mobile Doctor Check
- **Command:** `npx expo-doctor` in `apps/mobile`
- **Errors:**
  - `Field: android.edgeToEdgeEnabled - Additional property "edgeToEdgeEnabled" is not allowed.`
  - Minor version mismatches: `react-native-reanimated` (`4.3.0` vs expected `4.2.1`), `react-native-worklets` (`0.8.1` vs expected `0.7.4`).

### 5. Web Tailwind ESM `require` Error (Fixed)
- **File:** `apps/web/tailwind.config.ts`
- **Error:** `ReferenceError: require is not defined at tailwind.config.ts:2:22` during dev server hot-reload.
- **Fix:** Replaced CommonJS `const sharedConfig = require('@repo/tailwind-config')` with ESM `import sharedConfig from '@repo/tailwind-config'`. Verified build passes.

---

## 6. Environment Variables Audit

| Variable | Location | Status | Purpose |
| :--- | :--- | :--- | :--- |
| `DATABASE_URL` | `.env`, `packages/db/.env` | ✅ Configured | Neon pooled connection string for Express & Prisma queries |
| `DATABASE_URL_UNPOOLED` | `.env`, `packages/db/.env` | ✅ Configured | Neon direct connection string for Prisma migrations |
| `PORT` | `.env` | ✅ Configured (`3001`) | Express API port |
| `NEXT_PUBLIC_API_URL` | `.env` | ✅ Configured (`http://localhost:3001`) | Web client API base URL |
| `EXPO_PUBLIC_API_URL` | `.env.example` | ⚠️ Optional | Required when testing mobile on physical hardware via LAN |

---

## 7. Status of Applications

- **Web Application (`apps/web`):**
  - Next.js 15 App Router running on `http://localhost:3000`.
  - React Query integrated with `@repo/api-client`.
  - Verified rendering live data from Express backend.
- **Backend API (`apps/backend`):**
  - Express server running on `http://localhost:3001`.
  - CORS enabled, express.json parser enabled.
  - Prisma client actively querying Neon PostgreSQL.
- **Mobile Application (`apps/mobile`):**
  - Expo 55 / React Native 0.83 configured with NativeWind.
  - Android package defined: `com.a_myth_gharge.stackweave`.
  - Metro bundler functional.
- **iOS Configuration:**
  - Configured with `supportsTablet: true`.
  - ⚠️ **Missing `bundleIdentifier`** in `apps/mobile/app.json`.

---

## 8. Security Findings
1. **No Authentication or Authorization**: The starter template has zero authentication (no JWT, session tokens, or RBAC). Anyone can call `/users` or `/posts` without validation.
2. **Open CORS Policy**: `apps/backend/src/index.ts` sets `app.use(cors())`, accepting requests from any origin (`*`).
3. **No Rate Limiting**: No rate-limiting middleware configured on Express routes.

---

## 9. Issues to Resolve Before Feature Development
1. **Implement Expense Tracker Schema**:
   - Replace or extend the demo `User` and `Post` Prisma models with the schema specified in `Family_Expense_Tracker_PRD.docx` (e.g. `FamilyGroup`, `Member`, `Expense`, `Category`, `Budget`, `Receipt`).
2. **Add Authentication**:
   - Implement authentication (e.g. Neon Auth / Better Auth or JWT) so expenses and family groups are protected per user.
3. **Fix Mobile `app.json`**:
   - Remove deprecated `android.edgeToEdgeEnabled` to satisfy Expo schema validation.
   - Add `ios.bundleIdentifier` (e.g., `com.a_myth_gharge.stackweave`) for iOS compatibility.
4. **Fix ESLint Configuration**:
   - Add `eslint.config.mjs` to `apps/web` to avoid `next lint` deprecation prompts.
5. **Enforce Corepack**:
   - Developers on Windows should run `corepack yarn <command>` to avoid conflicts with global Yarn classic.

