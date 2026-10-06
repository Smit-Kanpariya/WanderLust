import type { ParticipantBalance } from "@/lib/balances";
import type { CurrencyCode } from "@/lib/money";
import type { SettlementResult } from "@/lib/settlement";

export type SplitMode = "equal" | "custom";

/** Raw, editable form state for one person. Amounts stay strings until validated. */
export interface ParticipantInput {
  id: string;
  name: string;
  paid: string;
  owed: string;
}

export type ParticipantField = "name" | "paid" | "owed";

/** A computed plan plus the exact inputs it was computed from. */
export interface SettlementOutcome {
  balances: ParticipantBalance[];
  settlement: SettlementResult;
  currency: CurrencyCode;
  mode: SplitMode;
}
