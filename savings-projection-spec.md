# Household Savings Projection — Project Specification

A single-page web app for two people to model how their combined savings and investments grow over time, and to work out what monthly amount is needed to reach a target.

This document is the complete brief. Build the whole thing.

---

## 1. What this is

Two people (a household) enter their savings and investment accounts — current balance, expected annual return, monthly contribution. The app projects those forward month by month and draws one chart: contributions stacked underneath investment growth, over time.

The chart answers one question at a glance: **are we saving enough?**

Its companion feature answers the follow-up: given a target amount by a target date, **how much would we need to save each month to get there?**

**Primary user:** the two account holders, on their own devices, sharing one set of numbers.

**Success looks like:** opening it takes five seconds, changing a monthly contribution from $500 to $700 instantly redraws the curve, and the effect of compounding is visually obvious rather than a number you have to interpret.

### Non-goals

- No bank connections, Plaid, or transaction import. All inputs are typed by hand.
- No tax modeling, employer match, vesting schedules, or account contribution limits.
- No Monte Carlo, variable returns, or historical backtesting. Fixed rate per account.
- No multi-currency. USD only.
- No withdrawals, one-off deposits, or retirement drawdown phase.
- No multi-household support. One household, one shared passcode.

---

## 2. Stack

Pick nothing exotic. These choices are already made — don't relitigate them.

| Concern | Choice |
|---|---|
| Framework | Next.js (App Router) + TypeScript |
| Styling | Tailwind CSS v4, with design tokens as CSS custom properties |
| Charting | Recharts (`ComposedChart` with stacked `Area`s) |
| Animation | Framer Motion, used sparingly (§7.6) |
| Database | Supabase Postgres, free tier |
| DB access | Server-side only, via `@supabase/supabase-js` with the service role key. No RLS, no client-side Supabase. |
| Auth | Single shared passcode, HMAC-signed httpOnly cookie (`jose`) |
| Hosting | Vercel |

Environment variables: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `APP_PASSCODE`, `COOKIE_SECRET`. Include a `.env.example` and a README with setup steps (create Supabase project, run the SQL in §3.1, set env vars, deploy).

---

## 3. Data & persistence

### 3.1 Storage

The entire household state is one JSON document in one row. The data is tiny (a handful of accounts) and a relational schema would only add migration overhead.

```sql
create table household_state (
  id         text primary key default 'singleton',
  data       jsonb not null,
  updated_at timestamptz not null default now()
);
```

### 3.2 Shape

```ts
type HouseholdState = {
  version: 1;
  people: Person[];        // exactly 2
  accounts: Account[];
  assumptions: Assumptions;
  goal: Goal | null;       // one goal at a time
};

type Person = {
  id: string;              // nanoid
  name: string;            // editable, defaults "Partner 1" / "Partner 2"
};

type Account = {
  id: string;
  name: string;                        // e.g. "Fidelity 401(k)"
  ownerId: string;                     // Person.id
  type: 'brokerage' | '401k' | 'roth-ira' | 'traditional-ira' | 'hsa' | 'savings' | 'other';
  balance: number;                     // current, USD
  annualReturnPct: number;             // e.g. 7 means 7%
  monthlyContribution: number;         // USD
  annualIncreasePct: number;           // contribution raise each year, default 0
};

type Assumptions = {
  horizonYears: number;                // 1–40, default 20
  inflationPct: number;                // default 2.5
  showRealDollars: boolean;            // default false
};

type Goal = {
  amount: number;
  targetDate: string;                  // 'YYYY-MM'
  label: string;                       // e.g. "House down payment", default "Our goal"
  scope:
    | { kind: 'household' }
    | { kind: 'person'; id: string }
    | { kind: 'account'; id: string };
};
```

`type` is metadata only — it drives an icon and grouping label, nothing in the math.

### 3.3 Sync

- `GET /api/state` → `{ data, updatedAt }`. Creates the singleton row with seed data (§10) if absent.
- `PUT /api/state` → body `{ data, baseUpdatedAt }`. If `baseUpdatedAt` doesn't match the stored `updated_at`, return `409` with the current server state.

Client behavior:

- All edits apply immediately to local state; the chart never waits on the network.
- Save is debounced 700ms after the last keystroke.
- A small status line near the header reads `Saved` / `Saving…` / `Couldn't save — retrying`. It is quiet: 11px, muted, no icons bouncing.
- Re-fetch on window focus and every 60s. If the server copy is newer and differs from local, show an unobtrusive bar: *"[Partner name] updated these numbers."* with a **Load their version** button. Never silently overwrite what someone is typing.
- On `409`, fetch fresh state and show the same bar.

