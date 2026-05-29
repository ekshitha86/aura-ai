import type {
  GestureRecognizer as GR,
  GestureRecognizerResult,
} from "@mediapipe/tasks-vision";
import type { GestureId } from "./gestures";

const WASM_BASE = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task";

let recognizerPromise: Promise<GR> | null = null;

export function loadHandModels(): Promise<GR> {
  if (recognizerPromise) return recognizerPromise;
  recognizerPromise = (async () => {
    const vision = await import("@mediapipe/tasks-vision");
    const fileset = await vision.FilesetResolver.forVisionTasks(WASM_BASE);
    // Prefer GPU delegate but fall back to CPU if unavailable or errors occur.
    try {
      return vision.GestureRecognizer.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
        runningMode: "VIDEO",
        numHands: 2,
      });
    } catch (err) {
      console.warn("GestureRecognizer GPU delegate failed, falling back to CPU:", err);
      return vision.GestureRecognizer.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate: "CPU" },
        runningMode: "VIDEO",
        numHands: 2,
      });
    }
  })();
  return recognizerPromise;
}

export type Landmark = { x: number; y: number; z: number };

export interface HandResult {
  landmarks: Landmark[];
  handedness: "Left" | "Right";
  mpGesture: string; // raw MediaPipe gesture name
  mpConfidence: number;
  gesture: GestureId; // mapped to our 9
  confidence: number;
}

export interface HandFrame {
  hands: HandResult[];
  timestampMs: number;
}

// MediaPipe built-in categories:
// "None","Closed_Fist","Open_Palm","Pointing_Up","Thumb_Down","Thumb_Up",
// "Victory","ILoveYou"
const MP_TO_OURS: Record<string, GestureId> = {
  Thumb_Up: "thumbs_up",
  Thumb_Down: "thumbs_down",
  Victory: "peace",
  Open_Palm: "stop",
  ILoveYou: "love",
};

function dist(a: Landmark, b: Landmark) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

function fingerExtended(lm: Landmark[], tip: number, pip: number, mcp: number) {
  // Tip is further from wrist than pip => extended
  const wrist = lm[0];
  return dist(lm[tip], wrist) > dist(lm[pip], wrist) * 1.05 &&
    dist(lm[tip], wrist) > dist(lm[mcp], wrist);
}

export function fingersUp(lm: Landmark[]) {
  return {
    index: fingerExtended(lm, 8, 6, 5),
    middle: fingerExtended(lm, 12, 10, 9),
    ring: fingerExtended(lm, 16, 14, 13),
    pinky: fingerExtended(lm, 20, 18, 17),
    thumb: dist(lm[4], lm[0]) > dist(lm[3], lm[0]) * 1.05,
  };
}

// Custom heuristics for gestures MediaPipe doesn't natively give us
export function classifyCustom(lm: Landmark[]): { id: GestureId; conf: number } | null {
  const f = fingersUp(lm);

  // OK sign: thumb tip + index tip close, other fingers extended
  const thumbIndex = dist(lm[4], lm[8]);
  const handSize = dist(lm[0], lm[9]) || 0.0001;
  if (thumbIndex / handSize < 0.35 && f.middle && f.ring && f.pinky) {
    return { id: "ok", conf: 0.85 };
  }

  // Rock sign: index + pinky extended, middle + ring folded
  if (f.index && !f.middle && !f.ring && f.pinky) {
    return { id: "rock", conf: 0.9 };
  }

  // Cross fingers: index + middle extended and crossed (tips close)
  if (f.index && f.middle && !f.ring && !f.pinky) {
    const tipsDist = dist(lm[8], lm[12]) / handSize;
    if (tipsDist < 0.25) return { id: "cross_fingers", conf: 0.8 };
  }

  return null;
}

