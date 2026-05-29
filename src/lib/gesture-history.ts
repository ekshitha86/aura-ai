import { useCallback, useEffect, useState } from "react";
import type { GestureHistoryEntry } from "./gestures";

function keyFor(email: string) {
  return `emotionsense_gestures::${email || "guest"}`;
}

export function loadGestureHistory(email: string): GestureHistoryEntry[] {
  try {
    const raw = localStorage.getItem(keyFor(email));
    return raw ? (JSON.parse(raw) as GestureHistoryEntry[]) : [];
  } catch {
    return [];
  }
}

function save(email: string, entries: GestureHistoryEntry[]) {
  localStorage.setItem(keyFor(email), JSON.stringify(entries.slice(0, 300)));
}

export function useGestureHistory(email: string) {
  const [entries, setEntries] = useState<GestureHistoryEntry[]>([]);

  useEffect(() => {
    setEntries(loadGestureHistory(email));
  }, [email]);

  const add = useCallback(
    (entry: GestureHistoryEntry) => {
      setEntries((prev) => {
        const next = [entry, ...prev];
        save(email, next);
        return next;
      });
    },
    [email],
  );

  const clear = useCallback(() => {
    save(email, []);
    setEntries([]);
  }, [email]);

  return { entries, add, clear };
}