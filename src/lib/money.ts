/**
 * Money primitives.
 *
 * Every amount is held as an integer number of minor units ("cents"). JS numbers
 * represent integers exactly up to Number.MAX_SAFE_INTEGER (~9 × 10^15), far above
 * anything a group can enter here, so integer addition, subtraction and equality
 * are exact. Decimal strings are parsed digit by digit and never pass through
 * parseFloat; cents only become text again at the presentation layer.
 */

export type Cents = number;

export type CurrencyCode = "USD" | "CAD" | "EUR" | "GBP" | "AUD" | "INR";

export interface CurrencyInfo {
  code: CurrencyCode;
  name: string;
  /** Digits after the decimal point. The first release only ships 2-digit currencies. */
  minorUnits: number;
}

export const CURRENCIES: readonly CurrencyInfo[] = [
  { code: "USD", name: "US dollar", minorUnits: 2 },
  { code: "CAD", name: "Canadian dollar", minorUnits: 2 },
  { code: "EUR", name: "Euro", minorUnits: 2 },
  { code: "GBP", name: "British pound", minorUnits: 2 },
  { code: "AUD", name: "Australian dollar", minorUnits: 2 },
  { code: "INR", name: "Indian rupee", minorUnits: 2 },
];

export const DEFAULT_CURRENCY: CurrencyCode = "USD";

/** Largest amount accepted in a single field: 1,000,000,000.00 */
export const MAX_AMOUNT_CENTS: Cents = 100_000_000_000;

export function getCurrency(code: CurrencyCode): CurrencyInfo {
  return CURRENCIES.find((currency) => currency.code === code) ?? CURRENCIES[0];
}

export function assertCents(value: number, label = "amount"): asserts value is Cents {
  if (!Number.isSafeInteger(value)) {
    throw new RangeError(`${label} must be a whole number of cents, got ${value}`);
  }
}

export type CurrencyValidation = { ok: true; cents: Cents } | { ok: false; error: string };

const PLAIN_DIGITS = /^\d+$/;
const GROUPED_DIGITS = /^\d{1,3}(?:,\d{3})+$/;
const INVALID: CurrencyValidation = { ok: false, error: "Enter a valid amount, like 12.50" };
const TOO_LARGE: CurrencyValidation = { ok: false, error: "That amount is too large" };

/**
 * Validates a user-entered amount such as "12", "12.5", "$1,234.56" or ".99" and
 * converts it to integer minor units. Negative values, malformed thousands
 * separators, and more decimals than the currency allows are rejected.
 */
export function validateCurrency(input: string, minorUnits = 2): CurrencyValidation {
  let value = input.trim();
  if (value === "") return { ok: false, error: "Enter an amount" };

  value = value.replace(/^[$€£₹]\s*/, "");
  if (/^[-−]/.test(value)) return { ok: false, error: "Amounts can't be negative" };

  const parts = value.split(".");
  if (parts.length > 2) return INVALID;
  const [wholeRaw, fraction = ""] = parts;

  if (!/^\d*$/.test(fraction)) return INVALID;
  if (fraction.length > minorUnits) {
    return {
      ok: false,
      error: minorUnits === 0 ? "Use whole amounts only" : `Use at most ${minorUnits} decimal places`,
    };
  }

  let wholeDigits: string;
  if (wholeRaw === "") {
    if (fraction === "") return INVALID;
    wholeDigits = "0";
  } else if (PLAIN_DIGITS.test(wholeRaw)) {
    wholeDigits = wholeRaw;
  } else if (GROUPED_DIGITS.test(wholeRaw)) {
    wholeDigits = wholeRaw.replaceAll(",", "");
  } else {
    return INVALID;
  }

  wholeDigits = wholeDigits.replace(/^0+(?=\d)/, "");
  if (wholeDigits.length > 13) return TOO_LARGE;

  // Both pieces are digit strings, so this is integer arithmetic on exact values.
  const cents =
    Number(wholeDigits) * 10 ** minorUnits + Number(fraction.padEnd(minorUnits, "0") || "0");
  if (!Number.isSafeInteger(cents) || cents > MAX_AMOUNT_CENTS) return TOO_LARGE;

  return { ok: true, cents };
}

/** Returns integer cents for a valid amount string, or null when it is invalid. */
export function parseCurrencyToCents(input: string, minorUnits = 2): Cents | null {
  const result = validateCurrency(input, minorUnits);
  return result.ok ? result.cents : null;
}

export function sumCents(values: Iterable<Cents>): Cents {
  let total = 0;
  for (const value of values) {
    assertCents(value);
    total += value;
  }
  assertCents(total, "total");
  return total;
}

const currencyFormatters = new Map<CurrencyCode, Intl.NumberFormat>();

function currencyFormatter(code: CurrencyCode): Intl.NumberFormat {
  let formatter = currencyFormatters.get(code);
  if (!formatter) {
    const { minorUnits } = getCurrency(code);
    formatter = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: code,
      minimumFractionDigits: minorUnits,
      maximumFractionDigits: minorUnits,
    });
    currencyFormatters.set(code, formatter);
  }
  return formatter;
}

const groupingFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

/** Splits |cents| into exact whole and fractional digit strings without division rounding. */
function splitMinorUnits(cents: Cents, minorUnits: number): { whole: number; fraction: string } {
  const factor = 10 ** minorUnits;
  const abs = Math.abs(cents);
  const remainder = abs % factor;
  return {
    whole: (abs - remainder) / factor,
    fraction: String(remainder).padStart(minorUnits, "0"),
  };
}

/**
 * Formats integer cents as currency, e.g. 4327 → "$43.27", -2000 → "-$20.00".
 * Only the whole part goes through Intl; the fractional digits come straight from
 * the integer, so the output can never be off by a rounding error.
 */
export function formatCents(cents: Cents, currency: CurrencyCode = DEFAULT_CURRENCY): string {
  assertCents(cents);
  const { minorUnits } = getCurrency(currency);
  const { whole, fraction } = splitMinorUnits(cents, minorUnits);
  const body = currencyFormatter(currency)
    .formatToParts(whole)
    .map((part) => (part.type === "fraction" ? fraction : part.value))
    .join("");
  return cents < 0 ? `-${body}` : body;
}

/** Signed variant for balances: "+$70.00", "-$20.00", "$0.00". */
export function formatSignedCents(cents: Cents, currency: CurrencyCode = DEFAULT_CURRENCY): string {
  return cents > 0 ? `+${formatCents(cents, currency)}` : formatCents(cents, currency);
}

/** Normalised text for an input field, without a currency symbol: 123456 → "1,234.56". */
export function formatCentsForInput(cents: Cents, minorUnits = 2): string {
  assertCents(cents);
  const { whole, fraction } = splitMinorUnits(cents, minorUnits);
  const wholeText = groupingFormatter.format(whole);
  const body = minorUnits > 0 ? `${wholeText}.${fraction}` : wholeText;
  return cents < 0 ? `-${body}` : body;
}

export function currencySymbol(code: CurrencyCode): string {
  return currencyFormatter(code).formatToParts(0).find((part) => part.type === "currency")?.value ?? code;
}
