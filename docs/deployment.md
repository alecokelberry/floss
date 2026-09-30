# Deploying Floss

Floss runs on Vercel with a Neon Postgres database. Postgres holds the whole practice: patients, bookings, invoices, settings and sign-in.

## 1. Make the Vercel project

1. **Add New → Project** and import the repo. Leave the Next.js defaults alone.
2. Don't deploy yet, add the database first.

## 2. Add Neon

In the project go to **Storage → Create Database → Neon** and connect it to every environment. That sets two
variables for you:

| Variable                | What it's for                        |
| ----------------------- | ------------------------------------ |
| `DATABASE_URL`          | The pooled connection the app uses   |
| `DATABASE_URL_UNPOOLED` | The direct connection migrations use |

## 3. Add the secret

Under **Settings → Environment Variables**, for Production and Preview:

| Variable             | Value                                                             |
| -------------------- | ----------------------------------------------------------------- |
| `BETTER_AUTH_SECRET` | `openssl rand -base64 32`                                         |
| `BETTER_AUTH_URL`    | Only if you add a custom domain, e.g. `https://floss.example.com` |

The `*.vercel.app` URLs already work for sign-in (see `src/lib/auth.ts`).

## 4. Make the tables

Nothing to do. `vercel.json` runs `pnpm db:migrate` before every build, over the direct URL, so new files in
`drizzle/` get applied on the next deploy.

## 5. Deploy

Push to `main` and Vercel builds it. The first request seeds the practice around today, and it reseeds itself every new day.

## If something's off

| Problem                       | Fix                                                                                       |
| ----------------------------- | ----------------------------------------------------------------------------------------- |
| Sign-in fails with a 403      | Custom domain? Set `BETTER_AUTH_URL` to it and redeploy                                   |
| `relation … does not exist`   | The migrations didn't run against this database, check the build log for the migrate step |
| Build fails on env validation | A variable is missing in that environment (Preview vs Production)                         |

## Running it locally

```bash
pnpm bootstrap
pnpm dev   # http://localhost:3001
```
