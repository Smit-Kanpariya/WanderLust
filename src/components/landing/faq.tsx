import { ChevronDown } from "lucide-react";
import { EXACT_SEARCH_LIMIT } from "@/lib/settlement";

const FAQS = [
  {
    q: "How are settlements calculated?",
    a: "Each person's net balance is what they paid minus their fair share. A positive balance means they should get money back; a negative balance means they owe. SettleSmart then looks for the smallest set of transfers, always from someone who owes to someone who is owed, that brings every balance to exactly $0.00.",
  },
  {
    q: "Is the result really minimal?",
    a: `Yes, for groups with up to ${EXACT_SEARCH_LIMIT} people whose balances don't cancel out directly. Anyone whose balance exactly cancels someone else's is paired first. The rest are split into as many self-contained sub-groups as possible, and a sub-group of k people needs k − 1 transfers, so the plan can't be beaten. Automated tests compare the result with an independent exhaustive search on 1,500 random groups. Larger groups get a fast plan that still settles everyone exactly. It's labelled clearly if the fewest-transfers guarantee can't be proven.`,
  },
  {
    q: "How do you handle rounding?",
    a: "Amounts are stored as whole cents, never as floating-point dollars. When an equal split doesn't divide evenly, the leftover cents go one each to the first people in the list, and the calculator tells you who. Shares always add up to exactly the total.",
  },
  {
    q: "Does SettleSmart move money?",
    a: "No. SettleSmart only tells you who should pay whom and how much. It doesn't connect to banks or payment apps, and it never holds or sends money. Use whatever payment method your group prefers.",
  },
  {
    q: "Is my data stored?",
    a: "No. All calculations run in your browser. The names and amounts you enter aren't sent to a server, saved in cookies or local storage, or tracked. Refreshing the page clears them.",
  },
  {
    q: "Can I use different currencies?",
    a: "You can choose USD, CAD, EUR, GBP, AUD or INR. Each group uses a single currency; SettleSmart doesn't convert between currencies. All of the supported currencies use two decimal places, which is what the calculator accepts today.",
  },
];

export function Faq() {
  return (
    <section id="faq" aria-labelledby="faq-heading" className="scroll-mt-20 border-t border-line bg-surface">
      <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
        <p className="eyebrow">FAQ</p>
        <h2 id="faq-heading" className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          Questions, answered plainly.
        </h2>
        <div className="mt-10 divide-y divide-line rounded-2xl border border-line">
          {FAQS.map((item) => (
            <details key={item.q} className="group px-5 sm:px-6">
              <summary className="flex cursor-pointer items-center justify-between gap-4 py-5 font-medium">
                {item.q}
                <ChevronDown
                  className="size-5 shrink-0 text-muted transition-transform group-open:rotate-180"
                  aria-hidden="true"
                />
              </summary>
              <p className="pb-5 text-ink-soft">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
