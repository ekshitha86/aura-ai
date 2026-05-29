import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useRef, useState } from "react";
import { Delete, Eraser, Space, Volume2 } from "lucide-react";
import { HandCamera } from "@/components/HandCamera";
import { classifyASL } from "@/lib/asl";
import type { HandFrame } from "@/lib/hand-detector";

export const Route = createFileRoute("/_dash/sign")({
  head: () => ({ meta: [{ title: "Sign Language Translator · EmotionSense AI" }] }),
  component: SignPage,
});

function SignPage() {
  const [letter, setLetter] = useState<{ letter: string; conf: number } | null>(null);
  const [text, setText] = useState("");
  const [hold, setHold] = useState(0); // 0..1 progress for adding a letter

  // Debounce: same letter must persist ~900ms before being added
  const holdRef = useRef<{ letter: string; since: number } | null>(null);
  const lastAddedRef = useRef<{ letter: string; at: number } | null>(null);

  const onFrame = useCallback((f: HandFrame) => {
    const top = f.hands[0];
    if (!top) {
      setLetter(null);
      setHold(0);
      holdRef.current = null;
      return;
    }
    const r = classifyASL(top.landmarks);
    setLetter(r);
    const now = performance.now();
    if (!r || r.conf < 0.55) {
      setHold(0);
      holdRef.current = null;
      return;
    }
    if (!holdRef.current || holdRef.current.letter !== r.letter) {
      holdRef.current = { letter: r.letter, since: now };
    }
    const elapsed = now - holdRef.current.since;
    const HOLD_MS = 900;
    setHold(Math.min(1, elapsed / HOLD_MS));
    if (elapsed >= HOLD_MS) {
      const wasRecent =
        lastAddedRef.current?.letter === r.letter &&
        now - lastAddedRef.current.at < 1500;
      if (!wasRecent) {
        setText((t) => t + r.letter);
        lastAddedRef.current = { letter: r.letter, at: now };
      }
      holdRef.current = { letter: r.letter, since: now };
    }
  }, []);

  const speak = () => {
    if (!text.trim()) return;
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1;
    u.pitch = 1;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  };

  return (
    <div className="space-y-6">
      <header>
        <div className="text-xs uppercase tracking-[0.25em] text-neon-cyan">
          ASL Translator
        </div>
        <h1 className="font-display text-3xl md:text-4xl">Sign Language Translator</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Hold each ASL letter for ~1 second to spell words. Heuristic A–Z classifier on
          MediaPipe landmarks.
        </p>
      </header>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <HandCamera onFrame={onFrame} fps={18} />

          <div className="rounded-2xl neon-border p-6">
            <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground mb-3">
              Word builder
            </div>
            <div className="min-h-[80px] rounded-xl bg-black/40 border border-border/60 p-4 font-display text-3xl md:text-5xl tracking-[0.2em] text-neon break-words">
              {text || <span className="text-muted-foreground/60 text-xl">Sign letters…</span>}
              <span className="ml-1 inline-block w-3 h-8 bg-neon-cyan/80 animate-pulse align-middle" />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={() => setText((t) => t + " ")}
                className="rounded-lg border border-border/60 px-3 py-2 text-sm flex items-center gap-2 hover:bg-white/5"
              >
                <Space className="h-4 w-4" /> Space
              </button>
              <button
                onClick={() => setText((t) => t.slice(0, -1))}
                className="rounded-lg border border-border/60 px-3 py-2 text-sm flex items-center gap-2 hover:bg-white/5"
              >
                <Delete className="h-4 w-4" /> Delete
              </button>
              <button
                onClick={() => setText("")}
                className="rounded-lg border border-destructive/40 px-3 py-2 text-sm flex items-center gap-2 hover:bg-destructive/10"
              >
                <Eraser className="h-4 w-4" /> Clear
              </button>
              <button
                onClick={speak}
                className="ml-auto rounded-lg bg-gradient-to-r from-neon-blue to-neon-purple px-4 py-2 text-sm font-medium text-primary-foreground flex items-center gap-2 glow-blue"
              >
                <Volume2 className="h-4 w-4" /> Speak
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl glass p-6 text-center">
            <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
              Current letter
            </div>
            <div className="font-display text-8xl md:text-9xl text-neon mt-3 min-h-[120px]">
              {letter?.letter ?? "—"}
            </div>
            <div className="text-xs text-muted-foreground">
              {letter ? `${Math.round(letter.conf * 100)}% match` : "Awaiting sign…"}
            </div>
            <div className="mt-4">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                Hold to lock in
              </div>
              <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-neon-blue to-neon-purple transition-all"
                  style={{ width: `${hold * 100}%` }}
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl glass p-5 text-xs text-muted-foreground leading-relaxed">
            <div className="text-foreground uppercase tracking-[0.2em] mb-2">Tips</div>
            <ul className="space-y-1 list-disc pl-4">
              <li>Face palm toward camera, hand 30–50 cm away.</li>
              <li>Good lighting helps landmark accuracy.</li>
              <li>Hold each letter steady for ~1s — the bar fills, then it locks in.</li>
              <li>J & Z (motion letters) are approximated from their start pose.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}