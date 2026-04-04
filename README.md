# StackWeave

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![Expo](https://img.shields.io/badge/Expo-55-000020)](https://expo.dev/)
[![Turborepo](https://img.shields.io/badge/Turborepo-2.9-EF4444)](https://turbo.build/)

> A production-ready, full-stack monorepo template with Next.js, Expo, and Express - built for speed and developer experience.

## The Problem

Building full-stack applications with web and mobile frontends requires:
- Managing separate repositories or messy codebases
- Duplicating types, API logic, and configurations
- Version conflicts between shared dependencies
- Manual synchronization of schema changes across platforms

## What StackWeave Solves

✅ **Single Source of Truth** - Shared types, API client, and database schema  
✅ **Native Development** - Each platform uses optimal tech (Next.js for web, Expo for mobile)  
✅ **Shared Styling** - Consistent design system via shared Tailwind config  
✅ **Type Safety** - End-to-end TypeScript from database to UI  
✅ **Fast, Cached Builds** - Turborepo inte  
- 💡 Submit pull requests - see [CONTRIBUTING.md](CONTRIBUTING.md)
- ⭐ Star the repo if you find it useful
- 💬 Join [Discussions](../../discussions) to share ideas

**First-time contributors welcome!** Check out issues labeled [`good first issue`](../../issues?q=label%3A%22good+first+issue%22).

This is an open-source project! Feel free to:
- 🍴 Fork the repository and experiment
- 🐛 Report issues or suggest improvements
- 💡 Submit pull requests with enhancements
- ⭐ Star the repo if you find it useful

Try it out and build something amazing!

---

## 📦 What's Inside

### Apps

- **`apps/web`** - Next.js 15 web application with React 19
- **`apps/mobile`** - Expo 55 mobile app (iOS & Android) with React Native
- **`apps/backend`** - Express.js API server with TypeScript

### Packages

- **`@repo/types`** - Shared TypeScript types across all apps
- **`@repo/db`** - Prisma database schema and client
- **`@repo/api-client`** - Shared API client for frontend apps
- **`@repo/validators`** - Shared validation schemas
- **`@repo/tailwind-config`** - Shared Tailwind theme and color palette
- **`@repo/typescript-config`** - Shared TypeScript configurations
- **`@repo/eslint-config`** - Shared ESLint configurations

## 🚀 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 22.x or higher ([Download](https://nodejs.org/))
- **Yarn** 4.x (automatically installed via Corepack)
- **PostgreSQL** (for database) ([Download](https://www.postgresql.org/download/))

### For Mobile Development (Optional)

- **Android Studio** with Android SDK ([Setup Guide](https://docs.expo.dev/workflow/android-studio-emulator/))
- **Xcode** (macOS only, for iOS) ([Download](https://developer.apple.com/xcode/))
- **Java Development Kit (JDK)** 17 or higher

## 📥 Quick Installation

### 1. Clone and Install

```bash
# Clone the repository
git clone <repository-url>
cd stackweave

# Install dependencies
yarn install
```

The `postinstall` script will automatically run `prisma generate` to set up the database client.

### 2. Environment Setup

Copy the example environment file and configure your variables:

```bash
cp .env.example .env
```

Edit `.env` with your database credentials:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/stackweave?schema=public"
PORT=3001
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 3. Database Setup

**First, ensure PostgreSQL is running and create the database:**

```bash
# macOS (if using Homebrew)
brew services start postgresql@16

# Create the database
createdb stackweave

# Or using psql
psql -U postgres -c "CREATE DATABASE stackweave;"
```

**Then run migrations to set up the schema:**

```bash
# Run migrations (recommended)
yarn workspace @repo/db db:migrate

# Or push schema directly (for development)
yarn workspace @repo/db db:push
```

### 4. Start Development

```bash
# Start all apps in development mode
yarn dev
```

This will start:
- 🌐 **Web** app on [http://localhost:3000](http://localhost:3000)
- 📱 **Mobile** app with Expo (scan QR code with Expo Go)
- 🔧 **Backend** API on [http://localhost:3001](http://localhost:3001)

## 📱 Mobile Development

### Using Expo Go (Recommended for Quick Start)

1. Install Expo Go on your device ([iOS](https://apps.apple.com/app/expo-go/id982107779) | [Android](https://play.google.com/store/apps/details?id=host.exp.exponent))
2. Run `yarn dev` and scan the QR code
3. The app will load in Expo Go

### Native Builds

For native development with full features:

```bash
# Android
yarn android

# iOS (macOS only)
yarn ios
```

**Note:** Native folders (`android/`, `ios/`) are gitignored and regenerated via `expo prebuild` when needed.

## 🧹 Cleaning

If you encounter build issues or want a fresh start:

```bash
# Clean build artifacts, node_modules, and caches
yarn clean

# Deep clean - includes yarn cache (use for complete fresh start)
yarn clean:all

# After cleaning, reinstall
yarn install
```

**What gets cleaned:**

`yarn clean`:
- All `node_modules` (root + workspaces)
- Build artifacts (`.next`, `dist`, `.turbo`)
- Native folders (`android/`, `ios/`)
- Cache files (`.expo`, metro cache)

`yarn clean:all`:
- Everything from `yarn clean`
- Yarn cache files
- `yarn.lock`
- TypeScript build info

## 🛠️ Available Scripts

### Root Commands

- `yarn dev` - Start all apps in development mode
- `yarn build` - Build all apps for production
- `yarn lint` - Lint all packages
- `yarn format` - Format code with Prettier
- `yarn android` - Run mobile app on Android
- `yarn ios` - Run mobile app on iOS

### Workspace-Specific Commands

```bash
# Web app
yarn workspace @repo/web dev
yarn workspace @repo/web build

# Mobile app
yarn workspace @repo/mobile start
yarn workspace @repo/mobile android

# Backend
yarn workspace @repo/backend dev
yarn workspace @repo/backend build

# Database
yarn workspace @repo/db db:generate    # Generate Prisma client
yarn workspace @repo/db db:push        # Push schema to database
yarn workspace @repo/db db:migrate     # Run migrations
yarn workspace @repo/db db:studio      # Open Prisma Studio
```

## 🏗️ Project Structure

```
stackweave/
├── apps/
│   ├── web/             # Next.js web app
│   │   └── components/  # Web-specific UI components
│   ├── mobile/          # Expo mobile app
│   │   └── components/  # Mobile-specific UI components
│   └── backend/         # Express API server
├── packages/
│   ├── types/           # Shared TypeScript types
│   ├── db/              # Prisma schema & client
│   ├── api-client/      # API client
│   ├── validators/      # Validation schemas
│   └── tailwind-config/ # Shared theme & colors
├── package.json         # Root workspace config
└── turbo.json           # Turborepo configuration
```

## 🔧 Technology Stack

- **Framework:** [Turborepo](https://turbo.build/) for monorepo management
- **Web:** [Next.js 15](https://nextjs.org/) with React 19
- **Mobile:** [Expo 55](https://expo.dev/) with React Native 0.83
- **Backend:** [Express.js](https://expressjs.com/) with TypeScript
- **Database:** [Prisma](https://www.prisma.io/) ORM with PostgreSQL
- **Styling:** [TailwindCSS](https://tailwindcss.com/) & [NativeWind](https://www.nativewind.dev/)
- **State Management:** [TanStack Query](https://tanstack.com/query)
- **Package Manager:** [Yarn 4](https://yarnpkg.com/) with workspaces

## 🐛 Troubleshooting

### Prisma Error on Start

If you see `@prisma/client did not initialize yet`:

```bash
yarn workspace @repo/db db:generate
```

This should happen automatically via `postinstall`, but can be run manually if needed.

### Database Connection Error

If you see `Can't reach database server`:

```bash
# 1. Ensure PostgreSQL is running
brew services start postgresql@16  # macOS
# or
sudo systemctl start postgresql    # Linux

# 2. Verify database exists
psql -U postgres -l | grep stackweave

# 3. If not, create it
createdb stackweave

# 4. Run migrations
yarn workspace @repo/db db:migrate
```

### Metro/Expo Build Errors

```bash
# Clear Metro cache
yarn workspace @repo/mobile start --clear

# Rebuild native folders
cd apps/mobile
npx expo prebuild --clean
yarn android  # or yarn ios
```

### TypeScript Errors

```bash
# Clean TypeScript build info
find . -name "*.tsbuildinfo" -delete

# Restart TypeScript server in your editor
```

### Port Already in Use

```bash
# Kill process on port 3000 (web)
lsof -ti:3000 | xargs kill -9

# Kill process on port 3001 (backend)
lsof -ti:3001 | xargs kill -9
```

## � License

MIT
