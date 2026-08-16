# Savings

A single-page app for two people to model how their combined savings and
investments grow over time, and to work out what monthly amount is needed to
reach a target. See [savings-projection-spec.md](savings-projection-spec.md)
for the full product spec.

## Stack

Next.js (App Router) + TypeScript, Tailwind CSS v4, Recharts, Framer Motion,
Supabase Postgres (server-side only), a single shared passcode signed into an
httpOnly cookie with `jose`, deployed on Vercel.

## Setup

1. **Create a Supabase project** at [supabase.com](https://supabase.com).
2. **Run the schema.** In the Supabase SQL editor, run:

   ```sql
   create table household_state (
     id         text primary key default 'singleton',
     data       jsonb not null,
     updated_at timestamptz not null default now()
   );
   ```

3. **Set environment variables.** Copy `.env.example` to `.env.local` and fill in:

   | Variable | Where to find it |
   |---|---|
   | `SUPABASE_URL` | Project Settings → API → Project URL |
   | `SUPABASE_SERVICE_ROLE_KEY` | Project Settings → API → `service_role` secret key |
   | `APP_PASSCODE` | Anything you like — this is the shared household passcode |
   | `COOKIE_SECRET` | A long random string, e.g. `openssl rand -base64 32` |

4. **Install and run:**

   ```bash
   npm install
   npm run dev
   ```

   Visit `http://localhost:3000`, enter your passcode, and the app seeds
   itself with starter data on first load.

5. **Deploy to Vercel.** Push to a Git repo, import it into Vercel, and set
   the same four environment variables in the Vercel project settings.

## Testing

The projection engine and goal solver are pure functions with a unit test
suite covering the acceptance criteria in the spec (§11):

```bash
npm test
```

## Project structure

- `src/lib/projection.ts` — the month-by-month simulation (§4).
- `src/lib/goal.ts` — the goal solver (§5).
- `src/app/api/state/route.ts` — the single-document sync endpoint (§3.3).
- `src/app/api/unlock/route.ts`, `src/middleware.ts`, `src/lib/auth.ts` — the
  shared-passcode auth flow (§3.4).
- `src/components/` — the chart, headline, account cards, and goal panel.

## Notes on a couple of judgment calls

The spec's conflict-bar copy reads *"[Partner name] updated these numbers."*
Since auth is a single shared passcode with no per-person login, the app has
no way to know which of the two partners made a given edit — so the bar
reads "These numbers changed on another device" instead, preserving the
same "never silently overwrite" behavior without inventing an attribution
the auth model can't support.
