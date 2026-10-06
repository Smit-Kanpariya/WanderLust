/**
 * Exact minimum-transfer settlement.
 *
 * Input: net balances in integer cents that sum to zero (positive = should receive,
 * negative = owes). Output: the fewest debtor → creditor transfers that bring every
 * balance to exactly zero.
 *
 * Why this is exact
 * -----------------
 * Treat people as nodes and transfers as edges. Every connected component of that
 * graph must sum to zero on its own, and a component of k people needs at least
 * k − 1 edges. Conversely, any zero-sum group of k people can be settled with k − 1
 * transfers: repeatedly move min(|debt|, credit) from a debtor to a creditor; each
 * move zeroes at least one person and the final move zeroes two. Therefore
 *
 *   minimum transfers = (people with a non-zero balance)
 *                       − (largest number of disjoint zero-sum groups covering them)
 *
 * The optimiser finds that largest partition exactly with a dynamic program over
 * subsets (bitmasks), after two cheap reductions that are provably safe:
 *   1. people already at zero are ignored;
 *   2. a debtor and a creditor whose balances exactly cancel are paired directly.
 *      Exchange argument: take any optimal partition; if the pair sits in groups A
 *      and B, regroup into {pair} and (A ∪ B) − pair. That is still zero-sum and has
 *      at least as many groups, so pairing them never costs an extra transfer.
 *
 * The DP costs O(2^n · n) for n remaining balances, so it is capped at
 * EXACT_SEARCH_LIMIT (about 10–60 ms at the cap). Above the cap we fall back to a
 * greedy plan and only label it exact if it meets a proven lower bound.
 *
 * The module is pure and synchronous so it can move into a Web Worker or a server
 * unchanged.
 */

import { assertCents, sumCents, type Cents } from "./money";

export interface NetBalance {
  id: string;
  name: string;
  netCents: Cents;
}

export interface Transfer {
  /** Participant id of the payer (a net debtor). */
  from: string;
  /** Participant id of the receiver (a net creditor). */
  to: string;
  amountCents: Cents;
}

export interface SettlementResult {
  transfers: Transfer[];
  /** True when the number of transfers is proven to be the minimum possible. */
  exact: boolean;
  /** People who started with a non-zero balance. */
  unsettledCount: number;
}

export interface OptimizeOptions {
  /** Max non-zero balances (after exact pairs) solved by the exact search. Hard cap 24. */
  exactLimit?: number;
}

export const EXACT_SEARCH_LIMIT = 20;
const HARD_EXACT_LIMIT = 24;

export class SettlementError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SettlementError";
  }
}

interface RankedBalance {
  id: string;
  netCents: Cents;
  /** Position in the deterministic ordering; used for every tie-break. */
  rank: number;
}

