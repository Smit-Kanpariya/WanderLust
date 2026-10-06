import type { ParsedParticipant } from "./balances";
import { formatCents, sumCents, validateCurrency, type Cents, type CurrencyCode } from "./money";
import type { ParticipantInput, SplitMode } from "@/types";

export const MAX_PARTICIPANTS = 50;
export const MAX_NAME_LENGTH = 40;

export interface RowErrors {
  name?: string;
  paid?: string;
  owed?: string;
}

export interface AmountFields {
  /** null when the field is invalid. A blank field counts as 0. */
  paidCents: Cents | null;
  owedCents: Cents | null;
}

export interface GroupValidation {
  rowErrors: Record<string, RowErrors>;
  amounts: Record<string, AmountFields>;
  errorCount: number;
  /** The blocking problem with the group as a whole, if any. */
  groupError: string | null;
  totalPaidCents: Cents;
  totalOwedCents: Cents;
  /** Populated only when the group is ready to settle. */
  participants: ParsedParticipant[] | null;
}

/** Removes control characters (pasted tabs, newlines, etc.) from a name as it is typed. */
export function sanitizeNameInput(value: string): string {
  return value.replace(/[\u0000-\u001f\u007f]/g, "").slice(0, MAX_NAME_LENGTH);
}

export function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

function parseAmountField(raw: string): { cents: Cents | null; error?: string } {
  if (raw.trim() === "") return { cents: 0 };
  const result = validateCurrency(raw);
  return result.ok ? { cents: result.cents } : { cents: null, error: result.error };
}

export function validateGroup(
  rows: readonly ParticipantInput[],
  mode: SplitMode,
  currency: CurrencyCode = "USD",
): GroupValidation {
  const rowErrors: Record<string, RowErrors> = {};
  const amounts: Record<string, AmountFields> = {};
  const seenNames = new Set<string>();
  let errorCount = 0;

  for (const row of rows) {
    const errors: RowErrors = {};
    const name = normalizeName(row.name);
    const key = name.toLocaleLowerCase("en");
    if (name === "") errors.name = "Enter a name";
    else if (name.length > MAX_NAME_LENGTH) errors.name = `Use ${MAX_NAME_LENGTH} characters or fewer`;
    else if (seenNames.has(key)) errors.name = "This name is already in the group";
    if (name !== "") seenNames.add(key);

    const paid = parseAmountField(row.paid);
    if (paid.error) errors.paid = paid.error;

    let owedCents: Cents | null = null;
    if (mode === "custom") {
      const owed = parseAmountField(row.owed);
      if (owed.error) errors.owed = owed.error;
      owedCents = owed.cents;
    }

    amounts[row.id] = { paidCents: paid.cents, owedCents };
    rowErrors[row.id] = errors;
    errorCount += Object.keys(errors).length;
  }

  const totalPaidCents = sumCents(rows.map((r) => amounts[r.id].paidCents ?? 0));
  const totalOwedCents = sumCents(rows.map((r) => amounts[r.id].owedCents ?? 0));

  let groupError: string | null = null;
  if (rows.length === 0) {
    groupError = "Add at least two people to split expenses.";
  } else if (rows.length === 1) {
    groupError = "Add at least one more person to split with.";
  } else if (errorCount > 0) {
    groupError =
      errorCount === 1
        ? "Fix the highlighted field to continue."
        : `Fix the ${errorCount} highlighted fields to continue.`;
  } else if (totalPaidCents === 0) {
    groupError = "Enter what at least one person paid.";
  } else if (mode === "custom" && totalOwedCents !== totalPaidCents) {
    const difference = totalPaidCents - totalOwedCents;
    groupError =
      difference > 0
        ? `Fair shares are ${formatCents(difference, currency)} short of the ${formatCents(totalPaidCents, currency)} paid.`
        : `Fair shares are ${formatCents(-difference, currency)} more than the ${formatCents(totalPaidCents, currency)} paid.`;
  }

  const participants =
    groupError === null
      ? rows.map((row) => ({
          id: row.id,
          name: normalizeName(row.name),
          paidCents: amounts[row.id].paidCents ?? 0,
          owedCents: amounts[row.id].owedCents,
        }))
      : null;

  return { rowErrors, amounts, errorCount, groupError, totalPaidCents, totalOwedCents, participants };
}
