import type { ParticipantBalance } from "./balances";
import { formatCents, sumCents, type Cents, type CurrencyCode } from "./money";
import type { Transfer } from "./settlement";

export interface LedgerRow extends ParticipantBalance {
  sentCents: Cents;
  receivedCents: Cents;
  finalCents: Cents;
}

/** Per-person breakdown: balance before, money sent and received, and the final balance. */
export function buildLedger(balances: readonly ParticipantBalance[], transfers: readonly Transfer[]): LedgerRow[] {
  return balances.map((balance) => {
    const sentCents = sumCents(transfers.filter((t) => t.from === balance.id).map((t) => t.amountCents));
    const receivedCents = sumCents(transfers.filter((t) => t.to === balance.id).map((t) => t.amountCents));
    return { ...balance, sentCents, receivedCents, finalCents: balance.netCents + sentCents - receivedCents };
  });
}

/** How many payments people would make if every pair settled up directly. */
export function pairwisePaymentCount(people: number): number {
  return people < 2 ? 0 : (people * (people - 1)) / 2;
}

export function buildPlanText(options: {
  transfers: readonly Transfer[];
  names: ReadonlyMap<string, string>;
  currency: CurrencyCode;
  exact: boolean;
}): string {
  const { transfers, names, currency, exact } = options;
  const lines = ["Group settlement", ""];
  if (transfers.length === 0) {
    lines.push("Everyone is already settled. No transfers needed.");
    return lines.join("\n");
  }
  for (const t of transfers) {
    lines.push(`${names.get(t.from) ?? t.from} → ${names.get(t.to) ?? t.to}: ${formatCents(t.amountCents, currency)}`);
  }
  lines.push("", `${transfers.length} ${transfers.length === 1 ? "transaction" : "transactions"}`, "All balances settled.");
  if (!exact) lines.push("(Fast plan for a large group: fewest transfers not verified.)");
  return lines.join("\n");
}