### 3.4 Auth

- Middleware protects everything except `/unlock` and static assets.
- `/unlock` is a single centered passcode field on the paper background — no logo, no marketing, one line of copy: "Enter the passcode." Wrong code: "That passcode doesn't match." Rate limit to 10 attempts per IP per 15 minutes.
- Success sets a signed httpOnly cookie, 90-day expiry, `SameSite=Lax`.
- A small lock glyph in the header footer area signs out.

---

## 4. Projection engine

This is the core. Put it in `lib/projection.ts` as pure functions with no React or formatting concerns, and unit-test it (§11).

### 4.1 Monthly rate

Use the geometric conversion, not `annual / 12`:

```
r_m = (1 + annualReturnPct/100) ^ (1/12) − 1
```

### 4.2 Simulation

Month `0` is today. For each account, for each month `t` from 1 to `horizonYears × 12`:

```
contribution_t = monthlyContribution × (1 + annualIncreasePct/100) ^ floor((t − 1) / 12)
balance_t      = balance_{t−1} × (1 + r_m) + contribution_t
```

Contributions land at the **end** of the month (ordinary annuity) — they don't earn a return in the month they're made.

Track two cumulative series per account:

```
contributed_t = initialBalance + Σ contribution_1..t
growth_t      = balance_t − contributed_t
```

`contributed` is money that came out of a paycheck. `growth` is everything compounding added. They stack to the total, which is the entire visual thesis of the app.

### 4.3 Aggregation

The chart series is the sum of `contributed` and the sum of `growth` across whichever accounts are currently selected. Filtering is a subset-of-accounts operation — always sum the per-account series, never re-run the simulation on blended inputs.

### 4.4 Real dollars

When `showRealDollars` is on, divide every point by `(1 + inflationPct/100) ^ (t/12)`. Apply this at the presentation layer, after aggregation, so the underlying model stays nominal. The goal amount is deflated the same way when displayed, and the goal solver runs in the same space the user is currently viewing.

### 4.5 Precision

Compute in full floating point. Round only for display. Never round intermediate months.

---

## 5. Goal solver

The user sets a target amount and date. The app solves for the monthly contribution needed.

### 5.1 The math

Future value is affine in a uniform scale factor `k` applied to all in-scope monthly contributions:

```
FV(k) = FV_balances + k × FV_contributionsAtCurrentLevels
```

Run the simulation twice at the goal's target month `N`: once with contributions zeroed (giving `FV_balances`), once as configured (giving `FV_total`). Then:

```
FV_contrib = FV_total − FV_balances
k          = (targetAmount − FV_balances) / FV_contrib
```

No iteration needed. Report:

- **Required total monthly:** `k × Σ(current in-scope monthly contributions)`
- **The delta:** required − current, phrased as *"+$212/mo"* or *"−$85/mo"*
- **Per-person split:** allocate the delta proportionally to each person's current in-scope contribution.

### 5.2 Edge cases

- `FV_balances ≥ targetAmount` → **"You're already there on existing balances alone."** Show required monthly as $0 and skip the delta.
- `k ≤ 1` → **"You're on track."** Show what could be saved instead: *"You could contribute $85/mo less and still hit it."*
- `FV_contrib = 0` (no contributions in scope) → the multiplier is undefined; there's no destination for a marginal dollar. Solve for a flat monthly amount using a **balance-weighted average return** across in-scope accounts (or the arithmetic mean if all balances are zero), via the standard annuity formula. Label the result as going into "your accounts" generally rather than splitting it.
- No in-scope accounts → disable the goal panel with the empty-state copy in §7.5.
- Target date in the past or this month → inline validation, "Pick a date at least one month out."

### 5.3 Secondary readout

Also compute, at *current* contribution levels, the first month where the projection crosses the target. Report it as: *"At your current pace you'd reach $250,000 in **March 2034** — 14 months later than your target."* If the target is never reached inside the horizon, say *"not within the next 20 years"* rather than extending the simulation.

---

## 6. Views and filtering

A single segmented control above the chart: **Together · [Name 1] · [Name 2]**

Beneath the chart, account chips act as both legend and filter. Each chip shows the account name and its monthly contribution. Clicking toggles it out of the projection; toggled-off chips go to 40% opacity with a strikethrough on the amount. The segmented control sets which chips are visible; chip toggles refine within that.

Selecting "Together" resets all chips to on.

If every chip is off, the chart shows a flat line at zero with centered copy: *"No accounts selected."*

---

## 7. Screens and interaction

