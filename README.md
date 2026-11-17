# Family Expense Tracker

A simple app that helps a family record daily expenses and manage a monthly budget in one place. Family members add their own spending, and everyone sees where the family money goes. One account works on the **web**, **Android** and **iPhone**, and everything stays in sync.

All amounts are in Indian Rupees (₹). This is a small family app: it does not connect to bank accounts.

## What it does

- **Accounts:** register, log in, edit your profile, change your password, and reset a forgotten password by email.
- **Family groups:** create a family (you become the admin), invite members by email with a one-click join link, and remove members. A removed member's past expenses stay in the family records.
- **Expenses:** amount, category, date, payment method (Cash, UPI, Card, Bank Transfer) and an optional note. Add, edit and delete, and filter history by date range, category and member.
- **Categories:** 14 ready-made categories plus custom ones shared by the whole family. Only the admin can delete a custom category, and never one that already has expenses.
- **Income:** record salary and other income per month, for any family member.
- **Monthly budget:** set a total and a budget per category. Progress bars show used and remaining, and a category turns red with an alert when it goes over budget.
- **Dashboard:** monthly income, expenses and balance, spending by category and by member, and recent transactions. Tap a category, member or transaction to open the matching list.
- **Reports:** monthly summary, category chart, income vs. expenses, and a comparison with the previous month.
- **Roles:** the admin can edit or delete any entry and manage budgets and members. Members can add entries and edit or delete their own.
- **Live refresh:** screens refresh every 30 seconds and whenever you return to the app, so an expense added on a phone shows up on the web.

## Tech stack

