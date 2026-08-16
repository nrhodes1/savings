"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function UnlockPage() {
  const router = useRouter();
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/unlock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passcode }),
    });

    if (res.ok) {
      router.replace("/");
      router.refresh();
      return;
    }

    const body = await res.json().catch(() => ({ error: "Something went wrong." }));
    setError(body.error ?? "Something went wrong.");
    setSubmitting(false);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-6">
      <form onSubmit={handleSubmit} className="w-full max-w-xs flex flex-col items-center gap-4">
        <p className="text-[15px] text-ink-soft">Enter the passcode.</p>
        <input
          type="password"
          inputMode="text"
          autoFocus
          value={passcode}
          onChange={(e) => setPasscode(e.target.value)}
          className="w-full rounded-[6px] border border-rule bg-surface px-4 py-3 text-center text-[20px] tnum text-ink outline-none focus-visible:outline-2 focus-visible:outline-ink"
          aria-label="Passcode"
        />
        {error && (
          <p role="alert" className="text-[13px] text-warn">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={submitting || passcode.length === 0}
          className="w-full rounded-[6px] bg-ink px-4 py-3 text-[15px] text-paper transition-opacity disabled:opacity-40"
        >
          Unlock
        </button>
      </form>
    </main>
  );
}