One page. Desktop layout is a two-column split; below 900px it stacks with the chart first.

```
┌──────────────────────────────────────────────────────────────┐
│  Savings                      Today's dollars ○──  Saved  🔒  │
├──────────────────────────────────────────────────┬───────────┤
│                                                  │           │
│   In 20 years                                    │  ACCOUNTS │
│   $1,284,900                                     │           │
│   $612,000 contributed · $672,900 from returns   │  ┌──────┐ │
│                                                  │  │ card │ │
│   ┌────────────────────────────────────────────┐ │  └──────┘ │
│   │                                    ╱▔▔▔│   │ │  ┌──────┐ │
│   │                            ╱▔▔▔▔▔▔▔    │←──┼─┼─ │ card │ │
│   │                     ╱▔▔▔▔▔▔  growth    │ } │ │  └──────┘ │
│   │             ╱▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔│   │ │           │
│   │     ▁▂▃▄▅▆▇█████████ contributed ██████│   │ │  + Add    │
│   └────────────────────────────────────────────┘ │           │
│   [Together][Alex][Sam]        ──────●─── 20 yrs  │  ┌──────┐ │
│   ◆ Fidelity 401(k) $1,200/mo  ◆ Vanguard $800/mo │  │ GOAL │ │
│                                                  │  └──────┘ │
└──────────────────────────────────────────────────┴───────────┘
```

### 7.1 The headline

Above the chart, not inside a card: the horizon value in the display face at ~56px, with the contributed/growth split on one muted line beneath it. This number animates when inputs change — a 400ms count transition, not a re-render snap.

When the user hovers the chart, **this headline becomes the hover readout** rather than a floating tooltip carrying all the weight. It swaps to the hovered month's values and its label changes from "In 20 years" to "In 6 years, 4 months · Dec 2032". On mouse-out it returns to the horizon. This keeps the chart itself clean and puts the numbers where the eye already is.

### 7.2 The chart

- Stacked areas: `contributed` on the bottom, `growth` on top. Growth is the accent color; contributed is quiet.
- X axis: ticks at year boundaries only, labeled by year. Sparse — roughly 6 ticks regardless of horizon.
- Y axis: 4–5 ticks, compact currency (`$450k`, `$1.2M`), hairline gridlines in `--rule`, no vertical gridlines, no axis lines.
- Monthly resolution (up to 480 points). Recharts handles this; disable dot rendering.
- **Hover:** a 1px vertical guideline in `--ink` at 25% opacity, plus a filled dot at the total. Snaps to the nearest month. A compact tooltip follows the cursor with the four values — time from now, contributed, growth, total — while the headline shows the same data larger. Tabular numerals, right-aligned.
- **Touch:** no hover. Tapping pins the guideline; dragging scrubs it; tapping outside the plot clears it.
- Below the chart, a horizon slider (1–40 years, snapping to 1/2/3/5/10/15/20/25/30/35/40) with the value inline.

### 7.3 The signature: the growth wedge

At the right edge of the plot, a thin bracket spans the vertical distance between the contributed line and the total, labeled `+$672,900 from returns`. It sits in the chart's right margin (reserve ~130px), hairline weight, in the accent color. It tracks the hovered month when scrubbing.

This is the one flourish. It makes compounding a *shape* — a wedge that visibly widens as the horizon extends — rather than a number in a legend. Everything else stays disciplined. Don't add a second decorative idea.

### 7.4 Account cards

A stacked list in the right column. Each card, at rest, is a summary: account name, owner's name in the owner's color, `$84,200 · 7.0% · $1,200/mo`. Click to expand into fields (Framer Motion height transition, 200ms):

- Name (text), Owner (two-option toggle), Type (select)
- Current balance, Expected annual return %, Monthly contribution, Annual increase % — number inputs
- Delete, with a confirm step in-line ("Delete this account?" / "Delete" · "Keep")

Only one card expands at a time. Inputs are formatted on blur (`84200` → `$84,200`) and raw while focused. Number inputs accept keyboard up/down arrows and step sensibly ($100 for balances, 0.1 for percentages, $50 for contributions). Every keystroke recomputes the projection — the chart should feel live.

`+ Add account` is a dashed-outline button at the bottom of the list. New accounts open expanded with the name field focused.

### 7.5 The goal panel

Bottom of the right column, visually distinct from account cards — inset in `--surface-sunk`, no border.

**Empty state:** a single line, *"Set a goal"*, with a target icon. Clicking expands it.

**Set state:** three fields — label, amount, target month/year. Then the solved result, which is the point of the whole panel:

