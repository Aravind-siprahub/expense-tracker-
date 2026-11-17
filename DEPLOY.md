# Deploying for free (long term)

| Part | Where | Why |
|---|---|---|
| Web app | **Vercel** (Hobby) | Best free home for Next.js, never sleeps, HTTPS included (the PWA needs HTTPS) |
| API | **Render** (free web service) | No expiry. Sleeps after ~15 min idle, so the first request after a pause takes 30-60 s |
| Database | **Neon** (free) | Already in use |
| Email | **Resend** (free) | Render's free plan blocks Gmail SMTP; Resend works over HTTPS |

Free plans and their limits change. Check each site's pricing page before relying on one.

Deploy order matters: **database, then API, then web, then connect the two.**

---

## 0. Before you start

- [ ] Commit and push your work to the branch you deploy from (`as/ui`, or `main` after merging). Render and Vercel deploy from GitHub.
- [ ] **Delete the Gmail app password** that was pasted in chat: <https://myaccount.google.com/apppasswords>. Production does not use Gmail.
- [ ] Create **new** production secrets. Never reuse the local ones.

Generate the two secrets (any computer with Node):

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"   # JWT_SECRET (Render can also generate it)
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"   # PAYMENT_ENCRYPTION_KEY
```

Save `PAYMENT_ENCRYPTION_KEY` in a password manager. If it is lost, saved bank account numbers can never be read again.

## 1. Database (Neon)

Use a **separate** Neon database (or a new branch) for production, not the one holding your test data.

- [ ] In Neon, copy two connection strings: the **pooled** one (`DATABASE_URL`) and the **direct** one without `-pooler` in the host (`DATABASE_URL_UNPOOLED`).
- [ ] Tables are created automatically by the API's first deploy (step 2). Nothing to run by hand.

## 2. API (Render)

- [ ] Sign in at <https://render.com> with GitHub.
- [ ] **New > Blueprint**, pick this repo and branch. Render reads [`render.yaml`](render.yaml).
- [ ] Fill in the values it asks for:

| Variable | Value |
|---|---|
| `DATABASE_URL` | Neon pooled string |
| `DATABASE_URL_UNPOOLED` | Neon direct string |
| `PAYMENT_ENCRYPTION_KEY` | the base64 key from step 0 |
| `WEB_URL` | your Vercel address (you get it in step 3; use a placeholder now and edit later) |
| `CORS_ORIGINS` | the same Vercel address, no trailing slash |
| `RESEND_API_KEY` | from step 4 (can be added later) |
| `MAIL_FROM` | e.g. `Family Expense Tracker <noreply@yourdomain.com>` |

`JWT_SECRET` is generated for you. `TRUST_PROXY=1` is already set.

- [ ] Wait for the first deploy. The build applies the database migrations, then builds the API.
- [ ] Open `https://<your-service>.onrender.com/`. It should show `{"ok":true,"service":"family-expense-tracker-api"}`.

If the build runs out of memory or `yarn workspaces focus` fails, change the install part of `buildCommand` to `yarn install --immutable`.

## 3. Web app (Vercel)

- [ ] Sign in at <https://vercel.com> with GitHub, **Add New > Project**, pick this repo.
- [ ] **Root Directory:** `apps/web`. Leave "Include source files outside of the Root Directory" **on**. [`vercel.json`](apps/web/vercel.json) handles install and build.
- [ ] Add one environment variable: `NEXT_PUBLIC_API_URL` = `https://<your-service>.onrender.com` (no trailing slash).
- [ ] If the install step cannot find Yarn 4, add `ENABLE_EXPERIMENTAL_COREPACK` = `1` and redeploy.
- [ ] Deploy, then open the address Vercel gives you.

## 4. Email (Resend)

- [ ] Create an account at <https://resend.com> and an API key. Put it in Render as `RESEND_API_KEY`.
- [ ] **Important limit:** with the test sender (`onboarding@resend.dev`) Resend only delivers to **your own** email. To invite other family members, verify a domain you own in Resend and set `MAIL_FROM` to an address on it. A domain costs a few dollars a year, which is the one cost in this setup.
- [ ] Without any of this, sign-up still works but invite and reset emails are not delivered. Invite codes can still be shared by hand.

## 5. Connect and test

- [ ] Put the final Vercel address into Render's `WEB_URL` and `CORS_ORIGINS`, and redeploy the API.
- [ ] On the live site: create an account, add an expense, log out and back in.
- [ ] Test an invite email and a forgot-password email.
- [ ] Open the site on a phone. Android: browser menu > Install app. iPhone: Safari > Share > Add to Home Screen.
- [ ] Optional: add a free uptime ping (for example UptimeRobot) on the API address every 10-14 minutes so it rarely sleeps.

## Later changes

- Every push to the deploy branch redeploys both services.
- New database migrations are applied by the Render build.
- To release a new service worker, change `VERSION` in `apps/web/public/sw.js`.
- Mobile app: set `EXPO_PUBLIC_API_URL` to the Render address, then build with Expo EAS. Android APKs are free; the App Store needs a paid Apple account.

## Not verified

This file was written and the API bundle was tested locally with plain `node`, but nothing has been deployed yet. The Render and Vercel settings above come from their documentation, not from a run.
