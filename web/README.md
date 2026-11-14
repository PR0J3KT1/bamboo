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
| `scripts/grant-role.ts` | Gives an account a role (`pnpm admin:grant`) |

Alcohol is filtered on the server: it is never sent to a guest or to an account under 18.

## The menu (/)

- Every section in one scroll. On phones the green culm bar sticks to the top and lights the
  section on screen (short names there, full names on the desktop stalk). On desktop the order
  sits beside the menu; on phones it's the lime bar at the bottom.
- **The Cask Room**, for adults: a rail per shelf, "See all" opens the whole shelf with strength,
  price and style filters and a sort, and the search looks across every shelf. Guests, unfinished
  accounts and under-18s get the closed door instead, and no drink ever reaches their browser.
  The old site's animated bottle wall needs the drink photos, which haven't moved over yet.
- **Pictures** (`src/lib/pictures.ts`): an uploaded photo first, then the lounge's own photo,
  then a free-licensed photo of the dish (credited in its sheet, as the licences ask), then the
  bottle cut from a sheet of 6 × 5 bottle photos. The photos and sheets came from the old site
  with `node scripts/export-photos.mjs ../bamboo-cask.html` and live in `public/`.
- **The Cask Room wall**: a row of bottles per shelf, drifting; hover or focus holds a row, Pause
  holds them all, reduced motion keeps them still. Shelves with fewer than four bottle photos
  get a rail instead.
- The lounge's hours, phone and Google rating come from Settings in the admin.

## Plates and parties

- **Who's eating?** plates on the menu: dishes put together for one, two or the table, each at the
  price of its parts, added to the order in one tap. A plate hides while any of its dishes is
  sold out, and plates with alcohol show only to adults. Admins edit them in Menu → Who's eating?
  plates (`/admin/menu/plates`).
- **Party packages** (`/party`, `src/lib/party.ts`): the old site's planner, ported line for line
  and checked against it (the same totals to the shilling). Pick the occasion, guests, hours, food
  and drinks and a budget tier; it works out the choma, sides, drinks and mixers from the menu at
  the lounge's prices. Every line can be changed or swapped, the bill split between friends, the
  list sent to the lounge on WhatsApp, or the whole party added to the order. Under-18s and guests
  get food, sodas and water only. An order line can be up to 300 (for the biggest parties).

## Rooms (/rooms) and tables (/book)

Customers ask for a room (dates, nights, guests) or book a table (day, time, people, occasion).
Either is saved as a booking with a code (BK-1001) and a page of its own (/bookings/[id]) where
they see where it stands, the lounge's reply, and can cancel. Staff answer in **Bookings** in the
admin: confirming or declining texts the customer (declining needs a reason). A number can't have
more than 3 requests waiting. Nothing is paid online. Room photos and captions are in
`src/lib/rooms.ts`; the rates, guests per room and table hours are in Settings.

## Settings (/admin/settings, admins only)

What customers see about the lounge, kept in the `settings` table (`src/lib/settings-schema.ts`
for the shape, defaults and messages): opening hours, the phone used for Call, WhatsApp and SMS,
the Google rating (hidden until set), room rates and guests, table hours and size, and two
switches: **taking orders online** (off: the menu shows the note and checkout refuses, on the
server too) and **booking tables online**. Every save is audited.

## The admin (/admin)

Three roles, in `src/lib/permissions.ts`: **customer** (everyone), **staff** (orders, the sold-out
switch, looking up customers) and **admin** (everything, including prices, the team, blocking
numbers and reports). Nobody can impersonate anybody.

- Give the first admin their role from the command line, after they've signed in once:
  `pnpm admin:grant 0712345678 admin`. After that, admins manage the team at `/admin/team`.
- Every admin page and every admin action checks the role in the database
  (`requirePermission` / `checkPermission` in `src/lib/session.ts`). `src/proxy.ts` only turns
  away visitors with no session cookie at all.
- Every change is written to `audit_events` with who made it and the before and after.
- A blocked number can't sign in, gets no sign-in code, and can't order as a guest either.
- Better Auth's session cookie cache is off, so a removed role or a block takes effect at once.

Testing the site on another address or port: add it to `BETTER_AUTH_TRUSTED_ORIGINS`.

## The orders board and riders

`/admin` is the ticket rail: New, Preparing, Ready, With the rider. Each ticket shows its age
(the clip turns amber at 15 minutes and red at 30), the lines, the kitchen note, an 18+ tag for
alcohol, and one button for the next step. The board and each customer's tracking page update
live: every order change runs `pg_notify('orders', id)` inside its transaction, and
`src/lib/order-feed.ts` streams it to browsers as Server-Sent Events (`/api/admin/orders/stream`,
`/api/orders/<id>/stream`). Staff can turn on a chime for new orders.

Riders come from TumaBoda's partner API (`src/lib/tumaboda.ts`), when `TUMABODA_API_KEY` is set:
- Checkout shows TumaBoda's cash-on-delivery fee for the place (falling back to the fare rule).
- **Mark ready** on a delivery order books a rider, cash at the door, with the order code as the
  reference, so a retry never books two. If booking fails (a low wallet, say), the order is still
  ready, the ticket says "Rider not booked", and the order page has **Call a rider again**.