| Part | Technology |
| --- | --- |
| Web app | Next.js 15, React 19, Tailwind CSS, TanStack Query |
| Mobile app (Android and iOS) | React Native with Expo, NativeWind, React Navigation |
| API | Node.js, Express, Zod validation |
| Database | PostgreSQL (for example a free [Neon](https://neon.tech) project) with Prisma |
| Email | Gmail SMTP (free) or [Resend](https://resend.com), with HTML templates |
| Monorepo | Yarn 4 workspaces and Turborepo, TypeScript throughout |

## Project structure

```
.
├── apps/
│   ├── backend/     Express API (routes, auth, email templates)
│   ├── web/         Next.js web app
│   └── mobile/      Expo mobile app
├── packages/
│   ├── db/          Prisma schema and client
│   ├── validators/  Shared Zod schemas (used by the API)
│   ├── api-client/  Starter API client (not used by the app screens yet)
│   ├── types/       Shared TypeScript types (starter placeholder)
│   └── ...          Shared ESLint, Tailwind and TypeScript configs
└── .env.example     Template for the environment file
```

## Getting started

### Prerequisites

- **Node.js 22 or newer**
- **Corepack** (ships with Node). Run `corepack enable` once. This project uses Yarn 4.
- A **PostgreSQL** database. The easiest option is a free [Neon](https://neon.tech) project.
- For the mobile app: the **Expo Go** app on your phone, or an Android emulator / iOS simulator.

> **Windows tip:** if you also have the old Yarn 1 installed globally, put `corepack` in front of every command (for example `corepack yarn install`) so the right Yarn version is used.

### 1. Install dependencies

```bash
corepack yarn install
```

This also generates the Prisma client.

### 2. Configure the environment

Copy `.env.example` to `.env` in the repository root and fill it in:

```bash
cp .env.example .env
```

At minimum you need `DATABASE_URL`, `DATABASE_URL_UNPOOLED` and a long random `JWT_SECRET`. To create a secret:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

`.env` is ignored by git. Never commit real secrets.

### 3. Create the database tables

```bash
corepack yarn workspace @repo/db db:migrate:prod
```

This applies the migrations in `packages/db/migrations` to an empty database. If your database was created earlier with `db:push`, mark the baseline as already applied first, then apply the rest:

```bash
corepack yarn workspace @repo/db prisma migrate resolve --applied 20261101000000_baseline
corepack yarn workspace @repo/db db:migrate:prod
```

### 4. Run the apps

Open a terminal for each:

```bash
# API  ->  http://localhost:3001
corepack yarn workspace @repo/backend dev

# Web app  ->  http://localhost:3000
corepack yarn workspace @repo/web dev

# Mobile app (scan the QR code with Expo Go)
corepack yarn workspace @repo/mobile start
```

`corepack yarn dev` starts the API and web app together through Turborepo.

Open http://localhost:3000, create an account, then create your family group.

### Running the mobile app on a real phone

Your phone cannot reach `localhost` on your computer. Put your computer's local network address in `apps/mobile/.env.local`:

```
EXPO_PUBLIC_API_URL=http://192.168.1.5:3001
```

Your phone and computer must be on the same Wi-Fi. The Android emulator uses `10.0.2.2` and the iOS simulator uses `localhost` automatically.

## Environment variables

Set these in the root `.env`. See `.env.example` for a ready-to-copy template.

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection string used by the API (the pooled one on Neon) |
| `DATABASE_URL_UNPOOLED` | Yes | Direct connection string used by Prisma to create and change tables |
| `JWT_SECRET` | Yes | Secret that signs login tokens. The API refuses to start without it. |
| `PORT` | No | API port (default `3001`) |
| `CORS_ORIGINS` | No | Extra web addresses allowed to call the API, comma separated |
| `PAYMENT_ENCRYPTION_KEY` | For bank accounts | 32 random bytes, base64. Encrypts saved bank account numbers. Back it up: if it is lost, stored account numbers cannot be read again. |
| `WEB_URL` | For email | Public address of the web app, used in email links |
| `SMTP_USER`, `SMTP_PASS` | For Gmail | Gmail address and App Password (see below) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE` | No | Use another SMTP service (default is Gmail, port 465) |
| `RESEND_API_KEY`, `MAIL_FROM` | For Resend | Use Resend instead of SMTP |
| `TRUST_PROXY` | No | Set to `1` when the API runs behind a tunnel or reverse proxy |

The web app finds the API automatically (same host, port 3001). To point it somewhere else, create `apps/web/.env.local` with `NEXT_PUBLIC_API_URL=https://your-api.example.com`.

## Email setup

The app sends a welcome email, family invite emails and password reset codes. It picks the first provider that is configured:

1. **SMTP**, if `SMTP_USER` and `SMTP_PASS` are set (Gmail by default).
2. **Resend**, if `RESEND_API_KEY` is set.
3. **Nothing:** in local development the emails are printed in the API log instead, and the invite page tells the admin to share the invite code by hand.

### Gmail (free, about 500 emails a day)

1. Turn on 2-Step Verification for the Gmail account: https://myaccount.google.com/security
2. Create an App Password: https://myaccount.google.com/apppasswords (16 characters)
3. Put your Gmail address in `SMTP_USER` and the App Password in `SMTP_PASS`, set `WEB_URL`, and restart the API.

Use the App Password, not your normal Gmail password. Work or school accounts may not allow app passwords. In that case use a personal Gmail account or another SMTP provider.

Emails contain links built from `WEB_URL`. Set it to an address the recipient can actually open, not `localhost`, when inviting people on other devices.

## API overview

All routes except register, login and the password reset endpoints need a `Authorization: Bearer <token>` header. Amounts are integers in **paise** (₹1 = 100 paise) so totals never drift.

| Area | Routes |
| --- | --- |
| Account | `POST /auth/register`, `POST /auth/login`, `POST /auth/forgot`, `POST /auth/reset`, `GET/PATCH /me` |
| Family | `POST/GET/PATCH /family`, `POST/GET /family/invites`, `DELETE /family/invites/:id`, `POST /invites/accept`, `DELETE /family/members/:userId` |
| Categories | `GET/POST /categories`, `DELETE /categories/:id` |
| Expenses | `GET/POST /expenses`, `GET/PATCH/DELETE /expenses/:id` (filters: `month`, `from`, `to`, `categoryId`, `userId`) |
| Income | `GET/POST /income`, `PATCH/DELETE /income/:id` |
| Budgets | `GET /budgets?month=YYYY-MM`, `PUT /budgets` |
| Dashboard and reports | `GET /summary?month=YYYY-MM` |
| Payment methods | `GET/POST /payment-methods`, `PATCH/DELETE /payment-methods/:id`, `POST /payment-methods/:id/default`, `POST /payment-methods/:id/reveal` |

Every family route checks that the caller belongs to that family, so one family can never see another family's data.

### Saved cards and bank accounts

Each person can save cards and bank accounts and pick them when adding a Card or Bank Transfer expense (Cash and UPI are unchanged). They are private to the person who saved them: not even the family admin can see them.

- **Cards** store only a nickname, Credit or Debit, and the last 4 digits. A full card number, CVV, expiry or PIN is rejected.
- **Bank accounts** store only the account number, encrypted with AES-256-GCM. The app shows the last 4 digits; the full number is shown only to its owner after they type their password again.
- Each person has at most one default card and one default bank account. The database enforces this.
- Deleting a saved method hides it, wipes any stored account number, and keeps old expenses intact: they still show which card or account was used, marked "removed".
- An expense can only use a saved method that belongs to the person who made it (checked by the API and by a database foreign key).

## Security notes

- Passwords are hashed with bcrypt. Reset codes are stored only as hashes, work once, expire in 30 minutes and lock after 5 wrong tries.
- Login and reset routes are rate limited. Wrong-password and unknown-email logins return the same message.
- Sessions last 30 days and renew while you use the app.
- The web app keeps its login token in the browser's local storage; the mobile app uses the phone's secure storage.

## Useful commands

| Command | What it does |
| --- | --- |
| `corepack yarn build` | Build the API and web app |
| `corepack yarn format` | Format the code with Prettier |
| `corepack yarn workspace @repo/backend test` | Run the API tests (they create and then delete their own users in the database from `.env`) |
| `corepack yarn workspace @repo/db db:migrate:prod` | Apply the database migrations |
| `corepack yarn workspace @repo/db db:studio` | Browse the database in Prisma Studio |
| `corepack yarn workspace @repo/db seed:sample you@example.com` | Fill that user's family with sample categories, three months of expenses, income and budgets (for demos) |
| `corepack yarn clean` | Remove build output and `node_modules` |

## Troubleshooting

- **"JWT_SECRET is not set":** add a long random value to `.env` and restart the API.
- **Prisma "operation not permitted" while generating:** the API is running and holds the Prisma engine file. Stop it, run the command again, then restart it.
- **Port 3000 or 3001 already in use:** stop the other process, or run the app on another port.
- **Metro runs out of memory:** run `NODE_OPTIONS=--max-old-space-size=4096` before starting Expo.
- **The phone cannot reach the API:** set `EXPO_PUBLIC_API_URL` to your computer's network address and allow the API through your firewall.
- **Invite email never arrives:** check the Spam folder, and look at the API log. Every send logs whether the mail server accepted or rejected it.

## Not built yet

- Hosting and release (web deployment, Play Store and App Store builds)
- Automated tests for the rest of the API and for the web and mobile screens (today the repository has API tests for saved payment methods)
- Offline use, data export, receipt scanning and bill reminders (out of scope for version 1)

## License

MIT. See [LICENSE](LICENSE).
