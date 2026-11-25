# LNS OMS – MVP 1.0

Order Management System for a food wholesaler: orders, invoices, inventory ledger, purchase orders, dashboard.
The full report (in Vietnamese) is in [docs/BAO_CAO.md](docs/BAO_CAO.md).

## Run locally (SQLite)

```bash
npm install
npm run db:reset   # create schema + seed demo data
npm run dev        # http://localhost:3000, log in with admin@demo.vn / sales@demo.vn / kho@demo.vn, password 123456
```

> Windows: run from a path whose drive letter is uppercase (`D:\...`). If it is lowercase (`d:\...`), Next loads React twice and the build fails.

## Deploy (Vercel + Postgres)

1. Create a free Postgres database on Supabase or Neon and copy its connection string.
2. In `prisma/schema.prisma`, change `provider = "sqlite"` to `provider = "postgresql"`.
3. Push the code to GitHub, import it into Vercel, and set the `DATABASE_URL` and `JWT_SECRET` (at least 32 random characters) env vars.
4. Locally, with `DATABASE_URL` pointing at that database, run `npm run db:reset` to create the tables and seed the data.
