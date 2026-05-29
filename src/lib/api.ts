import { EMOTIONS, type DetectResponse, type Emotion } from "./emotions";
import { detectFaces, loadFaceModels } from "./face-detector";

const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "");

export const apiMode: "remote" | "local" = API_URL ? "remote" : "local";

export { loadFaceModels };

function mockDetect(): DetectResponse {
  const scores = {} as Record<Emotion, number>;
  let sum = 0;
  for (const e of EMOTIONS) {
    scores[e] = Math.random();
    sum += scores[e];
  }
  for (const e of EMOTIONS) scores[e] = scores[e] / sum;
  // bias toward one emotion
  const dominant = EMOTIONS[Math.floor(Math.random() * EMOTIONS.length)];
  scores[dominant] = Math.max(scores[dominant], 0.55 + Math.random() * 0.4);
  // renormalize
  let total = 0;
  for (const e of EMOTIONS) total += scores[e];
  for (const e of EMOTIONS) scores[e] = scores[e] / total;
  const confidence = scores[dominant];
  return {
    faces: [
      {
        box: { x: 0.25, y: 0.2, width: 0.5, height: 0.6 },
        emotion: dominant,
        confidence,
        scores,
      },
    ],
  };
}

async function postBlob(path: string, blob: Blob): Promise<DetectResponse> {
  const fd = new FormData();
  fd.append("file", blob, "frame.jpg");
  const res = await fetch(`${API_URL}${path}`, { method: "POST", body: fd });
  if (!res.ok) throw new Error(`API ${path} failed: ${res.status}`);
  return (await res.json()) as DetectResponse;
}

export async function detectFromBlob(blob: Blob): Promise<DetectResponse> {
  if (apiMode === "remote") return postBlob("/api/detect", blob);
  // Local: load blob into an Image then run face-api
  const url = URL.createObjectURL(blob);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });
    return detectFaces(img);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function detectFromElement(
  el: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement,
): Promise<DetectResponse> {
  if (apiMode === "remote") {
    // Snapshot to canvas, then send as blob
    const canvas = document.createElement("canvas");
    if (el instanceof HTMLVideoElement) {
      canvas.width = el.videoWidth;
      canvas.height = el.videoHeight;
    } else if (el instanceof HTMLImageElement) {
      canvas.width = el.naturalWidth;
      canvas.height = el.naturalHeight;
    } else {
      canvas.width = el.width;
      canvas.height = el.height;
    }
    canvas.getContext("2d")?.drawImage(el, 0, 0, canvas.width, canvas.height);
    const blob: Blob = await new Promise((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/jpeg", 0.7),
    );
    return postBlob("/api/detect", blob);
  }
  return detectFaces(el);
}

// kept for backward compat in any unedited callers
export const detectFromCanvas = detectFromElement;

// keep mockDetect referenced so it's tree-shakable when unused without warnings
void mockDetect;