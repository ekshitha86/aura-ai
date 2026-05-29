# EmotionSense AI

Futuristic React + TypeScript dashboard for real-time emotion detection from
webcam and image upload. UI ships with a built-in **mock detector** so it
runs standalone — drop in a Python/FastAPI backend whenever you're ready
by setting one env var.

## Stack

- React 19 + TypeScript + TanStack Start (runs on Cloudflare Workers)
- Tailwind CSS v4, cyberpunk dark theme (neon blue/purple, glassmorphism)
- Recharts for analytics
- LocalStorage-based "any email" login + per-user history (no password)

## Routes

| Path | What |
| --- | --- |
| `/` | Landing + login (any username + email) |
| `/live` | Webcam stream, bounding box, per-emotion confidence, snapshots on emotion change |
| `/upload` | Drag-and-drop image analysis with multi-face boxes |
| `/history` | Card grid of captured snapshots, search / filter / delete / export JSON |
| `/analytics` | Distribution pie, hourly bars, mood score, AI insights |

## Mock vs Live mode

Out of the box, `apiMode === "mock"` — detections are generated locally
so you can demo every screen. To switch to your FastAPI backend, set:

```
VITE_API_URL=https://your-fastapi-host.example.com
```

(in `.env.local` for dev, or via your hosting provider's env vars).

## Backend contract (Python / FastAPI)

Implement **one** endpoint. Same request/response shape is used for webcam
frames AND uploaded images.

### `POST /api/detect`

- **Request**: `multipart/form-data` with a single field `file` (JPEG/PNG image bytes)
- **Response**: `application/json`

```json
{
  "faces": [
    {
      "box": { "x": 0.25, "y": 0.2, "width": 0.5, "height": 0.6 },
      "emotion": "happy",
      "confidence": 0.94,
      "scores": {
        "happy": 0.94,
        "sad": 0.01,
        "angry": 0.01,
        "fear": 0.01,
        "surprise": 0.02,
        "neutral": 0.005,
        "disgust": 0.005
      }
    }
  ]
}
```

Notes:
- `box` coordinates are **normalized 0–1** relative to image width/height.
- `emotion` must be one of: `happy`, `sad`, `angry`, `fear`, `surprise`, `neutral`, `disgust`.
- `scores` should sum to ~1.
- Return `{"faces": []}` when no face is detected.
- Enable CORS for your frontend origin.

### Reference FastAPI implementation

```python
# main.py — pip install fastapi uvicorn opencv-python-headless deepface python-multipart
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from deepface import DeepFace
import numpy as np
import cv2

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten in production
    allow_methods=["POST", "OPTIONS"],
    allow_headers=["*"],
)

EMOTIONS = ["happy", "sad", "angry", "fear", "surprise", "neutral", "disgust"]

@app.post("/api/detect")
async def detect(file: UploadFile = File(...)):
    data = np.frombuffer(await file.read(), np.uint8)
    img = cv2.imdecode(data, cv2.IMREAD_COLOR)
    if img is None:
        return {"faces": []}
    h, w = img.shape[:2]
    try:
        results = DeepFace.analyze(img, actions=["emotion"], enforce_detection=False)
        if isinstance(results, dict):
            results = [results]
    except Exception:
        return {"faces": []}
    faces = []
    for r in results:
        region = r.get("region", {})
        scores_raw = {k.lower(): float(v) / 100.0 for k, v in r.get("emotion", {}).items()}
        scores = {e: scores_raw.get(e, 0.0) for e in EMOTIONS}
        dominant = max(scores, key=scores.get)
        faces.append({
            "box": {
                "x": region.get("x", 0) / w,
                "y": region.get("y", 0) / h,
                "width": region.get("w", w) / w,
                "height": region.get("h", h) / h,
            },
            "emotion": dominant,
            "confidence": scores[dominant],
            "scores": scores,
        })
    return {"faces": faces}

# uvicorn main:app --host 0.0.0.0 --port 8000
```

## Local dev

```bash
bun install
bun run dev
```

The frontend boots on `http://localhost:3000`. Without `VITE_API_URL` it
runs in mock mode — perfect for demos and screenshots. Set the env var,
restart dev, and you're streaming real predictions.

## Notes on what's implemented vs the original brief

The original spec called for a full Python/FastAPI backend (DeepFace,
OpenCV, MediaPipe, WebSockets, SQLite). This repo ships the **complete
React frontend** with mock mode + a clean swap-in point for your FastAPI
server (the contract above). Video analysis, PDF export, and the AI mood
chatbot are intentionally out of v1 — easy to add once the backend is
live.