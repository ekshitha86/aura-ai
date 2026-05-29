import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Download, Search, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { exportHistoryJson, useHistory } from "@/lib/history";
import { EMOTIONS, EMOTION_META, type Emotion } from "@/lib/emotions";

export const Route = createFileRoute("/_dash/history")({
  head: () => ({ meta: [{ title: "History · EmotionSense AI" }] }),
  component: HistoryPage,
});

function HistoryPage() {
  const { user } = useAuth();
  const { entries, remove, clear } = useHistory(user?.email ?? "");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Emotion | "all">("all");

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (filter !== "all" && e.emotion !== filter) return false;
      if (query && !EMOTION_META[e.emotion].label.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [entries, query, filter]);

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="text-xs uppercase tracking-[0.25em] text-neon-cyan">History</div>
          <h1 className="font-display text-3xl md:text-4xl">Captured moments</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {entries.length} snapshot{entries.length === 1 ? "" : "s"} stored locally for{" "}
            <span className="text-foreground">{user?.email}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => exportHistoryJson(entries)}
            disabled={entries.length === 0}
            className="rounded-lg border border-border px-3 py-2 text-sm flex items-center gap-2 hover:bg-white/5 disabled:opacity-40"
          >
            <Download className="h-4 w-4" /> Export JSON
          </button>
          <button
            onClick={() => {
              if (confirm("Delete all history?")) clear();
            }}
            disabled={entries.length === 0}
            className="rounded-lg border border-destructive/50 px-3 py-2 text-sm flex items-center gap-2 hover:bg-destructive/10 disabled:opacity-40"
          >
            <Trash2 className="h-4 w-4" /> Clear all
          </button>
        </div>
      </header>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search emotion…"
            className="w-full rounded-lg bg-input/60 border border-border pl-9 pr-3 py-2 text-sm"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as Emotion | "all")}
          className="rounded-lg bg-input/60 border border-border px-3 py-2 text-sm"
        >
          <option value="all">All emotions</option>
          {EMOTIONS.map((e) => (
            <option key={e} value={e}>
              {EMOTION_META[e].emoji} {EMOTION_META[e].label}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl glass p-12 text-center text-muted-foreground">
          No history yet. Start the live monitor or upload an image.
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((e) => {
            const m = EMOTION_META[e.emotion];
            return (
              <div key={e.id} className="rounded-2xl glass overflow-hidden group">
                <div className="relative aspect-square bg-black">
                  {e.imageDataUrl ? (
                    <img src={e.imageDataUrl} alt={m.label} className="h-full w-full object-cover" />
                  ) : (
                    <div className="grid place-items-center h-full text-6xl">{m.emoji}</div>
                  )}
                  <div
                    className="absolute top-2 left-2 rounded-full px-2 py-0.5 text-xs font-medium"
                    style={{ background: m.color, color: "black" }}
                  >
                    {m.emoji} {m.label}
                  </div>
                  <button
                    onClick={() => remove(e.id)}
                    className="absolute top-2 right-2 rounded-full bg-black/60 p-1.5 opacity-0 group-hover:opacity-100 transition"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="p-3 text-xs flex justify-between">
                  <span className="text-muted-foreground">{new Date(e.timestamp).toLocaleString()}</span>
                  <span className="text-neon">{Math.round(e.confidence * 100)}%</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}