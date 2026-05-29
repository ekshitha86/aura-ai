export const EMOTIONS = [
  "happy",
  "sad",
  "angry",
  "fear",
  "surprise",
  "neutral",
  "disgust",
] as const;

export type Emotion = (typeof EMOTIONS)[number];

export const EMOTION_META: Record<Emotion, { label: string; emoji: string; color: string }> = {
  happy:    { label: "Happy",    emoji: "😊", color: "oklch(0.82 0.18 85)" },
  sad:      { label: "Sad",      emoji: "😢", color: "oklch(0.65 0.18 250)" },
  angry:    { label: "Angry",    emoji: "😠", color: "oklch(0.65 0.25 25)" },
  fear:     { label: "Fear",     emoji: "😨", color: "oklch(0.62 0.18 290)" },
  surprise: { label: "Surprise", emoji: "😲", color: "oklch(0.74 0.22 320)" },
  neutral:  { label: "Neutral",  emoji: "😐", color: "oklch(0.72 0.05 250)" },
  disgust:  { label: "Disgust",  emoji: "🤢", color: "oklch(0.65 0.18 140)" },
};

export interface DetectedFace {
  box: { x: number; y: number; width: number; height: number };
  emotion: Emotion;
  confidence: number;
  scores: Record<Emotion, number>;
}

export interface DetectResponse {
  faces: DetectedFace[];
}

export interface HistoryEntry {
  id: string;
  timestamp: number;
  emotion: Emotion;
  confidence: number;
  imageDataUrl?: string;
  source: "live_camera" | "user_upload";
}