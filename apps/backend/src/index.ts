import express from 'express';
import type { ErrorRequestHandler } from 'express';
import cors from 'cors';
import prisma from '@repo/db';
import { DEFAULT_CATEGORIES } from '@repo/validators';
import { HttpError } from './lib';
import { auth } from './routes/auth';
import { family } from './routes/family';
import { categories } from './routes/categories';
import { expenses } from './routes/expenses';
import { income } from './routes/income';
import { budgets } from './routes/budgets';
import { summary } from './routes/summary';
import { paymentMethods } from './routes/paymentMethods';

// Exported so the automated tests can start the app on a random port.
export const app = express();
const PORT = process.env.PORT || 3001;

// Behind a tunnel or reverse proxy, the real client IP is in X-Forwarded-For. Set TRUST_PROXY=1
// (number of proxies) there so rate limits count each person, not the whole proxy as one user.
// Leave it unset when the API is reached directly, otherwise the header could be forged.
if (process.env.TRUST_PROXY) {
  const n = Number(process.env.TRUST_PROXY);
  app.set('trust proxy', Number.isNaN(n) ? process.env.TRUST_PROXY : n);
}

// Only the listed web origins may call the API from a browser. Mobile apps send no Origin.
const defaultOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000'];
const configuredOrigins = (process.env.CORS_ORIGINS ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const origins = [...defaultOrigins, ...configuredOrigins];

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (origins.includes(origin)) return cb(null, true);
      try {
        const url = new URL(origin);
        // Allow local network IPs (e.g. 192.168.x.x, 10.x.x.x) and devtunnels
        if (/^(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|localhost|127\.0\.0\.1)$/.test(url.hostname)) {
          return cb(null, true);
        }
        if (url.hostname.endsWith('.devtunnels.ms')) {
          return cb(null, true);
        }
      } catch {
        /* invalid url */
      }
      cb(null, false);
    },
    credentials: true,
    // Lets the web app read the refreshed session token.
    exposedHeaders: ['x-refresh-token'],
  }),
);
app.use(express.json({ limit: '100kb' }));

app.get('/', (_req, res) => {
  res.json({ ok: true, service: 'family-expense-tracker-api' });
});

app.use(auth, family, categories, expenses, income, budgets, summary, paymentMethods);

app.use((_req, _res, next) => next(new HttpError(404, 'Not found')));

const onError: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({ message: err.message, ...(err.code ? { code: err.code } : {}) });
    return;
  }
  console.error(err);
  res.status(500).json({ message: 'Something went wrong' });
};
app.use(onError);

/** The 14 ready-made categories are shared by every family (familyId = null). */
export async function ensureDefaultCategories() {
  for (const name of DEFAULT_CATEGORIES) {
    const found = await prisma.category.findFirst({ where: { familyId: null, name } });
    if (!found) await prisma.category.create({ data: { name, isDefault: true } });
  }
}

// Only start listening when run directly (not when the tests import the app).
if (require.main === module) {
  ensureDefaultCategories()
    .then(() => {
      app.listen(PORT, () => console.log(`API listening on port ${PORT}`));
    })
    .catch((e) => {
      console.error('Failed to start (is the database up to date? run db:migrate:prod)', e);
      process.exit(1);
    });
}
