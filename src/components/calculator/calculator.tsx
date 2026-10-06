"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { CircleAlert, CircleCheck, Eraser, Info, LoaderCircle, Plus, RotateCcw, Sparkles, Users } from "lucide-react";
import { ParticipantRow, ROW_GRID, type RowPreview } from "./participant-row";
import { SettlementResults } from "./settlement-results";
import { computeBalances, splitEvenly } from "@/lib/balances";
import {
  CURRENCIES,
  DEFAULT_CURRENCY,
  formatCents,
  formatCentsForInput,
  parseCurrencyToCents,
  type CurrencyCode,
} from "@/lib/money";
import { optimizeSettlement } from "@/lib/settlement";
import { MAX_PARTICIPANTS, normalizeName, sanitizeNameInput, validateGroup } from "@/lib/validation";
import type { ParticipantField, ParticipantInput, SettlementOutcome, SplitMode } from "@/types";

const SAMPLE_ROWS: ParticipantInput[] = [
  { id: "sample-ava", name: "Ava", paid: "120.00", owed: "" },
  { id: "sample-noah", name: "Noah", paid: "45.00", owed: "" },
  { id: "sample-mia", name: "Mia", paid: "20.00", owed: "" },
  { id: "sample-ethan", name: "Ethan", paid: "15.00", owed: "" },
];

const MODES: { value: SplitMode; label: string }[] = [
  { value: "equal", label: "Equal split" },
  { value: "custom", label: "Custom split" },
];

let idCounter = 0;
function createRow(): ParticipantInput {
  idCounter += 1;
  return { id: `person-${idCounter}`, name: "", paid: "", owed: "" };
}

type Phase = "idle" | "computing" | "done" | "error";

