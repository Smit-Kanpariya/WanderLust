import { describe, expect, it } from "vitest";
import {
  formatCents,
  formatCentsForInput,
  formatSignedCents,
  MAX_AMOUNT_CENTS,
  parseCurrencyToCents,
  sumCents,
  validateCurrency,
} from "@/lib/money";

describe("parseCurrencyToCents", () => {
  it.each([
    ["0", 0],
    ["0.00", 0],
    ["0.01", 1],
    ["1", 100],
    ["1.2", 120],
    ["1.20", 120],
    ["1,234.56", 123456],
    ["999999.99", 99999999],
    ["$12.34", 1234],
    [" 7.5 ", 750],
    [".5", 50],
    ["1.", 100],
    ["0012.30", 1230],
    ["1,000,000", 100000000],
    ["€3", 300],
  ])("parses %j as %i cents", (input, cents) => {
    expect(parseCurrencyToCents(input)).toBe(cents);
  });

  it.each([
    "",
    " ",
    "abc",
    "1.234",
    "-5",
    "-0.01",
    "$-5",
    "1,23",
    "12,34.5",
    "1.2.3",
    "1e3",
    "Infinity",
    "NaN",
    "0x10",
    ".",
    "$",
    "12a",
    "1 000",
    "+-1",
    "１２",
  ])("rejects %j", (input) => {
    expect(parseCurrencyToCents(input)).toBeNull();
  });

  it("avoids floating-point drift on values that break parseFloat × 100", () => {
    expect(parseFloat("4.35") * 100).not.toBe(435);
    expect(parseCurrencyToCents("4.35")).toBe(435);
    expect(parseCurrencyToCents("0.29")).toBe(29);
    expect(parseCurrencyToCents("1.15")).toBe(115);
    expect(parseCurrencyToCents("1,005.10")).toBe(100510);
  });

  it("enforces the maximum amount", () => {
    expect(parseCurrencyToCents("1,000,000,000.00")).toBe(MAX_AMOUNT_CENTS);
    expect(parseCurrencyToCents("1000000000.01")).toBeNull();
  });
});

describe("validateCurrency", () => {
  it("explains why a value is rejected", () => {
    expect(validateCurrency("-3")).toEqual({ ok: false, error: "Amounts can't be negative" });
    expect(validateCurrency("2.345")).toEqual({ ok: false, error: "Use at most 2 decimal places" });
    expect(validateCurrency("")).toEqual({ ok: false, error: "Enter an amount" });
    expect(validateCurrency("ten")).toMatchObject({ ok: false });
  });
});

describe("formatCents", () => {
  it.each([
    [0, "$0.00"],
    [1, "$0.01"],
    [4327, "$43.27"],
    [-2000, "-$20.00"],
    [123456789, "$1,234,567.89"],
    [MAX_AMOUNT_CENTS, "$1,000,000,000.00"],
  ])("formats %i as %s", (cents, text) => {
    expect(formatCents(cents)).toBe(text);
  });

  it("supports other two-decimal currencies", () => {
    expect(formatCents(5, "EUR")).toBe("€0.05");
    expect(formatCents(100, "GBP")).toBe("£1.00");
    expect(formatCents(250, "INR")).toBe("₹2.50");
    expect(formatCents(1999, "CAD")).toBe("CA$19.99");
  });

  it("formats signed balances and input values", () => {
    expect(formatSignedCents(7000)).toBe("+$70.00");
    expect(formatSignedCents(-500)).toBe("-$5.00");
    expect(formatSignedCents(0)).toBe("$0.00");
    expect(formatCentsForInput(123456)).toBe("1,234.56");
    expect(formatCentsForInput(5)).toBe("0.05");
  });

  it("refuses non-integer cents", () => {
    expect(() => formatCents(1.5)).toThrow(RangeError);
  });

  it("round-trips through parsing", () => {
    for (const cents of [0, 1, 99, 100, 1234, 99999999, 123456789]) {
      expect(parseCurrencyToCents(formatCents(cents))).toBe(cents);
      expect(parseCurrencyToCents(formatCentsForInput(cents))).toBe(cents);
    }
  });
});

describe("sumCents", () => {
  it("adds integer cents exactly", () => {
    expect(sumCents([10, 20, 1])).toBe(31);
    expect(sumCents(Array.from({ length: 10 }, () => 10))).toBe(100);
    expect(sumCents([])).toBe(0);
  });

  it("rejects fractional cents", () => {
    expect(() => sumCents([0.1, 0.2])).toThrow(RangeError);
  });
});
