# LNS OMS – MVP 1.0

Order Management System for a food wholesaler: orders, invoices, inventory ledger, purchase orders, dashboard.
The full report (in Vietnamese) is in [docs/BAO_CAO.md](docs/BAO_CAO.md).

**Live demo:** https://lns-oms.vercel.app (admin@demo.vn / sales@demo.vn / kho@demo.vn, password `123456`)

## Run locally

```bash
npm install
cp .env.example .env   # or: neon env pull  (fills DATABASE_URL + DATABASE_URL_UNPOOLED from Neon)
npm run db:reset       # create schema + seed demo data (uses the direct, unpooled URL)
npm run dev            # http://localhost:3000, log in with admin@demo.vn / sales@demo.vn / kho@demo.vn, password 123456
```

> Windows: run from a path whose drive letter is uppercase (`D:\...`). If it is lowercase (`d:\...`), Next loads React twice and the build fails.

## Deploy (Vercel + Neon Postgres)

1. Database: Neon project (`neon.ts` in this repo). `neon deploy` pulls the connection strings into `.env`.
2. Push to GitHub, import the repo into Vercel.
3. In Vercel → Environment Variables set `DATABASE_URL` (pooled), `DATABASE_URL_UNPOOLED` (direct) and `JWT_SECRET` (at least 32 random characters).
4. Deploy. Tables and demo data already live in Neon (`npm run db:reset` was run against it).
