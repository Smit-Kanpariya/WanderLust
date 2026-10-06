import { ArrowDown, ArrowRight, CircleCheck } from "lucide-react";
import { Avatar } from "@/components/avatar";

// A real example: balances Lena +$60, Omar +$25, Priya −$30, Theo −$30, Kai −$25.
const EXAMPLE_PEOPLE = ["Lena", "Omar", "Priya", "Theo", "Kai"];
const EXAMPLE_TRANSFERS = [
  { from: "Kai", to: "Omar", amount: "$25.00" },
  { from: "Priya", to: "Lena", amount: "$30.00" },
  { from: "Theo", to: "Lena", amount: "$30.00" },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[520px] bg-[radial-gradient(60%_60%_at_70%_0%,rgb(15_118_110/0.12),transparent_70%)]"
      />
      <div className="mx-auto grid max-w-6xl gap-12 px-4 pt-12 pb-14 sm:px-6 sm:pt-20 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:pb-20">
        <div className="animate-fade-up">
          <p className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-ink-soft">
            <span className="size-1.5 rounded-full bg-accent" aria-hidden="true" />
            Exact to the cent · Runs in your browser
          </p>
          <h1 className="mt-5 text-[2.5rem] leading-[1.05] font-semibold tracking-tight text-balance text-ink sm:text-5xl lg:text-[3.5rem]">
            Settle group expenses with fewer transfers.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-pretty text-ink-soft">
            Enter what everyone paid. Settle the group using the minimum possible number of transactions—down to
            the cent.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a href="#calculator" className="btn btn-primary btn-lg">
              Start settling
              <ArrowRight className="size-4" aria-hidden="true" />
            </a>
            <a href="#how-it-works" className="btn btn-secondary btn-lg">
              See how it works
            </a>
          </div>
          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
            {["Free, no sign-up", "Nothing leaves your browser", "Never moves money"].map((item) => (
              <li key={item} className="flex items-center gap-1.5">
                <CircleCheck className="size-4 text-accent" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <figure className="card animate-fade-up p-5 [animation-delay:120ms] sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-ink-soft">Weekend trip · 5 people</p>
            <span className="rounded-full bg-canvas px-2.5 py-1 text-xs font-medium text-muted">Example</span>
          </div>
          <div className="mt-4 flex -space-x-2">
            {EXAMPLE_PEOPLE.map((name) => (
              <Avatar key={name} name={name} />
            ))}
          </div>
          <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-center">
            <div className="rounded-xl bg-canvas p-3">
              <p className="text-2xl font-semibold tabular-nums">10</p>
              <p className="text-xs text-muted">possible pairwise payments</p>
            </div>
            <ArrowRight className="size-5 text-muted" aria-label="optimized to" />
            <div className="rounded-xl bg-accent-soft p-3">
              <p className="text-2xl font-semibold text-accent-strong tabular-nums">3</p>
              <p className="text-xs text-accent-strong">optimized transfers</p>
            </div>
          </div>
          <ul className="mt-5 space-y-2">
            {EXAMPLE_TRANSFERS.map((t) => (
              <li
                key={t.from}
                className="flex items-center justify-between gap-3 rounded-xl border border-line px-3 py-2.5"
              >
                <span className="flex min-w-0 items-center gap-2 text-sm">
                  <Avatar name={t.from} size="sm" />
                  <span className="font-medium">{t.from}</span>
                  <span className="text-muted">pays</span>
                  <Avatar name={t.to} size="sm" />
                  <span className="font-medium">{t.to}</span>
                </span>
                <span className="font-semibold tabular-nums">{t.amount}</span>
              </li>
            ))}
          </ul>
          <figcaption className="mt-4 flex items-center gap-2 text-sm font-medium text-gain">
            <ArrowDown className="size-4 sm:hidden" aria-hidden="true" />
            <CircleCheck className="hidden size-4 sm:block" aria-hidden="true" />
            Everyone ends at exactly $0.00
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
