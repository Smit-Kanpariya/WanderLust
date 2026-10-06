import { describe, expect, it } from "vitest";
import {
  applyTransfers,
  optimizeSettlement,
  SettlementError,
  type NetBalance,
  type SettlementResult,
  type Transfer,
} from "@/lib/settlement";

function balancesFrom(values: readonly number[]): NetBalance[] {
  return values.map((netCents, index) => ({
    id: `p${index}`,
    name: `Person ${String(index).padStart(3, "0")}`,
    netCents,
  }));
}

/** Asserts every property a valid settlement plan must have. */
function expectValidPlan(balances: readonly NetBalance[], result: SettlementResult) {
  const start = new Map(balances.map((b) => [b.id, b.netCents]));
  const sent = new Map<string, number>();
  const received = new Map<string, number>();

  for (const t of result.transfers) {
    expect(Number.isSafeInteger(t.amountCents)).toBe(true);
    expect(t.amountCents).toBeGreaterThan(0);
    expect(t.from).not.toBe(t.to);
    expect(start.get(t.from)).toBeLessThan(0); // only net debtors pay
    expect(start.get(t.to)).toBeGreaterThan(0); // only net creditors receive
    sent.set(t.from, (sent.get(t.from) ?? 0) + t.amountCents);
    received.set(t.to, (received.get(t.to) ?? 0) + t.amountCents);
  }

  for (const b of balances) {
    if (b.netCents < 0) expect(sent.get(b.id) ?? 0).toBe(-b.netCents);
    if (b.netCents > 0) expect(received.get(b.id) ?? 0).toBe(b.netCents);
    if (b.netCents === 0) {
      expect(sent.has(b.id)).toBe(false);
      expect(received.has(b.id)).toBe(false);
    }
  }

  const totalSent = [...sent.values()].reduce((a, v) => a + v, 0);
  const totalReceived = [...received.values()].reduce((a, v) => a + v, 0);
  const totalOwed = balances.filter((b) => b.netCents > 0).reduce((a, b) => a + b.netCents, 0);
  expect(totalSent).toBe(totalReceived);
  expect(totalSent).toBe(totalOwed);

  for (const final of applyTransfers(balances, result.transfers).values()) {
    expect(final).toBe(0);
  }
}

/**
 * Independent exhaustive search (no shared code with the optimiser): settle the first
 * open balance entirely through every opposite-signed person, recurse, take the min.
 * Intermediaries are allowed here, so it is the true global minimum over all plans.
 */
function exhaustiveMinTransfers(values: readonly number[]): number {
  const debt = values.filter((v) => v !== 0);
  const search = (start: number): number => {
    while (start < debt.length && debt[start] === 0) start++;
    if (start === debt.length) return 0;
    let best = Infinity;
    for (let i = start + 1; i < debt.length; i++) {
      if (debt[i] * debt[start] < 0) {
        debt[i] += debt[start];
        best = Math.min(best, 1 + search(start + 1));
        debt[i] -= debt[start];
      }
    }
    return best;
  };
  return search(0);
}

/** Classic heuristic: largest debtor pays largest creditor, repeat. */
function naiveGreedyCount(values: readonly number[]): number {
  const debtors = values.filter((v) => v < 0).map((v) => -v);
  const creditors = values.filter((v) => v > 0);
  let count = 0;
  while (debtors.length > 0) {
    debtors.sort((a, b) => b - a);
    creditors.sort((a, b) => b - a);
    const amount = Math.min(debtors[0], creditors[0]);
    debtors[0] -= amount;
    creditors[0] -= amount;
    if (debtors[0] === 0) debtors.shift();
    if (creditors[0] === 0) creditors.shift();
    count++;
  }
  return count;
}

/** Deterministic PRNG so random tests are reproducible. */
function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomZeroSum(random: () => number, size: number, spread: number, scale: number): number[] {
  const values = Array.from({ length: size - 1 }, () => (Math.floor(random() * (2 * spread + 1)) - spread) * scale);
  values.push(0 - values.reduce((a, v) => a + v, 0));
  return values;
}

