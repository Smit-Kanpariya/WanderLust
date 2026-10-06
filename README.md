# SettleSmart

**Settle expenses. Make fewer transfers.**

SettleSmart is a web app for groups that shared costs unevenly. Enter what each person paid (and, optionally, what each person should cover), and it calculates the **minimum possible number of transfers** that brings everyone's balance to exactly **$0.00**, down to the cent.

- **Exact minimum, not a greedy guess.** The optimizer finds the fewest transfers possible, and that's checked against an independent exhaustive search in the tests.
- **Cent-accurate.** All money is integer cents. There's no floating-point dollar math anywhere.
- **Private by default.** Everything runs in the browser. Nothing is sent to a server or stored.
- **Doesn't move money.** SettleSmart says who should pay whom. It has no payment integration.

## Features

- **Equal split**: shares are computed automatically. Leftover cents go one each to the first people in the list, and the UI says who.
- **Custom split**: set each person's fair share. Shares must match the total paid to the cent, and an inline status shows what's left to assign.
- Live per-person balances ("Gets back $70.00" / "Owes $20.00"), plus KPI cards for total spent, people and transfers required.
- Results with transfer cards, an "All balances settled ✓" confirmation, a final-balance list, and a collapsible **Why these payments?** panel. That panel has an advanced table (paid, fair share, balance before, sent, received, final) and the plain-text plan.
- Copy plan (Clipboard API with a fallback), Share (Web Share API when the browser has it, otherwise copy), Edit expenses, and Start over.
- Inline validation for blank or duplicate names, invalid, negative or over-precise amounts, groups that are empty or have one person, a zero total, and mismatched custom totals. No browser alerts.
- Currencies: USD, CAD, EUR, GBP, AUD and INR. All are two-decimal currencies, and the money layer takes `minorUnits` as a parameter so other precisions can be added later.
- Keyboard friendly: Enter moves to the next field, and Enter on the last field adds a person. Focus states are visible, there's a skip link, and `prefers-reduced-motion` is respected.
- Mobile-first: participant rows become cards on small screens, and the layout is tested at 360px for horizontal overflow.

## How the optimizer works

All the settlement logic is in [`src/lib/settlement.ts`](src/lib/settlement.ts). It's pure and synchronous, so it can move into a Web Worker or a backend unchanged.

1. Each person's net balance is `paid − fair share`, in integer cents. The invariant `sum(balances) === 0` is asserted before optimizing.
2. People at zero are ignored. A debtor and a creditor whose balances exactly cancel are paired directly. An exchange argument shows this never costs an extra transfer.
3. Key fact: in any settlement, each connected group of people must net to zero, and a group of *k* people needs at least *k − 1* transfers. Any zero-sum group of *k* people can also be settled in exactly *k − 1* transfers. So:

   `minimum transfers = (people with non-zero balance) − (max number of disjoint zero-sum groups)`

4. The maximum partition into zero-sum groups is found **exactly** with a dynamic program over subsets (`O(2ⁿ·n)`). Each group is then settled by moving `min(|debt|, credit)` from debtor to creditor, so nobody ever both pays and receives.
5. Ties are broken deterministically: people are ordered by name, then id, and the output doesn't depend on input order.
6. **Size guard:** the exact search covers up to 20 people whose balances don't cancel directly, which takes tens of milliseconds. Above that the app uses a fast greedy plan. That plan still settles everyone exactly, but it's labelled **"Fast plan, minimum not verified"** unless it meets the provable lower bound `max(#debtors, #creditors)`. Never a silent approximation.

Every plan passes a post-condition check before it's returned: every amount is a positive integer, only debtors pay, only creditors receive, and every final balance is exactly 0.

## Getting started

Requires Node.js 20.9 or later.

```bash
npm install
npm run dev        # http://localhost:3000
```

## Scripts

| Command             | What it does                                                   |
| ------------------- | -------------------------------------------------------------- |
| `npm run dev`       | Start the dev server                                           |
| `npm run build`     | Production build                                               |
| `npm run start`     | Serve the production build                                     |
| `npm run lint`      | ESLint                                                         |
| `npm run typecheck` | TypeScript (strict) without emitting                           |
| `npm test`          | Unit tests (Vitest)                                            |
| `npm run test:e2e`  | End-to-end tests (Playwright, desktop and mobile)              |
| `npm run check`     | Lint, typecheck, unit tests and build in one go                |

## Testing

Unit tests (`tests/`) cover:

- `parseCurrencyToCents`, `validateCurrency`, `formatCents` and `sumCents`, including inputs like `0`, `0.01`, `1,234.56`, `999999.99`, malformed values, and values that break `parseFloat × 100`.
- Settlement properties checked on every result: amounts are positive whole cents, debtors only send, creditors only receive, each debtor sends exactly what they owe, totals sent and received match, and every final balance is 0.
- Worked examples: the product example, greedy counterexamples, $0.01 edge cases, repeated balances, one debtor with many creditors (and the reverse), already-settled groups, and determinism under input shuffling.
- **Brute-force verification:** 1,500 random groups of 2–8 people, each compared with an independent exhaustive search that shares no code with the optimizer.
- Equal-split remainder distribution, validation messages, and plan text.

End-to-end tests (`e2e/`) load the app, enter a group, optimize, check the transfers and the settled status, copy the plan and read the clipboard, check edits and recalculation, inline validation, custom split, and that there's no horizontal overflow at 360px.

```bash
npm test
npx playwright install chromium   # first time only
npm run test:e2e                  # builds, starts the server on port 3100, runs desktop and mobile projects
```

## Deploying to Vercel

The project is a standard Next.js app and needs no environment variables.

1. Push the repository to GitHub, GitLab or Bitbucket.
2. In Vercel, choose **Add New → Project** and import the repository. Vercel detects Next.js; keep the default build command (`next build`) and output settings.
3. Click **Deploy**.

Or from the command line:

```bash
npm i -g vercel
vercel          # preview deployment
vercel --prod   # production deployment
```

Optional environment variables:

| Variable                 | Purpose                                                                         |
| ------------------------ | ------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL`   | Canonical URL for metadata and Open Graph. Defaults to Vercel's production URL. |
| `NEXT_PUBLIC_GITHUB_URL` | Shows GitHub links in the navbar and footer when set.                           |

## Project structure

```
src/
  app/                 # App Router pages, layout, metadata, icon, Open Graph image
  components/
    calculator/        # Calculator, participant rows, results
    landing/           # Hero, How it works, Benefits, FAQ
  lib/
    money.ts           # Parsing, validation, formatting of integer cents
    balances.ts        # Equal split and net balance generation
    validation.ts      # Group and field validation
    settlement.ts      # Exact minimum-transfer optimizer
    plan.ts            # Ledger and copyable plan text
  types/               # Shared types
tests/                 # Vitest unit tests
e2e/                   # Playwright end-to-end tests
```

## Privacy

Calculations run entirely in the browser. Names and amounts are never sent to a server, stored in cookies or local storage, or tracked. Refreshing the page clears them. The site has no analytics.
