import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { HandCamera } from "@/components/HandCamera";
import { useAuth } from "@/lib/auth";
import { useGestureHistory } from "@/lib/gesture-history";
import { GESTURES, GESTURE_META, type GestureId } from "@/lib/gestures";
import type { HandFrame } from "@/lib/hand-detector";

export const Route = createFileRoute("/_dash/gestures")({
  head: () => ({ meta: [{ title: "Gesture Recognition · EmotionSense AI" }] }),
  component: GesturesPage,
});

function GesturesPage() {
  const { user } = useAuth();
  const { entries, add, clear } = useGestureHistory(user?.email ?? "");
  const [frame, setFrame] = useState<HandFrame | null>(null);
  const lastGestureRef = useRef<GestureId | null>(null);
  const lastSavedRef = useRef<number>(0);

  const onFrame = useCallback(
    (f: HandFrame, v: HTMLVideoElement) => {
      setFrame(f);
      const top = f.hands[0];
      if (!top || top.gesture === "none" || top.confidence < 0.55) return;
      const now = Date.now();
      if (top.gesture !== lastGestureRef.current || now - lastSavedRef.current > 4000) {
        lastGestureRef.current = top.gesture;
        lastSavedRef.current = now;
        const snap = document.createElement("canvas");
        snap.width = 160;
        snap.height = (160 * v.videoHeight) / v.videoWidth;
        snap.getContext("2d")?.drawImage(v, 0, 0, snap.width, snap.height);
        // Persist for cross-page insights
        try {
          localStorage.setItem(
            `emotionsense_last_gesture::${user?.email ?? "guest"}`,
            JSON.stringify({ gesture: top.gesture, t: now }),
          );
        } catch { /* ignore */ }
        add({
          id: `${now}-${Math.random().toString(36).slice(2, 8)}`,
          timestamp: now,
          gesture: top.gesture,
          confidence: top.confidence,
          hand: f.hands.length > 1 ? "Both" : top.handedness,
          imageDataUrl: snap.toDataURL("image/jpeg", 0.6),
        });
      }
    },
    [add, user?.email],
  );

  const top = frame?.hands[0];

  return (
    <div className="space-y-6">
      <header>
        <div className="text-xs uppercase tracking-[0.25em] text-neon-cyan">Hand intelligence</div>
        <h1 className="font-display text-3xl md:text-4xl">Gesture Recognition</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Real-time MediaPipe hand tracking with neon skeleton overlay & 15-gesture classifier.
        </p>
      </header>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <HandCamera onFrame={onFrame} />
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl glass p-6 text-center">
            <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
              Detected gesture
            </div>
            {top && top.gesture !== "none" ? (
              <>
                <div className="text-7xl mt-3">{GESTURE_META[top.gesture].emoji}</div>
                <div className="font-display text-2xl mt-1">
                  {GESTURE_META[top.gesture].label}
                </div>
                <div className="mt-3">
                  <div className="text-xs text-muted-foreground">Confidence</div>
                  <div className="text-3xl font-display text-neon">
                    {Math.round(top.confidence * 100)}%
                  </div>
                </div>
                <div className="mt-3 text-xs text-muted-foreground">
                  Hand: <span className="text-foreground">{top.handedness}</span> · Hands tracked:{" "}
                  <span className="text-foreground">{frame?.hands.length ?? 0}</span>
                </div>
              </>
            ) : (
              <div className="py-10 text-muted-foreground text-sm">
                {top ? "Hand visible — make a gesture" : "Awaiting hand…"}
              </div>
            )}
          </div>

          {/* Vocabulary block removed */}
        </div>
      </div>

      <div className="rounded-2xl glass p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
            Gesture history ({entries.length})
          </div>
          {entries.length > 0 && (
            <button
              onClick={clear}
              className="text-xs flex items-center gap-1 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-3 w-3" /> Clear
            </button>
          )}
        </div>
        {entries.length === 0 ? (
          <div className="text-sm text-muted-foreground py-6 text-center">
            No gestures captured yet.
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {entries.slice(0, 24).map((e) => {
              const m = GESTURE_META[e.gesture];
              return (
                <div
                  key={e.id}
                  className="rounded-lg border border-border/40 overflow-hidden bg-white/[0.02]"
                >
                  {e.imageDataUrl && (
                    <img src={e.imageDataUrl} alt="" className="w-full aspect-video object-cover" />
                  )}
                  <div className="p-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span>{m.emoji} {m.label}</span>
                      <span className="text-muted-foreground">
                        {Math.round(e.confidence * 100)}%
                      </span>
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-1">
                      {new Date(e.timestamp).toLocaleTimeString()} · {e.hand}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}