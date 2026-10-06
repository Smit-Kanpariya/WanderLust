import { ArrowLeftRight, Receipt, Users } from "lucide-react";

const STEPS = [
  {
    icon: Users,
    title: "Add the group",
    body: "List everyone who shared the costs. Just names. No accounts, emails or phone numbers.",
  },
  {
    icon: Receipt,
    title: "Enter payments",
    body: "Add what each person paid. Split the total equally, or set a custom fair share for each person.",
  },
  {
    icon: ArrowLeftRight,
    title: "Get the simplest settlement",
    body: "SettleSmart works out who is up and who is down, then finds the fewest transfers that bring everyone to exactly zero.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" aria-labelledby="how-heading" className="scroll-mt-20 border-t border-line bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <p className="eyebrow">How it works</p>
        <h2 id="how-heading" className="mt-2 max-w-2xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          Three steps from a messy tab to a clean plan.
        </h2>
        <ol className="mt-12 grid gap-6 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <li key={step.title} className="rounded-2xl border border-line bg-canvas/60 p-6">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-xl bg-ink text-white">
                  <step.icon className="size-5" aria-hidden="true" />
                </span>
                <span className="text-sm font-semibold text-muted">Step {index + 1}</span>
              </div>
              <h3 className="mt-5 text-lg font-semibold">{step.title}</h3>
              <p className="mt-2 text-ink-soft">{step.body}</p>
            </li>
          ))}
        </ol>
        <div className="mt-10 max-w-3xl rounded-2xl border border-accent/20 bg-accent-soft/60 p-6 text-ink-soft">
          <h3 className="font-semibold text-ink">Why fewer transfers?</h3>
          <p className="mt-2">
            If everyone paid back everyone, a group of five could need ten separate payments. SettleSmart only looks
            at each person&apos;s overall balance. People whose balances cancel out are matched directly, and the
            rest are grouped so no transfer is wasted. Nobody pays money on someone else&apos;s behalf.
          </p>
        </div>
      </div>
    </section>
  );
}