// Track palm position over time to detect waving
const waveTrack: { t: number; x: number }[] = [];
export function detectWave(lm: Landmark[], now: number): boolean {
  const palmX = lm[9].x;
  waveTrack.push({ t: now, x: palmX });
  while (waveTrack.length && now - waveTrack[0].t > 1200) waveTrack.shift();
  if (waveTrack.length < 6) return false;
  // Count direction reversals
  let reversals = 0;
  let lastDir = 0;
  for (let i = 1; i < waveTrack.length; i++) {
    const d = waveTrack[i].x - waveTrack[i - 1].x;
    if (Math.abs(d) < 0.01) continue;
    const dir = d > 0 ? 1 : -1;
    if (lastDir !== 0 && dir !== lastDir) reversals++;
    lastDir = dir;
  }
  const xs = waveTrack.map((p) => p.x);
  const range = Math.max(...xs) - Math.min(...xs);
  return reversals >= 2 && range > 0.08;
}

export async function recognizeHands(video: HTMLVideoElement, now: number): Promise<HandFrame> {
  const gr = await loadHandModels();
  if (video.readyState < 2 || video.videoWidth === 0) return { hands: [], timestampMs: now };
  let res: GestureRecognizerResult;
  try {
    res = gr.recognizeForVideo(video, now);
  } catch {
    return { hands: [], timestampMs: now };
  }
  const hands: HandResult[] = [];
  const open_palms_for_wave: Landmark[][] = [];
  for (let i = 0; i < res.landmarks.length; i++) {
    const lm = res.landmarks[i] as Landmark[];
    const handed = res.handedness[i]?.[0];
    const cat = res.gestures[i]?.[0];
    const mpName = cat?.categoryName ?? "None";
    const mpConf = cat?.score ?? 0;

    let mapped: GestureId = MP_TO_OURS[mpName] ?? "none";
    let conf = mpConf;

    const custom = classifyCustom(lm);
    if (custom && custom.conf > conf) {
      mapped = custom.id;
      conf = custom.conf;
    }

    if (mpName === "Open_Palm") open_palms_for_wave.push(lm);

    hands.push({
      landmarks: lm,
      handedness: (handed?.categoryName as "Left" | "Right") ?? "Right",
      mpGesture: mpName,
      mpConfidence: mpConf,
      gesture: mapped,
      confidence: conf,
    });
  }

  // Wave detection only on a single open palm
  if (open_palms_for_wave.length === 1 && detectWave(open_palms_for_wave[0], now)) {
    const idx = hands.findIndex((h) => h.mpGesture === "Open_Palm");
    if (idx >= 0) {
      hands[idx].gesture = "wave";
      hands[idx].confidence = Math.max(hands[idx].confidence, 0.9);
    }
  }

  return { hands, timestampMs: now };
}

// Futuristic neon skeleton drawing
const HAND_CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20],
  [0, 17],
];

export function drawHandOverlay(
  canvas: HTMLCanvasElement,
  vw: number,
  vh: number,
  frame: HandFrame,
) {
  canvas.width = vw;
  canvas.height = vh;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, vw, vh);

  for (const h of frame.hands) {
    const color = h.handedness === "Left" ? "#22d3ee" : "#a78bfa";
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.shadowColor = color;
    ctx.shadowBlur = 12;

    for (const [a, b] of HAND_CONNECTIONS) {
      const pa = h.landmarks[a];
      const pb = h.landmarks[b];
      ctx.beginPath();
      ctx.moveTo(pa.x * vw, pa.y * vh);
      ctx.lineTo(pb.x * vw, pb.y * vh);
      ctx.stroke();
    }

    ctx.shadowBlur = 16;
    for (const p of h.landmarks) {
      ctx.beginPath();
      ctx.fillStyle = "#ffffff";
      ctx.arc(p.x * vw, p.y * vh, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;

    // label near wrist
    const wrist = h.landmarks[0];
    const label = `${h.handedness}  ${h.gesture !== "none" ? h.gesture : ""}`;
    ctx.font = "bold 18px Inter, sans-serif";
    ctx.fillStyle = "rgba(0,0,0,0.65)";
    const tw = ctx.measureText(label).width + 12;
    ctx.fillRect(wrist.x * vw - 6, wrist.y * vh + 10, tw, 24);
    ctx.fillStyle = color;
    ctx.fillText(label, wrist.x * vw, wrist.y * vh + 28);
  }
}