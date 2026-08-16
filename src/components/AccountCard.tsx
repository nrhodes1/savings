"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Account, Person } from "@/lib/types";
import { ACCOUNT_TYPES, ACCOUNT_TYPE_LABELS } from "@/lib/accountTypes";
import { formatCurrency, formatPercent } from "@/lib/format";
import {
  validateAccountName,
  validateAnnualIncrease,
  validateAnnualReturn,
  validateBalance,
  validateMonthlyContribution,
} from "@/lib/validation";
import { NumberField } from "./fields/NumberField";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

type AccountCardProps = {
  account: Account;
  people: Person[];
  expanded: boolean;
  onExpand: () => void;
  onCollapse: () => void;
  onChange: (updater: (a: Account) => Account) => void;
  onDelete: () => void;
  autoFocusName?: boolean;
  ownerColor: string;
};

export function AccountCard({
  account,
  people,
  expanded,
  onExpand,
  onCollapse,
  onChange,
  onDelete,
  autoFocusName,
  ownerColor,
}: AccountCardProps) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const reducedMotion = usePrefersReducedMotion();
  const owner = people.find((p) => p.id === account.ownerId);

  return (
    <div className="rounded-[10px] border border-rule bg-surface shadow-[var(--shadow-card)]">
      <button
        type="button"
        onClick={() => (expanded ? onCollapse() : onExpand())}
        aria-expanded={expanded}
        className="flex w-full flex-col gap-1 px-4 py-3 text-left"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-[15px] text-ink">{account.name}</span>
          <span className="text-[13px]" style={{ color: ownerColor }}>
            {owner?.name}
          </span>
        </div>
        <p className="font-display tnum text-[20px] text-ink">
          {formatCurrency(account.balance)}
          <span className="ml-2 text-[13px] font-sans text-ink-soft">
            {formatPercent(account.annualReturnPct)} · {formatCurrency(account.monthlyContribution)}/mo
          </span>
        </p>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.2 }}
            style={{ overflow: "hidden" }}
          >
            <div className="flex flex-col gap-3 border-t border-rule px-4 py-4">
              <div>
                <label htmlFor={`${account.id}-name`} className="label-utility mb-1 block">
                  Name
                </label>
                <input
                  id={`${account.id}-name`}
                  type="text"
                  autoFocus={autoFocusName}
                  value={account.name}
                  onChange={(e) => onChange((a) => ({ ...a, name: e.target.value }))}
                  aria-invalid={validateAccountName(account.name) ? true : undefined}
                  className="w-full rounded-[6px] border border-rule bg-surface-sunk px-3 py-2 text-[15px] text-ink outline-none focus-visible:outline-2 focus-visible:outline-growth"
                />
                {validateAccountName(account.name) && (
                  <p role="alert" className="mt-1 text-[13px] text-warn">
                    {validateAccountName(account.name)}
                  </p>
                )}
              </div>

              <div>
                <span className="label-utility mb-1 block">Owner</span>
                <div className="inline-flex rounded-full bg-surface-sunk p-1">
                  {people.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => onChange((a) => ({ ...a, ownerId: p.id }))}
                      aria-pressed={account.ownerId === p.id}
                      className={`rounded-full px-3 py-1 text-[13px] transition-colors ${
                        account.ownerId === p.id ? "bg-surface text-ink shadow-sm font-medium" : "text-ink-soft"
                      }`}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor={`${account.id}-type`} className="label-utility mb-1 block">
                  Type
                </label>
                <select
                  id={`${account.id}-type`}
                  value={account.type}
                  onChange={(e) => onChange((a) => ({ ...a, type: e.target.value as Account["type"] }))}
                  className="w-full rounded-[6px] border border-rule bg-surface-sunk px-3 py-2 text-[15px] text-ink outline-none focus-visible:outline-2 focus-visible:outline-growth"
                >
                  {ACCOUNT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {ACCOUNT_TYPE_LABELS[t]}
                    </option>
                  ))}
                </select>
              </div>

              <NumberField
                id={`${account.id}-balance`}
                label="Current balance"
                value={account.balance}
                onChange={(v) => onChange((a) => ({ ...a, balance: v }))}
                format={formatCurrency}
                step={100}
                min={0}
                max={1e9}
                error={validateBalance(account.balance)}
              />
              <NumberField
                id={`${account.id}-return`}
                label="Expected annual return"
                value={account.annualReturnPct}
                onChange={(v) => onChange((a) => ({ ...a, annualReturnPct: v }))}
                format={formatPercent}
                step={0.1}
                min={-20}
                max={30}
                error={validateAnnualReturn(account.annualReturnPct)}
              />
              <NumberField
                id={`${account.id}-contribution`}
                label="Monthly contribution"
                value={account.monthlyContribution}
                onChange={(v) => onChange((a) => ({ ...a, monthlyContribution: v }))}
                format={formatCurrency}
                step={50}
                min={0}
                max={1e6}
                error={validateMonthlyContribution(account.monthlyContribution)}
              />
              <NumberField
                id={`${account.id}-increase`}
                label="Annual increase"
                value={account.annualIncreasePct}
                onChange={(v) => onChange((a) => ({ ...a, annualIncreasePct: v }))}
                format={formatPercent}
                step={0.1}
                min={0}
                max={25}
                error={validateAnnualIncrease(account.annualIncreasePct)}
              />

              <div className="pt-1">
                {confirmingDelete ? (
                  <div className="flex items-center justify-between gap-3 text-[13px]">
                    <span className="text-ink-soft">Delete this account?</span>
                    <div className="flex gap-3">
                      <button type="button" onClick={onDelete} className="text-warn">
                        Delete
                      </button>
                      <button type="button" onClick={() => setConfirmingDelete(false)} className="text-ink-soft">
                        Keep
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmingDelete(true)}
                    className="text-[13px] text-ink-faint hover:text-warn"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