export function Calculator() {
  const [mode, setMode] = useState<SplitMode>("equal");
  const [rows, setRows] = useState<ParticipantInput[]>(SAMPLE_ROWS);
  const [currency, setCurrency] = useState<CurrencyCode>(DEFAULT_CURRENCY);
  const [touched, setTouched] = useState<ReadonlySet<string>>(() => new Set());
  const [submitted, setSubmitted] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [outcome, setOutcome] = useState<SettlementOutcome | null>(null);
  const [stale, setStale] = useState(false);

  const listRef = useRef<HTMLUListElement>(null);
  const resultsHeadingRef = useRef<HTMLHeadingElement>(null);
  // Post-render work requested by event handlers (focus moves, scrolling).
  const pendingFocusId = useRef<string | null>(null);
  const focusFirstInvalid = useRef(false);
  const revealResults = useRef(false);

  const validation = useMemo(() => validateGroup(rows, mode, currency), [rows, mode, currency]);

  // Live per-row fair share and balance, shown even before the group is complete.
  const preview = useMemo(() => {
    const byId: Record<string, RowPreview> = {};
    let remainder: { cents: number; recipients: string[] } | null = null;
    const paid = rows.map((r) => validation.amounts[r.id]?.paidCents ?? null);

    if (mode === "equal") {
      const allPaidValid = rows.length > 0 && paid.every((p) => p !== null);
      const shares = allPaidValid ? splitEvenly(validation.totalPaidCents, rows.length) : null;
      rows.forEach((row, index) => {
        const share = shares ? shares[index] : null;
        const paidCents = paid[index];
        byId[row.id] = {
          shareCents: share,
          netCents: share !== null && paidCents !== null ? paidCents - share : null,
        };
      });
      const extra = allPaidValid ? validation.totalPaidCents % rows.length : 0;
      if (extra > 0) {
        remainder = {
          cents: extra,
          recipients: rows.slice(0, extra).map((r, i) => normalizeName(r.name) || `Person ${i + 1}`),
        };
      }
    } else {
      rows.forEach((row, index) => {
        const owed = validation.amounts[row.id]?.owedCents ?? null;
        const paidCents = paid[index];
        byId[row.id] = { shareCents: owed, netCents: owed !== null && paidCents !== null ? paidCents - owed : null };
      });
    }
    return { byId, remainder };
  }, [rows, mode, validation]);

  useEffect(() => {
    if (pendingFocusId.current) {
      const element = document.getElementById(pendingFocusId.current);
      pendingFocusId.current = null;
      element?.focus();
    }
    if (focusFirstInvalid.current) {
      focusFirstInvalid.current = false;
      listRef.current?.querySelector<HTMLInputElement>('[aria-invalid="true"]')?.focus();
    }
    if (revealResults.current && resultsHeadingRef.current) {
      revealResults.current = false;
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      resultsHeadingRef.current.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
      resultsHeadingRef.current.focus({ preventScroll: true });
    }
  });

  function markEdited() {
    if (outcome) setStale(true);
    if (phase === "error") setPhase("idle");
  }

  function handleChange(id: string, field: ParticipantField, value: string) {
    const next = field === "name" ? sanitizeNameInput(value) : value;
    setRows((current) => current.map((row) => (row.id === id ? { ...row, [field]: next } : row)));
    markEdited();
  }

  function handleBlur(id: string, field: ParticipantField) {
    const key = `${id}:${field}`;
    setTouched((current) => (current.has(key) ? current : new Set(current).add(key)));
    // Tidy the value without changing what it means: trim names, format amounts as 1,234.50.
    setRows((current) =>
      current.map((row) => {
        if (row.id !== id) return row;
        if (field === "name") {
          const name = normalizeName(row.name);
          return name === row.name ? row : { ...row, name };
        }
        const raw = row[field];
        const cents = raw.trim() === "" ? null : parseCurrencyToCents(raw);
        if (cents === null) return row;
        const formatted = formatCentsForInput(cents);
        return formatted === raw ? row : { ...row, [field]: formatted };
      }),
    );
  }

  function addRow() {
    if (rows.length >= MAX_PARTICIPANTS) return;
    const row = createRow();
    setRows((current) => [...current, row]);
    pendingFocusId.current = `${row.id}-name`;
    markEdited();
  }

  function removeRow(id: string) {
    const index = rows.findIndex((row) => row.id === id);
    const neighbor = rows[index + 1] ?? rows[index - 1];
    setRows((current) => current.filter((row) => row.id !== id));
    pendingFocusId.current = neighbor ? `${neighbor.id}-name` : "add-person";
    markEdited();
  }

  function switchMode(next: SplitMode) {
    if (next === mode) return;
    // Entering custom mode for the first time: start from the equal split so the totals already match.
    if (next === "custom" && rows.length > 0 && rows.every((row) => row.owed.trim() === "")) {
      const allPaidValid = rows.every((row) => validation.amounts[row.id]?.paidCents !== null);
      if (allPaidValid) {
        const shares = splitEvenly(validation.totalPaidCents, rows.length);
        setRows((current) =>
          current.map((row, index) => ({ ...row, owed: formatCentsForInput(shares[index] ?? 0) })),
        );
      }
    }
    setMode(next);
    markEdited();
  }

  function resetState(nextRows: ParticipantInput[], nextMode: SplitMode) {
    setRows(nextRows);
    setMode(nextMode);
    setTouched(new Set());
    setSubmitted(false);
    setOutcome(null);
    setStale(false);
    setPhase("idle");
  }

  function clearExample() {
    const fresh = [createRow(), createRow()];
    resetState(fresh, mode);
    pendingFocusId.current = `${fresh[0].id}-name`;
  }

  function loadSample() {
    resetState(SAMPLE_ROWS, "equal");
  }

  function editExpenses() {
    const first = listRef.current?.querySelector<HTMLInputElement>("input[data-nav]");
    document.getElementById("calculator")?.scrollIntoView({ block: "start" });
    first?.focus({ preventScroll: true });
  }

  function startOver() {
    clearExample();
    document.getElementById("calculator")?.scrollIntoView({ block: "start" });
  }

  function handleEnter(event: KeyboardEvent<HTMLInputElement>) {
    event.preventDefault();
    const fields = Array.from(listRef.current?.querySelectorAll<HTMLInputElement>("input[data-nav]") ?? []);
    const index = fields.indexOf(event.currentTarget);
    const next = fields[index + 1];
    if (index >= 0 && next) {
      next.focus();
      next.select();
    } else {
      addRow();
    }
  }

  function optimize() {
    setSubmitted(true);
    const participants = validation.participants;
    if (!participants) {
      focusFirstInvalid.current = true;
      return;
    }
    setPhase("computing");
    const inputMode = mode;
    const inputCurrency = currency;
    // Yield so the loading state paints before the synchronous optimizer runs.
    window.setTimeout(() => {
      try {
        const balances = computeBalances(participants, inputMode);
        const settlement = optimizeSettlement(balances);
        setOutcome({ balances, settlement, currency: inputCurrency, mode: inputMode });
        setStale(false);
        setPhase("done");
        revealResults.current = true;
      } catch (error) {
        console.error(error);
        setPhase("error");
      }
    }, 30);
  }

  const computing = phase === "computing";
  const transfersLabel = outcome && !stale && !computing ? String(outcome.settlement.transfers.length) : "—";
  const owedDifference = validation.totalPaidCents - validation.totalOwedCents;

  let status: { tone: "error" | "info" | "ready"; text: string };
  if (phase === "error") {
    status = {
      tone: "error",
      text: "Something went wrong while optimizing. Your inputs are unchanged. Check the amounts and try again.",
    };
  } else if (validation.groupError) {
    status = { tone: submitted ? "error" : "info", text: validation.groupError };
  } else {
    status = { tone: "ready", text: `Ready. Balances add up to exactly ${formatCents(0, currency)}.` };
  }

  return (
    <>
      <div className="card animate-fade-up">
        <div className="flex flex-col gap-4 border-b border-line p-5 sm:p-7 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 id="calculator-heading" className="text-2xl font-semibold tracking-tight">
              Group expenses
            </h2>
            <p className="mt-1 text-sm text-muted">
              {mode === "equal"
                ? "Enter what each person paid. Everyone covers an equal share."
                : "Set what each person should cover. Shares must add up to the total paid."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <fieldset>
              <legend className="sr-only">Split method</legend>
              <div className="inline-flex rounded-xl bg-canvas p-1 ring-1 ring-line">
                {MODES.map((option) => (
                  <label
                    key={option.value}
                    className={`cursor-pointer rounded-lg px-3.5 py-2 text-sm font-medium transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent ${
                      mode === option.value ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"
                    }`}
                  >
                    <input
                      type="radio"
                      name="split-mode"
                      value={option.value}
                      checked={mode === option.value}
                      onChange={() => switchMode(option.value)}
                      className="sr-only"
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </fieldset>
            <label htmlFor="currency" className="sr-only">
              Currency
            </label>
            <select
              id="currency"
              value={currency}
              onChange={(event) => {
                setCurrency(event.target.value as CurrencyCode);
                markEdited();
              }}
              className="h-10 rounded-xl border border-line-strong bg-surface px-3 text-sm font-medium"
            >
              {CURRENCIES.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.code} · {option.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="p-5 sm:p-7">
          {rows.length > 0 ? (
            <>
              <div
                aria-hidden="true"
                className={`hidden border-b border-line pb-2 text-xs font-semibold tracking-wide text-muted uppercase md:grid ${ROW_GRID}`}
              >
                <span className="pl-12">Person</span>
                <span>Paid</span>
                <span>Fair share</span>
                <span>Balance</span>
                <span />
              </div>
              <ul ref={listRef} aria-label="People in the group" className="space-y-3 md:space-y-0">
                {rows.map((row, index) => (
                  <ParticipantRow
                    key={row.id}
                    row={row}
                    index={index}
                    mode={mode}
                    currency={currency}
                    preview={preview.byId[row.id] ?? { shareCents: null, netCents: null }}
                    errors={visibleErrors(validation.rowErrors[row.id] ?? {}, row.id, touched, submitted)}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    onRemove={removeRow}
                    onEnter={handleEnter}
                  />
                ))}
              </ul>
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-line-strong px-6 py-10 text-center">
              <Users className="mx-auto size-8 text-muted" aria-hidden="true" />
              <p className="mt-3 font-semibold">No one in the group yet</p>
              <p className="mt-1 text-sm text-muted">
                Add everyone who shared the costs. You need at least two people.
              </p>
              <button type="button" onClick={loadSample} className="btn btn-ghost mt-3">
                Use the sample group
              </button>
            </div>
          )}

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              id="add-person"
              type="button"
              onClick={addRow}
              disabled={rows.length >= MAX_PARTICIPANTS}
              className="btn btn-secondary border-dashed"
            >
              <Plus className="size-4" aria-hidden="true" />
              Add person
            </button>
            <div className="flex gap-1">
              <button type="button" onClick={clearExample} className="btn btn-ghost h-10 flex-1 sm:flex-none">
                <Eraser className="size-4" aria-hidden="true" />
                Clear example
              </button>
              <button type="button" onClick={loadSample} className="btn btn-ghost h-10 flex-1 sm:flex-none">
                <RotateCcw className="size-4" aria-hidden="true" />
                Reset
              </button>
            </div>
          </div>
          {rows.length >= MAX_PARTICIPANTS && (
            <p className="mt-3 text-sm text-muted">Groups are limited to {MAX_PARTICIPANTS} people.</p>
          )}

          {mode === "equal" && preview.remainder && (
            <p className="mt-4 flex items-start gap-2 text-sm text-muted">
              <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span>
                {formatCents(validation.totalPaidCents, currency)} doesn&apos;t split evenly {rows.length} ways, so{" "}
                {new Intl.ListFormat("en", { type: "conjunction" }).format(preview.remainder.recipients)}{" "}
                {preview.remainder.cents === 1 ? "covers 1 extra cent." : "each cover 1 extra cent."}
              </span>
            </p>
          )}

          {mode === "custom" && rows.length > 0 && (
            <p className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-soft">
              <span>
                Fair shares assigned:{" "}
                <strong className="tabular-nums">{formatCents(validation.totalOwedCents, currency)}</strong> of{" "}
                <span className="tabular-nums">{formatCents(validation.totalPaidCents, currency)}</span>
              </span>
              {owedDifference === 0 ? (
                <span className="inline-flex items-center gap-1 font-medium text-gain">
                  <CircleCheck className="size-4" aria-hidden="true" />
                  Matches the total
                </span>
              ) : (
                <span className="font-medium text-owe">
                  {formatCents(Math.abs(owedDifference), currency)} {owedDifference > 0 ? "left to assign" : "over"}
                </span>
              )}
            </p>
          )}
        </div>

        <div className="rounded-b-[1.125rem] border-t border-line bg-canvas/60 p-5 sm:p-7">
          <dl className="grid grid-cols-3 gap-2 sm:gap-3">
            <Stat label="Total spent" value={formatCents(validation.totalPaidCents, currency)} />
            <Stat label="People" value={String(rows.length)} />
            <Stat label="Transfers required" value={transfersLabel} />
          </dl>

          <div aria-live="polite" className="mt-4">
            <p
              className={`flex items-start gap-2 rounded-xl px-3 py-2.5 text-sm font-medium ${
                status.tone === "error"
                  ? "bg-danger-soft text-danger"
                  : status.tone === "ready"
                    ? "text-gain"
                    : "text-ink-soft"
              }`}
            >
              {status.tone === "error" ? (
                <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              ) : status.tone === "ready" ? (
                <CircleCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              ) : (
                <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              )}
              {status.text}
            </p>
          </div>

          <button
            type="button"
            onClick={optimize}
            disabled={computing}
            className="btn btn-accent btn-lg mt-4 w-full shadow-sm"
          >
            {computing ? (
              <>
                <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
                Optimizing…
              </>
            ) : (
              <>
                <Sparkles className="size-5" aria-hidden="true" />
                Optimize settlements
              </>
            )}
          </button>
        </div>
      </div>

      {computing && !outcome && (
        <div className="card mt-8 animate-pulse space-y-4 p-7" aria-hidden="true">
          <div className="h-4 w-40 rounded bg-line" />
          <div className="h-8 w-56 rounded bg-line" />
          <div className="h-16 rounded-2xl bg-canvas" />
          <div className="h-16 rounded-2xl bg-canvas" />
        </div>
      )}

      {outcome && (
        <SettlementResults
          outcome={outcome}
          stale={stale}
          onRecalculate={optimize}
          onEdit={editExpenses}
          onStartOver={startOver}
          headingRef={resultsHeadingRef}
        />
      )}
    </>
  );
}

function visibleErrors(
  errors: { name?: string; paid?: string; owed?: string },
  id: string,
  touched: ReadonlySet<string>,
  submitted: boolean,
) {
  if (submitted) return errors;
  return {
    name: touched.has(`${id}:name`) ? errors.name : undefined,
    paid: touched.has(`${id}:paid`) ? errors.paid : undefined,
    owed: touched.has(`${id}:owed`) ? errors.owed : undefined,
  };
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-line bg-surface p-3 sm:p-4">
      <dt className="text-xs leading-tight text-muted">{label}</dt>
      <dd className="mt-1 text-base font-semibold tracking-tight tabular-nums [overflow-wrap:anywhere] sm:text-2xl">
        {value}
      </dd>
    </div>
  );
}
