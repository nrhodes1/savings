"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { HouseholdState } from "@/lib/types";
import { normalizeHouseholdState } from "@/lib/migrate";

export type SaveStatus = "loading" | "saved" | "saving" | "retrying";

export type ConflictInfo = { data: HouseholdState; updatedAt: string };

const DEBOUNCE_MS = 700;
const RETRY_MS = 4000;
const POLL_MS = 60_000;

export function useHouseholdState() {
  const [state, setState] = useState<HouseholdState | null>(null);
  const [status, setStatus] = useState<SaveStatus>("loading");
  const [conflict, setConflict] = useState<ConflictInfo | null>(null);

  const baseUpdatedAt = useRef<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stateRef = useRef<HouseholdState | null>(null);
  const saveRef = useRef<() => void>(() => {});

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const applyServerState = useCallback((data: HouseholdState, updatedAt: string) => {
    baseUpdatedAt.current = updatedAt;
    setState(data);
    setStatus("saved");
    setConflict(null);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/state");
      if (!res.ok || cancelled) return;
      const body = await res.json();
      if (!cancelled) applyServerState(normalizeHouseholdState(body.data), body.updatedAt);
    })();
    return () => {
      cancelled = true;
    };
  }, [applyServerState]);

  const save = useCallback(async () => {
    const current = stateRef.current;
    if (!current || baseUpdatedAt.current === null) return;

    setStatus("saving");
    try {
      const res = await fetch("/api/state", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: current, baseUpdatedAt: baseUpdatedAt.current }),
      });

      if (res.status === 409) {
        const body = await res.json();
        setConflict({ data: normalizeHouseholdState(body.data), updatedAt: body.updatedAt });
        setStatus("saved");
        return;
      }

      if (!res.ok) throw new Error("save failed");

      const body = await res.json();
      baseUpdatedAt.current = body.updatedAt;
      setStatus("saved");
    } catch {
      setStatus("retrying");
      retryTimer.current = setTimeout(() => saveRef.current(), RETRY_MS);
    }
  }, []);

  useEffect(() => {
    saveRef.current = save;
  }, [save]);

  const updateState = useCallback((updater: (prev: HouseholdState) => HouseholdState) => {
    setState((prev) => (prev ? updater(prev) : prev));
    if (saveTimer.current) clearTimeout(saveTimer.current);
    if (retryTimer.current) {
      clearTimeout(retryTimer.current);
      retryTimer.current = null;
    }
    saveTimer.current = setTimeout(() => saveRef.current(), DEBOUNCE_MS);
  }, []);

  const checkForUpdates = useCallback(async () => {
    const res = await fetch("/api/state");
    if (!res.ok) return;
    const body = await res.json();
    if (body.updatedAt === baseUpdatedAt.current) return;

    const normalized = normalizeHouseholdState(body.data);
    const current = stateRef.current;
    const unchanged = current && JSON.stringify(current) === JSON.stringify(normalized);
    if (unchanged) {
      baseUpdatedAt.current = body.updatedAt;
      return;
    }

    setConflict({ data: normalized, updatedAt: body.updatedAt });
  }, []);

  useEffect(() => {
    function onFocus() {
      checkForUpdates();
    }
    window.addEventListener("focus", onFocus);
    const interval = setInterval(checkForUpdates, POLL_MS);
    return () => {
      window.removeEventListener("focus", onFocus);
      clearInterval(interval);
    };
  }, [checkForUpdates]);

  const loadTheirVersion = useCallback(() => {
    if (!conflict) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    if (retryTimer.current) clearTimeout(retryTimer.current);
    applyServerState(conflict.data, conflict.updatedAt);
  }, [conflict, applyServerState]);

  return { state, status, updateState, conflict, loadTheirVersion };
}
