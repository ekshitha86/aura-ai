import type { DetectResponse, Emotion } from "./emotions";

type FaceApi = typeof import("face-api.js");

const MODEL_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.13/model";

let apiPromise: Promise<FaceApi> | null = null;
let loadPromise: Promise<FaceApi> | null = null;

async function getFaceApi(): Promise<FaceApi> {
  if (typeof window === "undefined") {
    throw new Error("face-api.js can only run in the browser");
  }
  if (!apiPromise) apiPromise = import("face-api.js");
  return apiPromise;
}

export function loadFaceModels(): Promise<FaceApi> {
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    const faceapi = await getFaceApi();
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
    ]);
    return faceapi;
  })();
  return loadPromise;
}

// face-api expression keys -> our emotion keys
const EXPR_MAP: Record<string, Emotion> = {
  happy: "happy",
  sad: "sad",
  angry: "angry",
  fearful: "fear",
  surprised: "surprise",
  neutral: "neutral",
  disgusted: "disgust",
};

type Source = HTMLVideoElement | HTMLImageElement | HTMLCanvasElement;

export async function detectFaces(source: Source): Promise<DetectResponse> {
  const faceapi = await loadFaceModels();

  // Source dimensions for normalizing the bounding box
  let w = 0;
  let h = 0;
  if (source instanceof HTMLVideoElement) {
    w = source.videoWidth;
    h = source.videoHeight;
  } else if (source instanceof HTMLImageElement) {
    w = source.naturalWidth || source.width;
    h = source.naturalHeight || source.height;
  } else {
    w = source.width;
    h = source.height;
  }
  if (!w || !h) return { faces: [] };

  const options = new faceapi.TinyFaceDetectorOptions({
    inputSize: 416,
    scoreThreshold: 0.3,
  });

  const results = await faceapi.detectAllFaces(source, options).withFaceExpressions();

  const faces = results.map((r) => {
    const box = r.detection.box;
    const scores = {
      happy: 0, sad: 0, angry: 0, fear: 0, surprise: 0, neutral: 0, disgust: 0,
    } as Record<Emotion, number>;
    for (const [k, v] of Object.entries(r.expressions as unknown as Record<string, number>)) {
      const mapped = EXPR_MAP[k];
      if (mapped) scores[mapped] = v;
    }
    // face-api's FER+ model is heavily biased toward "neutral" and underweights
    // anger/fear/disgust. Apply a calibration boost + neutral suppression so
    // those subtle expressions can actually win.
    const BOOST: Record<Emotion, number> = {
      happy: 1.0,
      sad: 1.4,
      angry: 2.2,
      fear: 2.4,
      surprise: 1.3,
      neutral: 0.55,
      disgust: 2.0,
    };
    let total = 0;
    (Object.keys(scores) as Emotion[]).forEach((e) => {
      scores[e] = scores[e] * BOOST[e];
      total += scores[e];
    });
    if (total > 0) {
      (Object.keys(scores) as Emotion[]).forEach((e) => (scores[e] = scores[e] / total));
    }
    let dominant: Emotion = "neutral";
    let max = -1;
    (Object.keys(scores) as Emotion[]).forEach((e) => {
      if (scores[e] > max) {
        max = scores[e];
        dominant = e;
      }
    });
    return {
      box: {
        x: Math.max(0, box.x) / w,
        y: Math.max(0, box.y) / h,
        width: Math.min(w - box.x, box.width) / w,
        height: Math.min(h - box.y, box.height) / h,
      },
      emotion: dominant,
      confidence: max,
      scores,
    };
  });

  return { faces };
}