describe("optimizeSettlement: worked examples", () => {
  it("settles the product example with 2 transfers", () => {
    const balances: NetBalance[] = [
      { id: "alex", name: "Alex", netCents: 7000 },
      { id: "sam", name: "Sam", netCents: -2000 },
      { id: "jordan", name: "Jordan", netCents: -5000 },
    ];
    const result = optimizeSettlement(balances);
    expect(result.transfers).toEqual<Transfer[]>([
      { from: "jordan", to: "alex", amountCents: 5000 },
      { from: "sam", to: "alex", amountCents: 2000 },
    ]);
    expect(result.exact).toBe(true);
    expectValidPlan(balances, result);
  });

  it("beats the largest-debtor/largest-creditor greedy heuristic", () => {
    const values = [400, 300, 300, -600, -200, -200];
    expect(naiveGreedyCount(values)).toBe(5);
    const balances = balancesFrom(values);
    const result = optimizeSettlement(balances);
    expect(result.transfers).toHaveLength(4);
    expect(exhaustiveMinTransfers(values)).toBe(4);
    expectValidPlan(balances, result);
  });

  it("finds three-way groups the greedy misses", () => {
    const values = [500, 700, -300, -200, -400, -300];
    const balances = balancesFrom(values);
    const result = optimizeSettlement(balances);
    expect(result.transfers).toHaveLength(exhaustiveMinTransfers(values));
    expectValidPlan(balances, result);
  });

  it("handles single cents", () => {
    for (const values of [[1, -1], [2, -1, -1], [-2, 1, 1], [1, 1, -1, -1], [1, -1, 0, 0]]) {
      const balances = balancesFrom(values);
      const result = optimizeSettlement(balances);
      expect(result.transfers).toHaveLength(exhaustiveMinTransfers(values));
      expectValidPlan(balances, result);
    }
  });

  it("pairs repeated equal balances one to one", () => {
    const balances = balancesFrom([500, 500, 500, -500, -500, -500]);
    const result = optimizeSettlement(balances);
    expect(result.transfers).toHaveLength(3);
    expect(result.transfers.every((t) => t.amountCents === 500)).toBe(true);
    expectValidPlan(balances, result);
  });

  it("handles one debtor and many creditors", () => {
    const balances = balancesFrom([-900, 300, 250, 350]);
    const result = optimizeSettlement(balances);
    expect(result.transfers).toHaveLength(3);
    expect(new Set(result.transfers.map((t) => t.from))).toEqual(new Set(["p0"]));
    expectValidPlan(balances, result);
  });

  it("handles many debtors and one creditor", () => {
    const balances = balancesFrom([900, -300, -400, -200]);
    const result = optimizeSettlement(balances);
    expect(result.transfers).toHaveLength(3);
    expect(new Set(result.transfers.map((t) => t.to))).toEqual(new Set(["p0"]));
    expectValidPlan(balances, result);
  });

  it("returns no transfers when everyone is settled", () => {
    expect(optimizeSettlement(balancesFrom([0, 0, 0]))).toEqual({ transfers: [], exact: true, unsettledCount: 0 });
    expect(optimizeSettlement([])).toEqual({ transfers: [], exact: true, unsettledCount: 0 });
  });

  it("rejects balances that don't sum to zero or aren't whole cents", () => {
    expect(() => optimizeSettlement(balancesFrom([100, -99]))).toThrow(SettlementError);
    expect(() => optimizeSettlement(balancesFrom([0.5, -0.5]))).toThrow(RangeError);
    expect(() =>
      optimizeSettlement([
        { id: "a", name: "A", netCents: 1 },
        { id: "a", name: "B", netCents: -1 },
      ]),
    ).toThrow(SettlementError);
  });
});

describe("optimizeSettlement: determinism", () => {
  it("returns identical plans for identical input", () => {
    const balances = balancesFrom([1234, -567, -667, 2500, -1250, -1250]);
    expect(optimizeSettlement(balances)).toEqual(optimizeSettlement(balances));
  });

  it("does not depend on input order", () => {
    const random = mulberry32(7);
    for (let run = 0; run < 50; run++) {
      const balances = balancesFrom(randomZeroSum(random, 7, 5, 100));
      const shuffled = [...balances].sort(() => random() - 0.5);
      expect(optimizeSettlement(shuffled)).toEqual(optimizeSettlement(balances));
    }
  });
});

describe("optimizeSettlement: matches an exhaustive search", () => {
  it("finds the true minimum on 1,500 random small groups", () => {
    const random = mulberry32(2024);
    for (let run = 0; run < 1500; run++) {
      const size = 2 + Math.floor(random() * 7); // 2–8 people
      const spread = 1 + Math.floor(random() * 6); // small values ⇒ many zero-sum subgroups
      const scale = [1, 25, 100, 137][run % 4];
      const values = randomZeroSum(random, size, spread, scale);
      const balances = balancesFrom(values);
      const result = optimizeSettlement(balances);
      expect(result.exact).toBe(true);
      expect(result.transfers.length, `values ${values.join(",")}`).toBe(exhaustiveMinTransfers(values));
      expectValidPlan(balances, result);
    }
  });
});

describe("optimizeSettlement: large groups", () => {
  it("solves 20 open balances exactly and quickly", () => {
    const random = mulberry32(99);
    const balances = balancesFrom(randomZeroSum(random, 20, 40, 101));
    const started = performance.now();
    const result = optimizeSettlement(balances);
    expect(performance.now() - started).toBeLessThan(3000);
    expect(result.exact).toBe(true);
    expectValidPlan(balances, result);
  });

  it("labels a fallback plan as not exact unless it meets the lower bound", () => {
    const tricky = balancesFrom([400, 300, 300, -600, -200, -200]);
    const fallback = optimizeSettlement(tricky, { exactLimit: 3 });
    expect(fallback.exact).toBe(false);
    expect(fallback.transfers).toHaveLength(5);
    expectValidPlan(tricky, fallback);

    const easy = balancesFrom([-900, 300, 300, 300]);
    const proven = optimizeSettlement(easy, { exactLimit: 2 });
    expect(proven.exact).toBe(true);
    expect(proven.transfers).toHaveLength(3);
  });

  it("still settles a 60-person group exactly to zero", () => {
    const random = mulberry32(5);
    const balances = balancesFrom(randomZeroSum(random, 60, 5000, 7));
    const result = optimizeSettlement(balances);
    expect(result.transfers.length).toBeLessThanOrEqual(result.unsettledCount - 1);
    expectValidPlan(balances, result);
  });
});
