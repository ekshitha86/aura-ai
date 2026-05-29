import { useEffect, useState, useCallback } from "react";
import type { HistoryEntry } from "./emotions";

function keyFor(email: string) {
  return `emotionsense_history::${email || "guest"}`;
}

export function loadHistory(email: string): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(keyFor(email));
    return raw ? (JSON.parse(raw) as HistoryEntry[]) : [];
  } catch {
    return [];
  }
}

function saveHistory(email: string, entries: HistoryEntry[]) {
  // Cap to last 500 to avoid blowing localStorage
  const capped = entries.slice(0, 500);
  localStorage.setItem(keyFor(email), JSON.stringify(capped));
}

export function useHistory(email: string) {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    setEntries(loadHistory(email));
    const onStorage = (e: StorageEvent) => {
      if (e.key === keyFor(email)) setEntries(loadHistory(email));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [email]);

  const add = useCallback(
    (entry: HistoryEntry) => {
      setEntries((prev) => {
        const next = [entry, ...prev];
        saveHistory(email, next);
        return next;
      });
    },
    [email],
  );

  const remove = useCallback(
    (id: string) => {
      setEntries((prev) => {
        const next = prev.filter((e) => e.id !== id);
        saveHistory(email, next);
        return next;
      });
    },
    [email],
  );

  const clear = useCallback(() => {
    saveHistory(email, []);
    setEntries([]);
  }, [email]);

  return { entries, add, remove, clear };
}

export function exportHistoryJson(entries: HistoryEntry[]) {
  const blob = new Blob([JSON.stringify(entries, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `emotionsense-history-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}