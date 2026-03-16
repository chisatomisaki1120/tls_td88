# tls_td88

Internal Next.js dashboard for phone-record management.

## Local development

Create a local env file:

```bash
cp .env.example .env
```

Default local database:

```env
DATABASE_URL="file:./dev.db"
SESSION_SECRET="change-me"
```

Run locally:

```bash
npm install
npm run db:push
npm run db:seed
npm run dev
```

## Deploy to Vercel with Turso

Use these environment variables in Vercel:

- `DATABASE_URL=libsql://...`
- `TURSO_AUTH_TOKEN=...`
- `SESSION_SECRET=...`

Prepare the Turso schema from local:

```bash
npm run db:push:turso
npm run db:seed
```

Then deploy:

```bash
vercel --prod
```

## Seed accounts

- `admin` / `admin123`
- `leader1` / `staff123`
- `staffa` / `staff123`
- `staffb` / `staff123`
