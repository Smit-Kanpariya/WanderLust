import { Lock, ShieldCheck, Zap } from "lucide-react";

const BENEFITS = [
  {
    icon: Zap,
    title: "Fewer payments",
    body: "Reduce unnecessary money transfers. For normal-sized groups, the plan uses the fewest transfers possible, and that's checked against an exhaustive search in automated tests.",
  },
  {
    icon: ShieldCheck,
    title: "Exact to the cent",
    body: "No floating-point money errors. Every amount is handled as whole cents, and every plan is verified to leave everyone at exactly $0.00.",
  },
  {
    icon: Lock,
    title: "Private by default",
    body: "Your expense calculations stay in your browser. Nothing you type is sent to a server or saved.",
  },
];

export function Benefits() {
  return (
    <section aria-labelledby="benefits-heading" className="border-t border-line">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <p className="eyebrow">Why it helps</p>
        <h2 id="benefits-heading" className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          Less admin after every trip, dinner and shared bill.
        </h2>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {BENEFITS.map((benefit) => (
            <article key={benefit.title} className="card p-6">
              <span className="flex size-10 items-center justify-center rounded-xl bg-accent-soft text-accent-strong">
                <benefit.icon className="size-5" aria-hidden="true" />
              </span>
              <h3 className="mt-5 text-lg font-semibold">{benefit.title}</h3>
              <p className="mt-2 text-ink-soft">{benefit.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