/** Stable ordering: name (case-insensitive, numeric-aware), then id. */
export function compareParticipants(a: NetBalance, b: NetBalance): number {
  const byName = a.name.localeCompare(b.name, "en", { sensitivity: "base", numeric: true });
  if (byName !== 0) return byName;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

export function optimizeSettlement(
  balances: readonly NetBalance[],
  options: OptimizeOptions = {},
): SettlementResult {
  const exactLimit = Math.min(options.exactLimit ?? EXACT_SEARCH_LIMIT, HARD_EXACT_LIMIT);

  const seen = new Set<string>();
  for (const balance of balances) {
    assertCents(balance.netCents, `balance for ${balance.name}`);
    if (seen.has(balance.id)) throw new SettlementError(`Duplicate participant id "${balance.id}"`);
    seen.add(balance.id);
  }
  const total = sumCents(balances.map((b) => b.netCents));
  if (total !== 0) {
    throw new SettlementError(`Balances must sum to zero; they are off by ${total} cents`);
  }

  const ranked: RankedBalance[] = [...balances]
    .sort(compareParticipants)
    .map((b, rank) => ({ id: b.id, netCents: b.netCents, rank }));
  const unsettled = ranked.filter((b) => b.netCents !== 0);

  const transfers: Transfer[] = [];
  const rest = pairExactOpposites(unsettled, transfers);

  let exact = true;
  if (rest.length > exactLimit) {
    const fallback = settleWithinGroup(rest);
    // Each transfer has exactly one payer and one receiver, so at least
    // max(#debtors, #creditors) transfers are always needed. Meeting that bound proves optimality.
    const debtors = rest.filter((b) => b.netCents < 0).length;
    const lowerBound = Math.max(debtors, rest.length - debtors);
    exact = fallback.length === lowerBound;
    transfers.push(...fallback);
  } else if (rest.length > 0) {
    for (const group of maxZeroSumPartition(rest)) {
      transfers.push(...settleWithinGroup(group));
    }
  }

  const rankById = new Map(ranked.map((b) => [b.id, b.rank]));
  const rankOf = (id: string) => rankById.get(id) ?? 0;
  transfers.sort((a, b) => rankOf(a.from) - rankOf(b.from) || rankOf(a.to) - rankOf(b.to));

  assertValidSettlement(balances, transfers);
  return { transfers, exact, unsettledCount: unsettled.length };
}

/** Pairs each debtor with the first creditor (in rank order) whose balance exactly cancels it. */
function pairExactOpposites(items: readonly RankedBalance[], transfers: Transfer[]): RankedBalance[] {
  const used = new Set<number>();
  for (let i = 0; i < items.length; i++) {
    if (used.has(i) || items[i].netCents >= 0) continue;
    for (let j = 0; j < items.length; j++) {
      if (!used.has(j) && items[j].netCents === -items[i].netCents) {
        used.add(i);
        used.add(j);
        transfers.push({ from: items[i].id, to: items[j].id, amountCents: items[j].netCents });
        break;
      }
    }
  }
  return items.filter((_, index) => !used.has(index));
}

/**
 * Partitions zero-sum `items` into the largest possible number of zero-sum groups.
 *
 * best[mask] = the most zero-sum groups obtainable when the people in `mask` are
 * added one at a time and a group is closed every time the running sum hits zero.
 *   best[mask] = max over i in mask of best[mask − i]  (+1 if sum(mask) = 0)
 * Every partition into g zero-sum groups corresponds to such an ordering (list the
 * groups one after another), so best[full] is the true maximum.
 */
function maxZeroSumPartition(items: readonly RankedBalance[]): RankedBalance[][] {
  const n = items.length;
  const size = 1 << n;
  // Integer cents stored in float64 slots: exact, since every value is a safe integer.
  const sums = new Float64Array(size);
  const best = new Uint8Array(size);

  for (let mask = 1; mask < size; mask++) {
    const lowBit = mask & -mask;
    sums[mask] = sums[mask ^ lowBit] + items[31 - Math.clz32(lowBit)].netCents;
    let bestWithoutOne = 0;
    for (let rest = mask; rest !== 0; rest &= rest - 1) {
      const candidate = best[mask ^ (rest & -rest)];
      if (candidate > bestWithoutOne) bestWithoutOne = candidate;
    }
    best[mask] = bestWithoutOne + (sums[mask] === 0 ? 1 : 0);
  }

  // Walk back from the full set, removing one person at a time while preserving the
  // optimum. Reversed, that gives an ordering whose zero-sum prefixes mark the groups.
  // Scanning from the highest index keeps the reconstruction deterministic.
  const order: number[] = [];
  let mask = size - 1;
  while (mask !== 0) {
    const target = best[mask] - (sums[mask] === 0 ? 1 : 0);
    let chosen = -1;
    for (let i = n - 1; i >= 0; i--) {
      const bit = 1 << i;
      if ((mask & bit) !== 0 && best[mask ^ bit] === target) {
        chosen = i;
        break;
      }
    }
    if (chosen < 0) throw new SettlementError("Settlement search reached an inconsistent state");
    order.push(chosen);
    mask ^= 1 << chosen;
  }
  order.reverse();

  const groups: RankedBalance[][] = [];
  let current: RankedBalance[] = [];
  let running = 0;
  for (const index of order) {
    current.push(items[index]);
    running += items[index].netCents;
    if (running === 0) {
      groups.push(current);
      current = [];
    }
  }
  return groups;
}

/**
 * Settles one zero-sum group: largest debtor pays largest creditor
 * min(|debt|, credit), repeatedly. Every transfer zeroes at least one person, so a
 * group of k people takes at most k − 1 transfers, and nobody ever both pays and
 * receives.
 */
function settleWithinGroup(members: readonly RankedBalance[]): Transfer[] {
  const byRemaining = (a: { remaining: Cents; rank: number }, b: { remaining: Cents; rank: number }) =>
    b.remaining - a.remaining || a.rank - b.rank;
  const debtors = members
    .filter((m) => m.netCents < 0)
    .map((m) => ({ id: m.id, rank: m.rank, remaining: -m.netCents }))
    .sort(byRemaining);
  const creditors = members
    .filter((m) => m.netCents > 0)
    .map((m) => ({ id: m.id, rank: m.rank, remaining: m.netCents }))
    .sort(byRemaining);

  const transfers: Transfer[] = [];
  let d = 0;
  let c = 0;
  while (d < debtors.length && c < creditors.length) {
    const amount = Math.min(debtors[d].remaining, creditors[c].remaining);
    transfers.push({ from: debtors[d].id, to: creditors[c].id, amountCents: amount });
    debtors[d].remaining -= amount;
    creditors[c].remaining -= amount;
    if (debtors[d].remaining === 0) d++;
    if (creditors[c].remaining === 0) c++;
  }
  return transfers;
}

/** Applies transfers to the starting balances and returns each person's final balance. */
export function applyTransfers(
  balances: readonly Pick<NetBalance, "id" | "netCents">[],
  transfers: readonly Transfer[],
): Map<string, Cents> {
  // `|| 0` normalises a -0 input so settled balances compare as plain zero.
  const remaining = new Map(balances.map((b) => [b.id, b.netCents || 0]));
  for (const transfer of transfers) {
    const from = remaining.get(transfer.from);
    const to = remaining.get(transfer.to);
    if (from === undefined || to === undefined) {
      throw new SettlementError("Transfer references an unknown participant");
    }
    remaining.set(transfer.from, from + transfer.amountCents);
    remaining.set(transfer.to, to - transfer.amountCents);
  }
  return remaining;
}

/** Defensive post-condition: throws unless the plan settles everyone exactly. */
export function assertValidSettlement(
  balances: readonly Pick<NetBalance, "id" | "netCents">[],
  transfers: readonly Transfer[],
): void {
  const start = new Map(balances.map((b) => [b.id, b.netCents]));
  for (const t of transfers) {
    if (!Number.isSafeInteger(t.amountCents) || t.amountCents <= 0) {
      throw new SettlementError("Every transfer must be a positive whole number of cents");
    }
    if ((start.get(t.from) ?? 0) >= 0) throw new SettlementError("Only people who owe money may pay");
    if ((start.get(t.to) ?? 0) <= 0) throw new SettlementError("Only people who are owed money may receive");
  }
  for (const [id, balance] of applyTransfers(balances, transfers)) {
    if (balance !== 0) throw new SettlementError(`Participant ${id} would end at ${balance} cents, not zero`);
  }
}
