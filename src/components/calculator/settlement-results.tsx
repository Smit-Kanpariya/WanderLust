import { useMemo, useState, type RefObject } from "react";
import {
  ArrowDown,
  ArrowRight,
  ChevronDown,
  ClipboardCopy,
  PencilLine,
  RefreshCw,
  RotateCcw,
  Share2,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { Avatar } from "@/components/avatar";
import { formatCents, formatSignedCents } from "@/lib/money";
import { buildLedger, buildPlanText, pairwisePaymentCount } from "@/lib/plan";
import { EXACT_SEARCH_LIMIT } from "@/lib/settlement";
import type { SettlementOutcome } from "@/types";

type Notice = { tone: "success" | "error"; text: string };

interface SettlementResultsProps {
  outcome: SettlementOutcome;
  stale: boolean;
  onRecalculate: () => void;
  onEdit: () => void;
  onStartOver: () => void;
  headingRef: RefObject<HTMLHeadingElement | null>;
}

export function SettlementResults({
  outcome,
  stale,
  onRecalculate,
  onEdit,
  onStartOver,
  headingRef,
}: SettlementResultsProps) {
  const { balances, settlement, currency } = outcome;
  const names = useMemo(() => new Map(balances.map((b) => [b.id, b.name])), [balances]);
  const ledger = useMemo(() => buildLedger(balances, settlement.transfers), [balances, settlement]);
  const planText = useMemo(
    () => buildPlanText({ transfers: settlement.transfers, names, currency, exact: settlement.exact }),
    [settlement, names, currency],
  );
  const [notice, setNotice] = useState<Notice | null>(null);

  const count = settlement.transfers.length;
  const people = balances.length;
  const pairwise = pairwisePaymentCount(people);
  const nameOf = (id: string) => names.get(id) ?? "Unknown";

  async function copyPlan() {
    const copied = await writeClipboard(planText);
    setNotice(
      copied
        ? { tone: "success", text: "Settlement plan copied to clipboard." }
        : { tone: "error", text: "Couldn't copy automatically. Open “Why these payments?” to copy the plan text." },
    );
  }

  async function sharePlan() {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: "Group settlement", text: planText });
        setNotice({ tone: "success", text: "Plan shared." });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    await copyPlan();
  }

  return (
    <section aria-labelledby="results-heading" className="mt-8 scroll-mt-20">
      <div className="card animate-fade-up overflow-hidden">
        <div className="p-5 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 id="results-heading" ref={headingRef} tabIndex={-1} className="eyebrow outline-none">
                Optimized settlement
              </h2>
              <p className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                {count === 0 ? "No transfers needed" : `${count} ${count === 1 ? "transfer" : "transfers"}`}
              </p>
              <p className="mt-1.5 text-ink-soft">
                {count === 0
                  ? "Everyone already paid exactly their fair share."
                  : pairwise > count
                    ? `Instead of everyone paying everyone: up to ${pairwise} payments for ${people} people.`
                    : `Settles all ${people} people.`}
              </p>
            </div>
            {settlement.exact ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-gain-soft px-3 py-1.5 text-sm font-medium text-gain">
                <ShieldCheck className="size-4" aria-hidden="true" />
                Fewest possible transfers
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-800">
                <Zap className="size-4" aria-hidden="true" />
                Fast plan, minimum not verified
              </span>
            )}
          </div>

          {!settlement.exact && (
            <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
              More than {EXACT_SEARCH_LIMIT} people still have balances that don&apos;t cancel out directly, which is
              too many to prove the minimum quickly in your browser. This plan settles everyone exactly, but a plan
              with fewer transfers might exist.
            </p>
          )}

          {stale && (
            <div
              role="status"
              className="mt-5 flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <p className="text-sm font-medium text-amber-900">
                You&apos;ve edited the group since this plan was made.
              </p>
              <button type="button" onClick={onRecalculate} className="btn btn-primary h-10">
                <RefreshCw className="size-4" aria-hidden="true" />
                Recalculate
              </button>
            </div>
          )}

          <div className={stale ? "opacity-50 transition-opacity" : "transition-opacity"}>
            {count > 0 && (
              <ol className="mt-6 space-y-3" aria-label="Transfers">
                {settlement.transfers.map((transfer, index) => (
                  <li
                    key={`${transfer.from}-${transfer.to}`}
                    className="grid animate-fade-up grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 rounded-2xl border border-line bg-surface p-4 sm:px-5"
                    style={{ animationDelay: `${Math.min(index, 8) * 60}ms` }}
                  >
                    <div className="min-w-0 sm:flex sm:items-center sm:gap-3">
                      <PersonChip name={nameOf(transfer.from)} />
                      <p className="my-1 flex items-center gap-1.5 pl-2.5 text-xs font-medium text-muted sm:my-0 sm:pl-0">
                        <ArrowDown className="size-3.5 sm:hidden" aria-hidden="true" />
                        pays
                        <ArrowRight className="hidden size-3.5 sm:block" aria-hidden="true" />
                      </p>
                      <PersonChip name={nameOf(transfer.to)} />
                    </div>
                    <p className="text-xl font-semibold tracking-tight tabular-nums sm:text-2xl">
                      {formatCents(transfer.amountCents, currency)}
                    </p>
                  </li>
                ))}
              </ol>
            )}

            <div className="mt-6 rounded-2xl bg-gain-soft p-4 sm:p-5">
              <p className="flex items-center gap-2 font-semibold text-gain">
                <SuccessCheck />
                All balances settled
              </p>
              <p className="mt-1 text-sm text-ink-soft">
                After {count === 1 ? "this transfer" : "these transfers"}, everyone&apos;s balance is exactly{" "}
                {formatCents(0, currency)}.
              </p>
              <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3" aria-label="Final balances">
                {ledger.map((row) => (
                  <li
                    key={row.id}
                    className="flex items-center justify-between gap-3 rounded-xl bg-surface px-3 py-2 text-sm"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <Avatar name={row.name} size="sm" />
                      <span className="truncate font-medium">{row.name}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="tabular-nums">{formatCents(row.finalCents, currency)}</span>
                      <span className="font-medium text-gain">Settled ✓</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 border-t border-line px-5 py-4 sm:flex sm:flex-wrap sm:px-7">
          <button type="button" onClick={copyPlan} disabled={stale} className="btn btn-primary">
            <ClipboardCopy className="size-4" aria-hidden="true" />
            Copy plan
          </button>
          <button type="button" onClick={sharePlan} disabled={stale} className="btn btn-secondary">
            <Share2 className="size-4" aria-hidden="true" />
            Share
          </button>
          <button type="button" onClick={onEdit} className="btn btn-ghost">
            <PencilLine className="size-4" aria-hidden="true" />
            Edit expenses
          </button>
          <button type="button" onClick={onStartOver} className="btn btn-ghost">
            <RotateCcw className="size-4" aria-hidden="true" />
            Start over
          </button>
        </div>
        <div aria-live="polite" className="px-5 sm:px-7">
          {notice && (
            <p
              className={`mb-4 rounded-xl px-3 py-2 text-sm font-medium ${
                notice.tone === "success" ? "bg-gain-soft text-gain" : "bg-danger-soft text-danger"
              }`}
            >
              {notice.text}
            </p>
          )}
        </div>

        <details className="group border-t border-line">
          <summary className="flex cursor-pointer items-center justify-between gap-4 px-5 py-4 font-medium sm:px-7">
            Why these payments?
            <ChevronDown className="size-5 text-muted transition-transform group-open:rotate-180" aria-hidden="true" />
          </summary>
          <div className="space-y-4 px-5 pb-6 text-ink-soft sm:px-7">
            <p>
              Each person&apos;s payment and fair share create a net balance. SettleSmart searches for a settlement
              that satisfies every balance while minimizing the number of money transfers.
            </p>
            <p>
              People who are owed money only receive, and people who owe only pay. Nobody passes money along on
              someone else&apos;s behalf.
            </p>
            <div className="overflow-x-auto rounded-xl border border-line">
              <table className="w-full min-w-[640px] text-sm">
                <caption className="sr-only">Balances before and after settlement</caption>
                <thead className="bg-canvas text-left text-xs text-muted uppercase">
                  <tr>
                    <th scope="col" className="px-3 py-2 font-semibold">
                      Person
                    </th>
                    {["Paid", "Fair share", "Balance before", "Sent", "Received", "Final"].map((heading) => (
                      <th key={heading} scope="col" className="px-3 py-2 text-right font-semibold">
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line tabular-nums">
                  {ledger.map((row) => (
                    <tr key={row.id}>
                      <th scope="row" className="px-3 py-2 text-left font-medium text-ink">
                        {row.name}
                      </th>
                      <td className="px-3 py-2 text-right">{formatCents(row.paidCents, currency)}</td>
                      <td className="px-3 py-2 text-right">{formatCents(row.owedCents, currency)}</td>
                      <td
                        className={`px-3 py-2 text-right font-medium ${
                          row.netCents > 0 ? "text-gain" : row.netCents < 0 ? "text-owe" : ""
                        }`}
                      >
                        {formatSignedCents(row.netCents, currency)}
                      </td>
                      <td className="px-3 py-2 text-right">{formatCents(row.sentCents, currency)}</td>
                      <td className="px-3 py-2 text-right">{formatCents(row.receivedCents, currency)}</td>
                      <td className="px-3 py-2 text-right font-semibold text-ink">
                        {formatCents(row.finalCents, currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div>
              <p className="text-sm font-medium text-ink">Plain-text plan</p>
              <pre className="mt-2 overflow-x-auto rounded-xl bg-canvas p-3 text-sm whitespace-pre-wrap text-ink">
                {planText}
              </pre>
            </div>
          </div>
        </details>
      </div>
    </section>
  );
}

function PersonChip({ name }: { name: string }) {
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <Avatar name={name} />
      <span className="truncate font-medium">{name}</span>
    </span>
  );
}

function SuccessCheck() {
  return (
    <span className="animate-pop flex size-6 items-center justify-center rounded-full bg-gain text-white">
      <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
        <path
          d="M5 12.5l4.5 4.5L19 7.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="animate-draw-check"
        />
      </svg>
    </span>
  );
}

async function writeClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fall back to a temporary textarea for browsers without async clipboard access.
  }
  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.append(area);
    area.select();
    const copied = document.execCommand("copy");
    area.remove();
    return copied;
  } catch {
    return false;
  }
}
