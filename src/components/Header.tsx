"use client";

import { useRouter } from "next/navigation";
import { Toggle } from "./Toggle";
import type { SaveStatus } from "@/hooks/useHouseholdState";

type HeaderProps = {
  showRealDollars: boolean;
  onToggleRealDollars: (value: boolean) => void;
  status: SaveStatus;
};

const STATUS_LABEL: Record<SaveStatus, string> = {
  loading: "",
  saved: "Saved",
  saving: "Saving…",
  retrying: "Couldn't save — retrying",
};

export function Header({ showRealDollars, onToggleRealDollars, status }: HeaderProps) {
  const router = useRouter();

  async function handleSignOut() {
    await fetch("/api/logout", { method: "POST" });
    router.replace("/unlock");
    router.refresh();
  }

  return (
    <header className="flex items-center justify-between gap-4 py-6">
      <h1 className="font-display text-[20px] leading-none text-ink">Savings</h1>
      <div className="flex items-center gap-5">
        <Toggle checked={showRealDollars} onChange={onToggleRealDollars} label="Today's dollars" />
        <span className="text-[11px] text-ink-faint tnum" aria-live="polite">
          {STATUS_LABEL[status]}
        </span>
        <button
          type="button"
          onClick={handleSignOut}
          aria-label="Sign out"
          title="Sign out"
          className="text-ink-faint hover:text-ink-soft transition-colors"
        >
          <LockIcon />
        </button>
      </div>
    </header>
  );
}

function LockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="3" y="7" width="10" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}