> **$1,730/mo**
> to reach $250,000 by Jun 2031
> That's **+$212/mo** more than you're saving now — $124 from Alex, $88 from Sam.
>
> At your current pace you'd get there in **Mar 2034**.

The required monthly is in the display face, sized to match a card's headline. The delta is the emotional payload — color it: over-target in the accent green, under-target in a neutral clay, never red.

**On the chart, when a goal is set:**
1. A horizontal dashed rule at the target amount, labeled with the goal name at the left.
2. A small diamond marker where the current projection crosses it, if it does within the horizon.
3. A ghost curve — 1.5px dashed, accent color at 45% — showing the *required* trajectory. This is the elegant part: you see your actual curve and the curve you'd need, and the gap between them is the whole argument.

A scope selector (household / person / account) sits as a subtle text dropdown next to the goal label, defaulting to household.

### 7.6 Motion budget

Deliberately small. Anything beyond this list is out of scope:

- Headline number count transitions (400ms, ease-out)
- Chart path morphs when inputs change (Recharts `isAnimationActive`, 350ms)
- Account card expand/collapse (200ms height + opacity)
- Goal ghost curve draws in once on first appearance (600ms path length)
- Page load: chart areas sweep up from the baseline, once, 500ms

Respect `prefers-reduced-motion` by disabling all of the above.

---

## 8. Visual design

Light, airy, generous white space. Precision over decoration — a minimal direction lives or dies on spacing and type detail.

### 8.1 Palette

```css
--paper:        #F6F7F5;  /* page background, cool oat — not cream */
--surface:      #FFFFFF;  /* cards */
--surface-sunk: #EFF1EE;  /* goal panel, input wells */
--rule:         #E3E6E1;  /* hairlines, gridlines */
--ink:          #101413;  /* primary text */
--ink-soft:     #626B67;  /* labels, secondary */
--ink-faint:    #9BA39F;  /* axis ticks, placeholders */

--growth:       #0F5C4A;  /* deep pine — the accent, used for the growth band */
--contributed:  #ADB8B2;  /* sage gray — money you put in */
--pace:         #4A6FA5;  /* dusty blue — goal line + required-pace curve */
--warn:         #A85A3C;  /* muted clay, for "behind target" only */
```

