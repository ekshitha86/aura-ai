import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, CircleStop, RefreshCcw } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { useHistory } from "@/lib/history";
import { detectFromElement, loadFaceModels } from "@/lib/api";
import { EMOTIONS, EMOTION_META, type DetectedFace, type Emotion } from "@/lib/emotions";

export const Route = createFileRoute("/_dash/live")({
  head: () => ({ meta: [{ title: "Live Monitor · EmotionSense AI" }] }),
  component: LivePage,
});

function LivePage() {
  const { user } = useAuth();
  const { add } = useHistory(user?.email ?? "");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayRef = useRef<HTMLCanvasElement | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [face, setFace] = useState<DetectedFace | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState<string | undefined>();
  const streamRef = useRef<MediaStream | null>(null);
  const lastEmotionRef = useRef<Emotion | null>(null);
  const [history, setLocalHistory] = useState<{ t: number; e: Emotion; c: number }[]>([]);
  const [modelReady, setModelReady] = useState(false);

  useEffect(() => {
    loadFaceModels()
      .then(() => setModelReady(true))
      .catch((err) => {
        console.error("Model load failed:", err);
        toast.error("Could not load face detection models.");
      });
  }, []);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStreaming(false);
  }, []);

  const start = useCallback(
    async (id?: string) => {
      try {
        stop();
        const stream = await navigator.mediaDevices.getUserMedia({
          video: id ? { deviceId: { exact: id } } : { facingMode: "user" },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setStreaming(true);
        const all = await navigator.mediaDevices.enumerateDevices();
        setDevices(all.filter((d) => d.kind === "videoinput"));
      } catch (err) {
        console.error(err);
        toast.error("Could not access camera. Check permissions.");
      }
    },
    [stop],
  );

  useEffect(() => () => stop(), [stop]);

  // Detection loop — every 1s
  useEffect(() => {
    if (!streaming) return;
    let cancelled = false;
    let busy = false;
    const interval = setInterval(async () => {
      if (cancelled || busy || !videoRef.current) return;
      const v = videoRef.current;
      if (v.videoWidth === 0 || v.readyState < 2) return;
      busy = true;
      try {
        const { faces } = await detectFromElement(v);
        if (cancelled) return;
        const top = faces[0] ?? null;
        setFace(top);
        drawOverlay(top, v.videoWidth, v.videoHeight, overlayRef.current);
        if (top) {
          setLocalHistory((prev) => [{ t: Date.now(), e: top.emotion, c: top.confidence }, ...prev].slice(0, 60));
          if (top.emotion !== lastEmotionRef.current) {
            lastEmotionRef.current = top.emotion;
            // Snapshot
            const snap = document.createElement("canvas");
            snap.width = 160;
            snap.height = (160 * v.videoHeight) / v.videoWidth;
            snap.getContext("2d")?.drawImage(v, 0, 0, snap.width, snap.height);
            add({
              id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              timestamp: Date.now(),
              emotion: top.emotion,
              confidence: top.confidence,
              imageDataUrl: snap.toDataURL("image/jpeg", 0.6),
              source: "live_camera",
            });
          }
        } else {
          drawOverlay(null, v.videoWidth, v.videoHeight, overlayRef.current);
        }
      } catch (err) {
        console.error(err);
      } finally {
        busy = false;
      }
    }, 1000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [streaming, add]);

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="text-xs uppercase tracking-[0.25em] text-neon-cyan">Live monitor</div>
          <h1 className="font-display text-3xl md:text-4xl">Realtime emotion stream</h1>
        </div>
        <div className="flex gap-2">
          {!modelReady && (
            <span className="rounded-lg glass px-3 py-2 text-xs flex items-center gap-2 text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-neon-cyan animate-pulse" />
              Loading AI model…
            </span>
          )}
          {devices.length > 1 && (
            <select
              value={deviceId}
              onChange={(e) => {
                setDeviceId(e.target.value);
                if (streaming) start(e.target.value);
              }}
              className="rounded-lg bg-input/60 border border-border px-3 py-2 text-sm"
            >
              {devices.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || `Camera ${d.deviceId.slice(0, 6)}`}
                </option>
              ))}
            </select>
          )}
          {streaming ? (
            <button
              onClick={stop}
              className="rounded-lg border border-destructive/50 px-4 py-2 text-sm flex items-center gap-2 hover:bg-destructive/10"
            >
              <CircleStop className="h-4 w-4" /> Stop
            </button>
          ) : (
            <button
              onClick={() => start(deviceId)}
              className="rounded-lg bg-gradient-to-r from-neon-blue to-neon-purple px-4 py-2 text-sm font-medium text-primary-foreground flex items-center gap-2 glow-blue"
            >
              <Camera className="h-4 w-4" /> Start camera
            </button>
          )}
          {streaming && (
            <button
              onClick={() => start(deviceId)}
              className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-white/5"
              title="Restart stream"
            >
              <RefreshCcw className="h-4 w-4" />
            </button>
          )}
        </div>
      </header>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-2xl neon-border p-3 relative overflow-hidden">
          <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black">
            <video
              ref={videoRef}
              playsInline
              muted
              className="h-full w-full object-cover -scale-x-100"
            />
            <canvas
              ref={overlayRef}
              className="absolute inset-0 h-full w-full pointer-events-none -scale-x-100"
            />
            {!streaming && (
              <div className="absolute inset-0 grid place-items-center text-center text-muted-foreground">
                <div>
                  <Camera className="mx-auto h-10 w-10 mb-3" />
                  <p>Click <span className="text-foreground font-medium">Start camera</span> to begin streaming.</p>
                </div>
              </div>
            )}
            <canvas ref={canvasRef} className="hidden" />
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl glass p-6 text-center">
            <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Current emotion</div>
            {face ? (
              <>
                <div className="text-7xl mt-3">{EMOTION_META[face.emotion].emoji}</div>
                <div className="font-display text-2xl mt-1">{EMOTION_META[face.emotion].label}</div>
                <div className="mt-3">
                  <div className="text-xs text-muted-foreground">Confidence</div>
                  <div className="text-3xl font-display text-neon">{Math.round(face.confidence * 100)}%</div>
                </div>
              </>
            ) : (
              <div className="py-10 text-muted-foreground text-sm">Awaiting face…</div>
            )}
          </div>

          <div className="rounded-2xl glass p-5">
            <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground mb-3">All emotions</div>
            <div className="space-y-2">
              {EMOTIONS.map((e) => {
                const score = face?.scores[e] ?? 0;
                const m = EMOTION_META[e];
                return (
                  <div key={e}>
                    <div className="flex justify-between text-xs mb-1">
                      <span>{m.emoji} {m.label}</span>
                      <span className="text-muted-foreground">{Math.round(score * 100)}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className="h-full transition-all duration-500"
                        style={{ width: `${score * 100}%`, background: m.color, boxShadow: `0 0 8px ${m.color}` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {history.length > 0 && (
        <div className="rounded-2xl glass p-5">
          <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground mb-3">Session timeline</div>
          <div className="flex gap-1 overflow-x-auto pb-2">
            {history.slice().reverse().map((h, i) => {
              const m = EMOTION_META[h.e];
              return (
                <div
                  key={i}
                  className="shrink-0 w-3 h-12 rounded-sm"
                  title={`${m.label} ${Math.round(h.c * 100)}%`}
                  style={{ background: m.color, opacity: 0.4 + h.c * 0.6 }}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function drawOverlay(
  face: DetectedFace | null,
  vw: number,
  vh: number,
  canvas: HTMLCanvasElement | null,
) {
  if (!canvas) return;
  canvas.width = vw;
  canvas.height = vh;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, vw, vh);
  if (!face) return;
  const { x, y, width, height } = face.box;
  const px = x * vw;
  const py = y * vh;
  const pw = width * vw;
  const ph = height * vh;
  const color = EMOTION_META[face.emotion].color;
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.shadowColor = color;
  ctx.shadowBlur = 16;
  ctx.strokeRect(px, py, pw, ph);
  ctx.shadowBlur = 0;
  // corner brackets
  const len = Math.min(pw, ph) * 0.18;
  ctx.lineWidth = 5;
  const corners: [number, number, number, number][] = [
    [px, py, len, 0], [px, py, 0, len],
    [px + pw, py, -len, 0], [px + pw, py, 0, len],
    [px, py + ph, len, 0], [px, py + ph, 0, -len],
    [px + pw, py + ph, -len, 0], [px + pw, py + ph, 0, -len],
  ];
  corners.forEach(([sx, sy, dx, dy]) => {
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + dx, sy + dy);
    ctx.stroke();
  });
  // label
  const label = `${EMOTION_META[face.emotion].label} ${Math.round(face.confidence * 100)}%`;
  ctx.font = "bold 20px Inter, sans-serif";
  const tw = ctx.measureText(label).width;
  ctx.fillStyle = "rgba(0,0,0,0.7)";
  ctx.fillRect(px, py - 32, tw + 16, 28);
  ctx.fillStyle = color;
  ctx.fillText(label, px + 8, py - 12);
}