# Bamboo Cask (app)

The ordering app: Next.js 16 (App Router), Postgres with Drizzle, and Better Auth phone sign-in.
The static demo site stays at the repository root until this replaces it.

## Run it locally

```sh
pnpm install
docker compose up -d          # Postgres on localhost:5433
cp .env.example .env.local    # then set BETTER_AUTH_SECRET (openssl rand -base64 32)
pnpm db:migrate               # apply drizzle/*.sql
pnpm db:seed                  # load the menu (only adds missing rows)
pnpm dev                      # http://localhost:3000
```

Without Africa's Talking keys, sign-in codes are printed in the `pnpm dev` log.

## Layout

| Path | What it is |
|---|---|
| `src/db/schema.ts` | All tables: Better Auth (user, session, account, verification), the menu, orders |
| `src/db/queries/menu.ts` | `getMenu()`, cached with `"use cache"` and tag `menu` |
| `src/lib/auth.ts` | Better Auth with the phone-number plugin (6-digit code, 10 minutes, 5 tries) |
| `src/lib/sms.ts` | Africa's Talking sender |
| `src/lib/age.ts` | 18th birthday and adult checks, in Nairobi time |
| `src/app/actions/profile.ts` | Sets name and date of birth, once |
| `src/app/sign-in/` | Phone → code → name and date of birth |
| `scripts/export-menu.mjs` | One-time export of the menu from `../bamboo-cask.html` into `src/db/seed-data/menu.json` |
| `scripts/seed.ts` | Loads that JSON into Postgres |

Alcohol is filtered on the server: it is never sent to a guest or to an account under 18.

## Changing the schema

Edit `src/db/schema.ts`, then `pnpm db:generate --name <what-changed>` and `pnpm db:migrate`.
Don't edit a generated migration after it has been applied anywhere.

## Self-hosting

`next.config.ts` sets `output: "standalone"`: `pnpm build` produces `.next/standalone/server.js`,
which runs with plain `node` (copy `.next/static` and `public` beside it).
