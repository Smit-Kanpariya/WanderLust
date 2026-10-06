import { describe, expect, it } from "vitest";
import { computeBalances, splitEvenly } from "@/lib/balances";
import { buildLedger, buildPlanText } from "@/lib/plan";
import { optimizeSettlement } from "@/lib/settlement";
import { validateGroup } from "@/lib/validation";
import type { ParticipantInput } from "@/types";

const row = (id: string, name: string, paid: string, owed = ""): ParticipantInput => ({ id, name, paid, owed });

describe("splitEvenly", () => {
  it("distributes remainder cents to the first people", () => {
    expect(splitEvenly(10000, 3)).toEqual([3334, 3333, 3333]);
    expect(splitEvenly(1, 3)).toEqual([1, 0, 0]);
    expect(splitEvenly(20000, 4)).toEqual([5000, 5000, 5000, 5000]);
    expect(splitEvenly(0, 2)).toEqual([0, 0]);
  });

  it("always adds up to the total", () => {
    for (let total = 0; total < 500; total += 7) {
      for (let count = 1; count < 9; count++) {
        const shares = splitEvenly(total, count);
        expect(shares.reduce((a, v) => a + v, 0)).toBe(total);
        expect(Math.max(...shares) - Math.min(...shares)).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe("computeBalances", () => {
  it("computes the default sample with an equal split", () => {
    const validation = validateGroup(
      [row("a", "Ava", "120.00"), row("n", "Noah", "45.00"), row("m", "Mia", "20.00"), row("e", "Ethan", "15.00")],
      "equal",
    );
    expect(validation.participants).not.toBeNull();
    const balances = computeBalances(validation.participants ?? [], "equal");
    expect(balances.map((b) => b.netCents)).toEqual([7000, -500, -3000, -3500]);

    const settlement = optimizeSettlement(balances);
    expect(settlement.transfers).toHaveLength(3);
    expect(buildLedger(balances, settlement.transfers).every((r) => r.finalCents === 0)).toBe(true);
  });

  it("uses custom shares and keeps the zero-sum invariant", () => {
    const validation = validateGroup([row("a", "Ana", "90", "30"), row("b", "Ben", "10", "70")], "custom");
    const balances = computeBalances(validation.participants ?? [], "custom");
    expect(balances.map((b) => b.netCents)).toEqual([6000, -6000]);
    expect(() =>
      computeBalances(
        [
          { id: "a", name: "A", paidCents: 100, owedCents: 50 },
          { id: "b", name: "B", paidCents: 0, owedCents: 40 },
        ],
        "custom",
      ),
    ).toThrow();
  });

  it("settles uneven cents exactly", () => {
    const validation = validateGroup([row("a", "A", "100.00"), row("b", "B", "0"), row("c", "C", "")], "equal");
    const balances = computeBalances(validation.participants ?? [], "equal");
    expect(balances.map((b) => b.owedCents)).toEqual([3334, 3333, 3333]);
    expect(balances.map((b) => b.netCents)).toEqual([6666, -3333, -3333]);
  });
});

describe("validateGroup", () => {
  it("accepts a valid group", () => {
    const result = validateGroup([row("a", "Ann", "10"), row("b", "Bo", "")], "equal");
    expect(result.groupError).toBeNull();
    expect(result.participants).toHaveLength(2);
  });

  it("flags blank and duplicate names", () => {
    const result = validateGroup([row("a", "Sam", "10"), row("b", " sam ", "5"), row("c", "  ", "1")], "equal");
    expect(result.rowErrors.a.name).toBeUndefined();
    expect(result.rowErrors.b.name).toBe("This name is already in the group");
    expect(result.rowErrors.c.name).toBe("Enter a name");
    expect(result.groupError).toBe("Fix the 2 highlighted fields to continue.");
    expect(result.participants).toBeNull();
  });

  it("flags invalid, negative and over-precise amounts", () => {
    const result = validateGroup([row("a", "A", "abc"), row("b", "B", "-4"), row("c", "C", "1.005")], "equal");
    expect(result.rowErrors.a.paid).toBe("Enter a valid amount, like 12.50");
    expect(result.rowErrors.b.paid).toBe("Amounts can't be negative");
    expect(result.rowErrors.c.paid).toBe("Use at most 2 decimal places");
  });

  it("requires at least two people and a non-zero total", () => {
    expect(validateGroup([], "equal").groupError).toBe("Add at least two people to split expenses.");
    expect(validateGroup([row("a", "A", "5")], "equal").groupError).toBe("Add at least one more person to split with.");
    expect(validateGroup([row("a", "A", "0"), row("b", "B", "")], "equal").groupError).toBe(
      "Enter what at least one person paid.",
    );
  });

  it("requires custom shares to match payments to the cent", () => {
    const short = validateGroup([row("a", "A", "100", "50"), row("b", "B", "0", "49.99")], "custom");
    expect(short.groupError).toBe("Fair shares are $0.01 short of the $100.00 paid.");
    const over = validateGroup([row("a", "A", "100", "60"), row("b", "B", "0", "50")], "custom");
    expect(over.groupError).toBe("Fair shares are $10.00 more than the $100.00 paid.");
  });
});

describe("buildPlanText", () => {
  it("produces a clean, copyable plan", () => {
    const names = new Map([
      ["e", "Emma"],
      ["l", "Liam"],
    ]);
    const text = buildPlanText({
      transfers: [{ from: "e", to: "l", amountCents: 4327 }],
      names,
      currency: "USD",
      exact: true,
    });
    expect(text).toBe("Group settlement\n\nEmma → Liam: $43.27\n\n1 transaction\nAll balances settled.");
  });
});
