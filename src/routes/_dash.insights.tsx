import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useHistory } from "@/lib/history";
import { useGestureHistory } from "@/lib/gesture-history";
import { EMOTION_META, type Emotion } from "@/lib/emotions";
import { GESTURE_META, type GestureId } from "@/lib/gestures";

export const Route = createFileRoute("/_dash/insights")({
  head: () => ({ meta: [{ title: "Communication Insights · EmotionSense AI" }] }),
  component: InsightsPage,
});

type InsightKey = `${Emotion}|${GestureId}`;

const INSIGHTS: Partial<Record<InsightKey, { title: string; tone: "positive" | "neutral" | "warn" | "alert"; detail: string }>> = {
  "happy|thumbs_up": { title: "Positive Approval", tone: "positive", detail: "Strong agreement and joy combined." },
  "happy|peace":     { title: "Cheerful Greeting", tone: "positive", detail: "Friendly, open communication." },
  "happy|ok":        { title: "All Good", tone: "positive", detail: "Comfort + acknowledgement." },
  "happy|love":      { title: "Affection", tone: "positive", detail: "Warm emotional bond." },
  "happy|wave":      { title: "Friendly Hello", tone: "positive", detail: "Welcoming social greeting." },
  "sad|stop":        { title: "Possible Distress Signal", tone: "alert", detail: "Sadness with a stop gesture — check in with the person." },
  "sad|thumbs_down": { title: "Disapproval / Hurt", tone: "alert", detail: "Negative emotion confirmed by gesture." },
  "angry|stop":      { title: "Strong Boundary", tone: "alert", detail: "Anger + halt signal — high tension." },
  "angry|thumbs_down":{ title: "Rejection", tone: "alert", detail: "Active disapproval." },
  "fear|stop":       { title: "Possible Distress Signal", tone: "alert", detail: "Fear with stop gesture — potential help needed." },
  "fear|cross_fingers":{ title: "Anxious Hope", tone: "warn", detail: "Worry paired with wishful gesture." },
  "surprise|ok":     { title: "Pleasant Surprise", tone: "positive", detail: "Unexpected but received well." },
  "surprise|rock":   { title: "Excitement", tone: "positive", detail: "Hype-energy combo." },
  "neutral|wave":    { title: "Casual Acknowledgement", tone: "neutral", detail: "Routine social signal." },
  "disgust|thumbs_down":{ title: "Strong Rejection", tone: "alert", detail: "Visceral disapproval." },
};

const TONE_STYLES: Record<string, string> = {
  positive: "border-emerald-400/40 bg-emerald-400/5",
  neutral:  "border-border/50",
  warn:     "border-yellow-400/40 bg-yellow-400/5",
  alert:    "border-destructive/40 bg-destructive/5",
};

function InsightsPage() {
  const { user } = useAuth();
  const { entries: emotions } = useHistory(user?.email ?? "");
  const { entries: gestures } = useGestureHistory(user?.email ?? "");

  // Pair emotion + gesture events that occurred within 8s of each other
  const pairs = useMemo(() => {
    const out: { t: number; emotion: Emotion; gesture: GestureId; insight?: typeof INSIGHTS[InsightKey] }[] = [];
    const WINDOW = 8000;
    for (const g of gestures) {
      const e = emotions.find((e) => Math.abs(e.timestamp - g.timestamp) < WINDOW);
      if (e) {
        const key = `${e.emotion}|${g.gesture}` as InsightKey;
        out.push({ t: g.timestamp, emotion: e.emotion, gesture: g.gesture, insight: INSIGHTS[key] });
      }
    }
    return out.slice(0, 30);
  }, [emotions, gestures]);

  return (
    <div className="space-y-6">
      <header>
        <div className="text-xs uppercase tracking-[0.25em] text-neon-cyan">
          Human × Hand intelligence
        </div>
        <h1 className="font-display text-3xl md:text-4xl">Communication Insights</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Cross-references your facial emotion stream with detected hand gestures to surface
          higher-order meaning.
        </p>
      </header>

      <div className="grid md:grid-cols-3 gap-4">
        <Stat label="Emotion samples" value={emotions.length} />
        <Stat label="Gestures captured" value={gestures.length} />
        <Stat label="Combined insights" value={pairs.filter((p) => p.insight).length} />
      </div>

      <div className="rounded-2xl glass p-5">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-4 w-4 text-neon-cyan" />
          <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
            Recent combined signals
          </div>
        </div>
        {pairs.length === 0 ? (
          <div className="text-sm text-muted-foreground py-8 text-center">
            Use the Live Monitor and Gesture pages together — insights will appear here.
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-3">
            {pairs.map((p, i) => {
              const em = EMOTION_META[p.emotion];
              const gm = GESTURE_META[p.gesture];
              const insight = p.insight ?? {
                title: "Mixed signal",
                tone: "neutral" as const,
                detail: "No predefined interpretation for this combination.",
              };
              return (
                <div
                  key={i}
                  className={`rounded-xl border p-4 ${TONE_STYLES[insight.tone]}`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="text-3xl">{em.emoji}</div>
                    <div className="text-xl text-muted-foreground">+</div>
                    <div className="text-3xl">{gm.emoji}</div>
                    <div className="ml-auto text-[10px] text-muted-foreground">
                      {new Date(p.t).toLocaleTimeString()}
                    </div>
                  </div>
                  <div className="font-display text-lg">{insight.title}</div>
                  <div className="text-xs text-muted-foreground mt-1">{insight.detail}</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-2">
                    {em.label} + {gm.label}
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

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl glass p-5">
      <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground">{label}</div>
      <div className="font-display text-4xl text-neon mt-2">{value}</div>
    </div>
  );
}