- TumaBoda's webhooks (`/api/tumaboda/webhook`, signed with `TUMABODA_WEBHOOK_SECRET`) move the
  order to "With the rider" at pickup and complete it at drop-off. Old or repeated events are
  ignored; nothing moves an order backwards.
- TumaBoda's partner API can't cancel a delivery: cancel the rider in the TumaBoda business app.

Without a key, staff press **Hand to rider** and **Delivered** themselves. To try riders locally:
`pnpm tumaboda:mock` (a stand-in for the partner API on port 4010 that walks each delivery through
its statuses), and run the app with `TUMABODA_API_KEY=tuma_test_mock`,
`TUMABODA_BASE_URL=http://localhost:4010/api/v1/partner` and `TUMABODA_WEBHOOK_SECRET=whsec_mock`.

## Menu and prices (/admin/menu)

- **Staff** switch dishes between "On the menu" and "Sold out".
- **Admins** also change prices in place (a bar collects the changes; nothing is saved until
  **Save prices**), edit or add dishes and drinks with their sizes, choices and photos, and edit a
  section's name and note. A size that's no longer sold is switched off, not deleted, so old
  orders keep it.
- Every save refreshes the cached customer menu at once (`updateTag("menu")`) and is written to
  `audit_events`.

### Photos: Cloudflare R2

Photos are shrunk in the browser (to about 0.5 MB), then on the server to at most 1600 px WebP
with the phone's metadata (GPS) removed, and stored in R2 under a new name each time. Set up:

1. In Cloudflare, create an R2 bucket (e.g. `bamboo-cask-photos`) and give it a public address:
   the r2.dev URL, or better a custom domain such as `photos.bamboocask.co.ke`.
2. Create an R2 API token with **Object Read & Write** on that bucket only.
3. Set `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` and
   `R2_PUBLIC_URL` (the public address). `next.config.ts` allows that host for `next/image`, so
   rebuild after changing it.

Without R2, development saves photos in `public/uploads`; production refuses uploads with a clear
message. Any S3-compatible store works with `R2_ENDPOINT` in place of `R2_ACCOUNT_ID`.

## Customers (/admin/customers)

A customer is a phone number: an account, or a guest who has only ordered without signing in.
Orders are counted by number, so an account's earlier guest orders count too.

- Staff and admins see the list (search by name or number), each customer's Cask Room status
  and order history. A **Staff** tab lists the team.
- Only admins see dates of birth, change roles there, and **block a number** (with a reason).
  Blocking an account signs it out everywhere (Better Auth's admin plugin); blocking a guest
  number adds it to `blocked_numbers`. Either way the number can't sign in, gets no sign-in
  code and can't order, until an admin unblocks it. Team members can't be blocked until they're
  taken off the team.

## Reports (/admin/reports)

Admins only. Pick today, 7 days, 30 days, or any range up to 92 days; days are calendar days in
Nairobi time, by when the order was placed.

- **Sales** are items less discounts, on completed orders only. Delivery fees go to the rider and
  are shown apart. Cancelled orders are listed with their reasons and not counted; orders still
  open aren't counted either. Sales are compared with the same number of days just before.
- Charts: sales by day (by hour for a single day), what sold (kitchen, soft drinks, Cask Room),
  how customers paid, best sellers by quantity or by KES, and orders by delivery area. Each has
  a "Show as a table" view. The chart colours are `--series-1..3` in `globals.css`, checked for
  colour-blind separation and contrast in all three themes.
- **Orders CSV** (every order in the period, with status and items) and **Items sold CSV** for
  the bookkeeper, from `/admin/reports/export`. Each download is written to the audit log.

## Changing the schema

Edit `src/db/schema.ts`, then `pnpm db:generate --name <what-changed>` and `pnpm db:migrate`.
Don't edit a generated migration after it has been applied anywhere.

## On Vercel

The app is its own Vercel project, `bamboo-cask-app` (https://bamboo-cask-app.vercel.app),
deployed from this folder with `vercel deploy --prod`. The static site stays a separate project.

- **Database:** Neon, from the Vercel Marketplace. It sets `DATABASE_URL` (pooled; prepared
  statements are switched off for it) and `DATABASE_URL_UNPOOLED` (direct; used for LISTEN and for
  migrations). Migrate and seed from here with the production values in the environment, e.g.
  `DATABASE_URL=… DATABASE_URL_UNPOOLED=… pnpm db:migrate && pnpm db:seed`.
- **Set in the project:** `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `BETTER_AUTH_TRUSTED_ORIGINS`.
- **Still to add:** `AT_API_KEY`, `AT_USERNAME`, `AT_SENDER_ID` (sign-in codes), the `R2_*`
  values (photos), the `TUMABODA_*` values (riders) Then make the first
  admin: `pnpm admin:grant +2547… admin` with the production database in the environment.

## Self-hosting

`next.config.ts` sets `output: "standalone"`: `pnpm build` produces `.next/standalone/server.js`,
which runs with plain `node` (copy `.next/static` and `public` beside it).
