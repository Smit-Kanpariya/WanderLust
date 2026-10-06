import type { KeyboardEvent } from "react";
import { ArrowDownLeft, ArrowUpRight, Check, CircleAlert, X } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { currencySymbol, formatCents, type Cents, type CurrencyCode } from "@/lib/money";
import { MAX_NAME_LENGTH, type RowErrors } from "@/lib/validation";
import type { ParticipantField, ParticipantInput, SplitMode } from "@/types";

export const ROW_GRID =
  "md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.15fr)_2.5rem] md:gap-4";

export interface RowPreview {
  shareCents: Cents | null;
  netCents: Cents | null;
}

interface ParticipantRowProps {
  row: ParticipantInput;
  index: number;
  mode: SplitMode;
  currency: CurrencyCode;
  preview: RowPreview;
  /** Only the errors that should be visible right now. */
  errors: RowErrors;
  onChange: (id: string, field: ParticipantField, value: string) => void;
  onBlur: (id: string, field: ParticipantField) => void;
  onRemove: (id: string) => void;
  onEnter: (event: KeyboardEvent<HTMLInputElement>) => void;
}

export function ParticipantRow({
  row,
  index,
  mode,
  currency,
  preview,
  errors,
  onChange,
  onBlur,
  onRemove,
  onEnter,
}: ParticipantRowProps) {
  const label = row.name.trim() || `person ${index + 1}`;
  const symbol = currencySymbol(currency);
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && !event.nativeEvent.isComposing) onEnter(event);
  };
  const removeButton = (className: string) => (
    <button
      type="button"
      onClick={() => onRemove(row.id)}
      aria-label={`Remove ${label}`}
      className={`flex size-10 shrink-0 items-center justify-center rounded-xl text-muted transition-colors hover:bg-owe-soft hover:text-owe ${className}`}
    >
      <X className="size-4" aria-hidden="true" />
    </button>
  );

  return (
    <li
      className={`grid animate-fade-up gap-3 rounded-2xl border border-line bg-surface p-4 md:items-start md:rounded-none md:border-0 md:border-b md:bg-transparent md:px-0 md:py-3 ${ROW_GRID}`}
    >
      <div className="flex min-w-0 items-start gap-3">
        <Avatar name={row.name} className="mt-[1.6rem] md:mt-1" />
        <div className="min-w-0 flex-1">
          <label htmlFor={`${row.id}-name`} className="mb-1.5 block text-xs font-medium text-muted md:sr-only">
            Name<span className="sr-only"> of person {index + 1}</span>
          </label>
          <input
            id={`${row.id}-name`}
            data-nav=""
            type="text"
            autoComplete="off"
            autoCapitalize="words"
            enterKeyHint="next"
            maxLength={MAX_NAME_LENGTH}
            placeholder="Name"
            value={row.name}
            onChange={(event) => onChange(row.id, "name", event.target.value)}
            onBlur={() => onBlur(row.id, "name")}
            onKeyDown={handleKeyDown}
            aria-invalid={errors.name ? true : undefined}
            aria-describedby={errors.name ? `${row.id}-name-error` : undefined}
            className="field"
          />
          <FieldError id={`${row.id}-name-error`} message={errors.name} />
        </div>
        {removeButton("mt-[1.35rem] md:hidden")}
      </div>

      <div className="grid grid-cols-2 gap-3 md:contents">
        <MoneyField
          id={`${row.id}-paid`}
          label="Paid"
          srLabel={` by ${label}`}
          symbol={symbol}
          value={row.paid}
          error={errors.paid}
          onChange={(value) => onChange(row.id, "paid", value)}
          onBlur={() => onBlur(row.id, "paid")}
          onKeyDown={handleKeyDown}
        />
        {mode === "custom" ? (
          <MoneyField
            id={`${row.id}-owed`}
            label="Fair share"
            srLabel={` for ${label}`}
            symbol={symbol}
            value={row.owed}
            error={errors.owed}
            onChange={(value) => onChange(row.id, "owed", value)}
            onBlur={() => onBlur(row.id, "owed")}
            onKeyDown={handleKeyDown}
          />
        ) : (
          <div className="min-w-0">
            <p aria-hidden="true" className="mb-1.5 text-xs font-medium text-muted md:sr-only">
              Fair share
            </p>
            <p className="flex h-11 items-center rounded-xl bg-canvas px-3 text-base text-ink-soft tabular-nums">
              <span className="sr-only">Fair share for {label}: </span>
              {preview.shareCents === null ? "—" : formatCents(preview.shareCents, currency)}
            </p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-line pt-3 md:block md:border-0 md:pt-2.5">
        <span aria-hidden="true" className="text-xs font-medium text-muted md:sr-only">
          Balance
        </span>
        <NetBalance netCents={preview.netCents} currency={currency} label={label} />
      </div>

      <div className="hidden md:flex md:justify-end md:pt-0.5">{removeButton("")}</div>
    </li>
  );
}

function NetBalance({ netCents, currency, label }: { netCents: Cents | null; currency: CurrencyCode; label: string }) {
  if (netCents === null) {
    return (
      <span className="text-sm text-muted">
        <span className="sr-only">Balance for {label}: </span>—
      </span>
    );
  }
  if (netCents === 0) {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-muted">
        <Check className="size-4" aria-hidden="true" />
        <span className="sr-only">{label}: </span>Settled
      </span>
    );
  }
  const owes = netCents < 0;
  const Icon = owes ? ArrowUpRight : ArrowDownLeft;
  return (
    <span
      className={`inline-flex flex-wrap items-center gap-x-1.5 text-sm font-medium ${owes ? "text-owe" : "text-gain"}`}
    >
      <Icon className="size-4" aria-hidden="true" />
      <span className="sr-only">{label} </span>
      {owes ? "Owes" : "Gets back"}
      <span className="font-semibold tabular-nums">{formatCents(Math.abs(netCents), currency)}</span>
    </span>
  );
}

function MoneyField({
  id,
  label,
  srLabel,
  symbol,
  value,
  error,
  onChange,
  onBlur,
  onKeyDown,
}: {
  id: string;
  label: string;
  srLabel: string;
  symbol: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-1.5 block text-xs font-medium text-muted md:sr-only">
        {label}
        <span className="sr-only">{srLabel}</span>
      </label>
      <div className="relative">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted"
        >
          {symbol}
        </span>
        <input
          id={id}
          data-nav=""
          type="text"
          inputMode="decimal"
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="next"
          placeholder="0.00"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className="field"
          style={{ paddingLeft: `${1.05 + symbol.length * 0.55}rem` }}
        />
      </div>
      <FieldError id={`${id}-error`} message={error} />
    </div>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1.5 flex items-start gap-1 text-xs font-medium text-danger">
      <CircleAlert className="mt-px size-3.5 shrink-0" aria-hidden="true" />
      {message}
    </p>
  );
}
