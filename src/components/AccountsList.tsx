"use client";

import { useState } from "react";
import type { Account, Person } from "@/lib/types";
import { AccountCard } from "./AccountCard";

type AccountsListProps = {
  accounts: Account[];
  people: Person[];
  onAccountChange: (id: string, updater: (a: Account) => Account) => void;
  onAddAccount: () => string;
  onDeleteAccount: (id: string) => void;
  ownerColor: (personId: string) => string;
};

export function AccountsList({
  accounts,
  people,
  onAccountChange,
  onAddAccount,
  onDeleteAccount,
  ownerColor,
}: AccountsListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [justAddedId, setJustAddedId] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-3">
      <p className="label-utility">Accounts</p>
      {accounts.map((account) => (
        <AccountCard
          key={account.id}
          account={account}
          people={people}
          expanded={expandedId === account.id}
          onExpand={() => setExpandedId(account.id)}
          onCollapse={() => setExpandedId(null)}
          onChange={(updater) => onAccountChange(account.id, updater)}
          onDelete={() => {
            onDeleteAccount(account.id);
            if (expandedId === account.id) setExpandedId(null);
          }}
          autoFocusName={justAddedId === account.id}
          ownerColor={ownerColor(account.ownerId)}
        />
      ))}
      <button
        type="button"
        onClick={() => {
          const id = onAddAccount();
          setExpandedId(id);
          setJustAddedId(id);
        }}
        className="rounded-[10px] border border-dashed border-rule px-4 py-3 text-[13px] text-ink-soft hover:border-ink-faint hover:text-ink"
      >
        + Add account
      </button>
    </div>
  );
}