Person colors: Person 1 `--growth` (#0F5C4A), Person 2 `#2E6F86` (slate teal). When a single person is selected, the growth band takes their color and the contributed band becomes that color at 22% saturation-mixed toward `--contributed`. In "Together" view, use `--growth` / `--contributed` as defined.

No gradients except one: a 6% vertical fade at the bottom of the growth band, to give the stack a hint of depth. Nothing else.

### 8.2 Type

- **Display — Fraunces** (variable, `wght 400`, `opsz 72`, `SOFT 20`). Used only for: the headline projection number, the required-monthly figure in the goal panel, and account card balance summaries. Its slightly optical, ink-trap character keeps large numbers from feeling like a bank statement.
- **Body/UI — Inter Tight**, weights 400/500. Everything else.
- **Utility** — Inter Tight, 11px, `500`, `letter-spacing: 0.08em`, uppercase, `--ink-soft`. Section labels only ("ACCOUNTS", "GOAL"), never sentences.

`font-variant-numeric: tabular-nums` on every element containing a number — headline, tooltip, axis, card summaries, inputs. Non-negotiable; scrubbing the chart with proportional figures makes the numbers jitter.

Type scale: 56 / 32 / 20 / 15 / 13 / 11. Body 15px, line-height 1.5.

### 8.3 Layout

- Max width 1240px, centered, 48px page padding (24px on mobile).
- 8px spacing grid. Section gaps 32px, card padding 20px, card gap 12px.
- Border radius: 10px on cards, 6px on inputs and chips, 999px on the segmented control. Consistent, never mixed arbitrarily.
- Shadows: one, very soft — `0 1px 2px rgba(16,20,19,0.04), 0 8px 24px rgba(16,20,19,0.03)`. Cards only. Never on hover states; use a `--rule` border shift instead.
- Chart occupies at least 420px of height on desktop.

### 8.4 Copy

Sentence case throughout. Active voice. Plain words: "Expected annual return," not "ROR." "Monthly contribution," not "Contribution amount (monthly)." Errors state what's wrong and what to do: *"Enter a return between −20% and 30%."* Empty states are invitations: *"Add an account to see your projection."*

### 8.5 Quality floor

Responsive to 375px. Visible keyboard focus rings (2px, `--growth`, 2px offset). All interactive elements reachable by tab in a logical order. The chart has an adjacent visually-hidden table listing values at each 5-year mark for screen readers. Color is never the only signal — the segmented control and chips also change weight and opacity.

---

## 9. Validation

| Field | Rule | Message |
|---|---|---|
| Balance | ≥ 0, ≤ 1e9 | "Enter an amount of $0 or more." |
| Annual return | −20 to 30 | "Enter a return between −20% and 30%." |
| Monthly contribution | ≥ 0, ≤ 1e6 | "Enter $0 or more." |
| Annual increase | 0 to 25 | "Enter between 0% and 25%." |
| Account name | 1–40 chars | "Give this account a name." |
| Goal amount | > 0 | "Enter a target amount." |
| Goal date | ≥ next month | "Pick a date at least one month out." |

Invalid fields show the message inline beneath the input and hold the last valid value in the projection until corrected.

---

## 10. Seed data

On first run, create:

- People: "Partner 1", "Partner 2" (prompt to rename via a one-time inline hint on the names)
- Accounts:
  - Partner 1 — "401(k)", `401k`, $65,000, 7.0%, $1,200/mo, 2% increase
  - Partner 1 — "Brokerage", `brokerage`, $18,000, 7.0%, $400/mo, 0%
  - Partner 2 — "401(k)", `401k`, $52,000, 7.0%, $1,000/mo, 2% increase
  - Partner 2 — "High-yield savings", `savings`, $24,000, 4.0%, $300/mo, 0%
- Assumptions: 20 years, 2.5% inflation, nominal dollars
- Goal: null

---

## 11. Acceptance criteria

Unit-test the projection engine against these. Tolerance ±$1.

**A. Single account, one year.** $10,000 balance, 7.0% annual, $500/mo, 0% increase, 12 months.
→ Total ≈ **$16,890**. Contributed = **$16,000**. Growth ≈ **$890**.
(Balance leg: 10,000 × 1.07 = 10,700. Annuity leg: 500 × ((1.07 − 1) / r_m) ≈ 6,190.)

**B. Real dollars.** Same as A with 3% inflation and `showRealDollars` on.
→ Total ≈ **$16,398** (nominal ÷ 1.03).

**C. Goal solver.** One account: $10,000, 7.0%, $500/mo, 0% increase. Goal: $50,000 in 5 years.
→ `FV_balances` ≈ 14,026. Required monthly ≈ **$505**. Delta ≈ **+$5/mo**.

**D. Annual increase.** $0 balance, 0% return, $100/mo, 10% annual increase, 24 months.
→ Contributed = **$2,520** (12 × 100 + 12 × 110). Growth = $0.

**E. Invariants**, asserted over randomized inputs:
- `contributed_t` equals initial balances plus cumulative contributions, exactly.
- `total_t = contributed_t + growth_t` at every month.
- `growth_t ≥ 0` whenever all returns are ≥ 0.
- Series are monotonically non-decreasing when returns and contributions are ≥ 0.
- Aggregating three accounts equals the sum of their individual series at every month.

**F. Interaction checks** (manual):
- Changing a monthly contribution redraws the chart within one frame of the keystroke.
- Hovering the chart updates the headline, guideline, tooltip, and wedge bracket together.
- Toggling a chip off removes exactly that account's contribution from every point.
- Setting a goal draws the dashed target line, the crossing marker, and the ghost pace curve.
- Reloading the page restores every input. Editing in one browser and refreshing another shows the change.

---

## 12. Build order

1. Next.js scaffold, Tailwind tokens from §8.1–8.2, fonts loaded.
2. `lib/projection.ts` + tests from §11. Get the math right before any UI.
3. Static chart against seed data, with hover and the headline readout.
4. Account cards with live editing (local state only).
5. Supabase table, `/api/state`, passcode middleware, `/unlock`.
6. Debounced save, focus refetch, conflict bar.
7. Filtering (segmented control + chips).
8. Goal panel + solver + the three chart overlays.
9. The growth wedge, motion pass, mobile layout.
10. Accessibility pass, README.

---

## 13. Assumptions made

Flagged because they weren't specified — change them if any are wrong:

- **Contribution timing** is end-of-month. Beginning-of-month would raise every projection by roughly one month's return.
- **Real-dollars is a toggle, defaulting off.** Nominal is the more intuitive first read; the toggle lives in the header.
- **One goal at a time.** Multiple simultaneous goals would clutter the chart's single-thesis design. Changing the goal replaces it.
- **Inflation only affects display**, not contributions or returns. Contribution growth is handled separately by `annualIncreasePct`.
- **Returns are per-account and constant.** A single household-wide return rate would be simpler but wrong for a mix of savings and equities.
