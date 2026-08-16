"use client";

import { useEffect, useRef, useState } from "react";
import type { Scenario } from "@/lib/types";
import { MAX_SCENARIOS } from "@/lib/scenarioColors";

type ScenarioSwitcherProps = {
  scenarios: Scenario[];
  activeScenarioId: string;
  onSelect: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
  /** Scenario to auto-open the rename field for, right after it's created. */
  autoRenameId?: string | null;
};

export function ScenarioSwitcher({
  scenarios,
  activeScenarioId,
  onSelect,
  onRename,
  onDelete,
  onAdd,
  autoRenameId,
}: ScenarioSwitcherProps) {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

  // Open the rename field the moment a new scenario id arrives, without an
  // effect — React's recommended "adjust state during render" pattern for
  // deriving state from a prop change.
  const [seenAutoRenameId, setSeenAutoRenameId] = useState(autoRenameId);
  if (autoRenameId !== seenAutoRenameId) {
    setSeenAutoRenameId(autoRenameId);
    if (autoRenameId) setRenamingId(autoRenameId);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {scenarios.map((scenario) => (
        <ScenarioPill
          key={scenario.id}
          scenario={scenario}
          active={scenario.id === activeScenarioId}
          renaming={renamingId === scenario.id}
          confirmingDelete={confirmingDeleteId === scenario.id}
          canDelete={scenarios.length > 1}
          onSelect={() => {
            if (scenario.id === activeScenarioId) {
              setRenamingId(scenario.id);
            } else {
              onSelect(scenario.id);
            }
          }}
          onStartDelete={() => setConfirmingDeleteId(scenario.id)}
          onConfirmDelete={() => {
            onDelete(scenario.id);
            setConfirmingDeleteId(null);
          }}
          onCancelDelete={() => setConfirmingDeleteId(null)}
          onCommitRename={(name) => {
            onRename(scenario.id, name);
            setRenamingId(null);
          }}
          onCancelRename={() => setRenamingId(null)}
        />
      ))}
      {scenarios.length < MAX_SCENARIOS && (
        <button
          type="button"
          onClick={onAdd}
          className="rounded-full border border-dashed border-rule px-3 py-1.5 text-[13px] text-ink-soft hover:border-ink-faint hover:text-ink"
        >
          + New scenario
        </button>
      )}
    </div>
  );
}

function ScenarioPill({
  scenario,
  active,
  renaming,
  confirmingDelete,
  canDelete,
  onSelect,
  onStartDelete,
  onConfirmDelete,
  onCancelDelete,
  onCommitRename,
  onCancelRename,
}: {
  scenario: Scenario;
  active: boolean;
  renaming: boolean;
  confirmingDelete: boolean;
  canDelete: boolean;
  onSelect: () => void;
  onStartDelete: () => void;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
  onCommitRename: (name: string) => void;
  onCancelRename: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (renaming) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [renaming]);

  const base = "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] transition-colors";
  const tone = active
    ? "border-ink bg-surface-sunk text-ink font-medium"
    : "border-rule text-ink-soft hover:border-ink-faint hover:text-ink";

  if (confirmingDelete) {
    return (
      <div className={`${base} border-rule bg-surface-sunk gap-2`}>
        <span className="text-ink-soft">Delete &ldquo;{scenario.name}&rdquo;?</span>
        <button type="button" onClick={onConfirmDelete} className="text-warn">
          Delete
        </button>
        <button type="button" onClick={onCancelDelete} className="text-ink-soft">
          Keep
        </button>
      </div>
    );
  }

  if (renaming) {
    return (
      <div className={`${base} border-ink bg-surface-sunk`}>
        <Dot color={scenario.color} />
        <input
          ref={inputRef}
          type="text"
          defaultValue={scenario.name}
          onBlur={(e) => (e.target.value.trim() ? onCommitRename(e.target.value.trim()) : onCancelRename())}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
            if (e.key === "Escape") onCancelRename();
          }}
          className="w-28 bg-transparent text-ink outline-none"
        />
      </div>
    );
  }

  return (
    <div className={`${base} ${tone}`}>
      <button type="button" onClick={onSelect} className="flex items-center gap-1.5">
        <Dot color={scenario.color} />
        {scenario.name}
      </button>
      {active && canDelete && (
        <button
          type="button"
          onClick={onStartDelete}
          aria-label={`Delete ${scenario.name}`}
          className="text-ink-faint hover:text-warn"
        >
          ×
        </button>
      )}
    </div>
  );
}

function Dot({ color }: { color: string }) {
  return (
    <span
      aria-hidden="true"
      className="inline-block h-[8px] w-[8px] rounded-full"
      style={{ backgroundColor: color }}
    />
  );
}
