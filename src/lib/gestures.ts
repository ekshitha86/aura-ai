export const GESTURES = [
  "thumbs_up",
  "thumbs_down",
  "peace",
  "ok",
  "stop",
  "wave",
  "love",
  "rock",
  "cross_fingers",
  "none",
] as const;

export type GestureId = (typeof GESTURES)[number];

export const GESTURE_META: Record<GestureId, { label: string; emoji: string; color: string }> = {
  thumbs_up:     { label: "Thumbs Up",     emoji: "👍", color: "oklch(0.78 0.18 145)" },
  thumbs_down:   { label: "Thumbs Down",   emoji: "👎", color: "oklch(0.65 0.22 25)" },
  peace:         { label: "Peace",         emoji: "✌️", color: "oklch(0.74 0.22 320)" },
  ok:            { label: "OK",            emoji: "👌", color: "oklch(0.78 0.18 200)" },
  stop:          { label: "Stop",          emoji: "✋", color: "oklch(0.70 0.22 60)" },
  wave:          { label: "Wave",          emoji: "👋", color: "oklch(0.76 0.16 100)" },
  love:          { label: "Love Sign",     emoji: "🤟", color: "oklch(0.72 0.20 350)" },
  rock:          { label: "Rock Sign",     emoji: "🤘", color: "oklch(0.68 0.20 290)" },
  cross_fingers: { label: "Cross Fingers", emoji: "🤞", color: "oklch(0.74 0.18 230)" },
  none:          { label: "—",             emoji: "🫥", color: "oklch(0.55 0.02 250)" },
};

export interface GestureHistoryEntry {
  id: string;
  timestamp: number;
  gesture: GestureId;
  confidence: number;
  hand: "Left" | "Right" | "Both";
  imageDataUrl?: string;
}