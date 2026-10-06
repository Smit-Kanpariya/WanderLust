import { assertCents, sumCents, type Cents } from "./money";
import type { SplitMode } from "@/types";

export interface ParsedParticipant {
  id: string;
  name: string;
  paidCents: Cents;
  /** Required in custom mode; ignored in equal mode. */
  owedCents: Cents | null;
}

export interface ParticipantBalance {
  id: string;
  name: string;
  paidCents: Cents;
  owedCents: Cents;
  /** paid − owed. Positive: should receive money. Negative: owes money. */
  netCents: Cents;
}

/**
 * Splits `totalCents` into `count` shares that differ by at most one cent and add up
 * to exactly `totalCents`. Leftover cents go to the earliest positions, so the result
 * is deterministic for a given participant order.
 */
export function splitEvenly(totalCents: Cents, count: number): Cents[] {
  assertCents(totalCents, "total");
  if (totalCents < 0) throw new RangeError("total must not be negative");
  if (!Number.isInteger(count) || count <= 0) throw new RangeError("count must be a positive integer");

  const remainder = totalCents % count;
  const base = (totalCents - remainder) / count;
  return Array.from({ length: count }, (_, index) => base + (index < remainder ? 1 : 0));
}

export function computeBalances(
  participants: readonly ParsedParticipant[],
  mode: SplitMode,
): ParticipantBalance[] {
  if (participants.length === 0) return [];

  const totalPaid = sumCents(participants.map((p) => p.paidCents));
  const shares =
    mode === "equal"
      ? splitEvenly(totalPaid, participants.length)
      : participants.map((p) => {
          if (p.owedCents === null) throw new Error(`Missing fair share for ${p.name}`);
          return p.owedCents;
        });

  const balances = participants.map((p, index) => ({
    id: p.id,
    name: p.name,
    paidCents: p.paidCents,
    owedCents: shares[index],
    netCents: p.paidCents - shares[index],
  }));

  // The invariant every settlement depends on.
  if (sumCents(balances.map((b) => b.netCents)) !== 0) {
    throw new Error("Payments and fair shares must add up to the same total");
  }
  return balances;
}
