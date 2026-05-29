import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Upload, Film, Play, Pause } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { useHistory } from "@/lib/history";
import { detectFromElement, loadFaceModels } from "@/lib/api";
import { EMOTION_META, EMOTIONS, type DetectedFace, type Emotion } from "@/lib/emotions";

export const Route = createFileRoute("/_dash/video")({
  head: () => ({ meta: [{ title: "Video Analysis · EmotionSense AI" }] }),
  component: VideoPage,
});

function VideoPage() {
  const { user } = useAuth();
  const { add } = useHistory(user?.email ?? "");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const overlayRef = useRef<HTMLCanvasElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const busyRef = useRef(false);
  const lastEmotionRef = useRef<Emotion | null>(null);
  const aggRef = useRef<Record<Emotion, number>>({
    happy: 0, sad: 0, angry: 0, fear: 0, surprise: 0, neutral: 0, disgust: 0,
  });
  const framesRef = useRef(0);

  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [faces, setFaces] = useState<DetectedFace[]>([]);
  const [modelReady, setModelReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [agg, setAgg] = useState<Record<Emotion, number>>(aggRef.current);

  useEffect(() => {
    loadFaceModels().then(() => setModelReady(true)).catch(() => toast.error("Failed to load AI model"));
  }, []);

  useEffect(() => () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (videoUrl) URL.revokeObjectURL(videoUrl);
  }, [videoUrl]);

  const handleFile = (file: File) => {
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    aggRef.current = { happy: 0, sad: 0, angry: 0, fear: 0, surprise: 0, neutral: 0, disgust: 0 };
    framesRef.current = 0;
    lastEmotionRef.current = null;
    setAgg({ ...aggRef.current });
    setFaces([]);
    setVideoUrl(URL.createObjectURL(file));
  };

  const drawOverlay = (detected: DetectedFace[]) => {
    const v = videoRef.current;
    const c = overlayRef.current;
    if (!v || !c) return;
    c.width = v.clientWidth;
    c.height = v.clientHeight;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
    for (const f of detected) {
      const color = EMOTION_META[f.emotion].color;
      const x = f.box.x * c.width;
      const y = f.box.y * c.height;
      const w = f.box.width * c.width;
      const h = f.box.height * c.height;
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.shadowColor = color;
      ctx.shadowBlur = 12;
      ctx.strokeRect(x, y, w, h);
      ctx.shadowBlur = 0;
      ctx.fillStyle = "rgba(0,0,0,0.75)";
      ctx.fillRect(x, y - 26, Math.max(w, 160), 24);
      ctx.fillStyle = color;
      ctx.font = "bold 16px Inter, sans-serif";
      ctx.fillText(
        `${EMOTION_META[f.emotion].label} ${Math.round(f.confidence * 100)}%`,
        x + 6,
        y - 8,
      );
    }
  };

  const loop = async () => {
    const v = videoRef.current;
    if (!v || v.paused || v.ended) {
      rafRef.current = null;
      return;
    }
    if (!busyRef.current && v.readyState >= 2) {
      busyRef.current = true;
      try {
        const { faces: detected } = await detectFromElement(v);
        setFaces(detected);
        drawOverlay(detected);
        const top = detected[0];
        if (top) {
          framesRef.current += 1;
          for (const e of EMOTIONS) aggRef.current[e] += top.scores[e] || 0;
          setAgg({ ...aggRef.current });
          if (top.emotion !== lastEmotionRef.current && top.confidence > 0.4) {
            lastEmotionRef.current = top.emotion;
            const canvas = document.createElement("canvas");
            canvas.width = v.videoWidth;
            canvas.height = v.videoHeight;
            canvas.getContext("2d")?.drawImage(v, 0, 0);
            add({
              id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              timestamp: Date.now(),
              emotion: top.emotion,
              confidence: top.confidence,
              imageDataUrl: canvas.toDataURL("image/jpeg", 0.6),
              source: "user_upload",
            });
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        busyRef.current = false;
      }
    }
    rafRef.current = requestAnimationFrame(loop);
  };

  const onPlay = () => {
    setPlaying(true);
    if (!rafRef.current) rafRef.current = requestAnimationFrame(loop);
  };
  const onPause = () => {
    setPlaying(false);
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  };

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play();
    else v.pause();
  };

  const dominant = (Object.keys(agg) as Emotion[]).reduce(
    (best, e) => (agg[e] > agg[best] ? e : best),
    "neutral" as Emotion,
  );
  const totalAgg = EMOTIONS.reduce((s, e) => s + agg[e], 0) || 1;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.25em] text-neon-cyan">Video analysis</div>
          <h1 className="font-display text-3xl md:text-4xl">Track emotions through time</h1>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className={`h-2 w-2 rounded-full ${modelReady ? "bg-emerald-400" : "bg-amber-400"} animate-pulse`} />
          <span className="uppercase tracking-wider">{modelReady ? "Model ready" : "Loading AI model…"}</span>
        </div>
      </header>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <label
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files?.[0];
              if (file) handleFile(file);
            }}
            className="block rounded-2xl neon-border p-3 cursor-pointer"
          >
            <input
              ref={inputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
            <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black">
              {videoUrl ? (
                <>
                  <video
                    ref={videoRef}
                    src={videoUrl}
                    className="absolute inset-0 h-full w-full object-contain"
                    onPlay={onPlay}
                    onPause={onPause}
                    onEnded={onPause}
                    controls
                    playsInline
                  />
                  <canvas ref={overlayRef} className="absolute inset-0 h-full w-full pointer-events-none" />
                </>
              ) : (
                <div className="absolute inset-0 grid place-items-center text-center text-muted-foreground p-6">
                  <div>
                    <Film className="mx-auto h-10 w-10 mb-3" />
                    <p>Drop a video here or click to browse</p>
                    <p className="mt-1 text-xs">MP4, WebM · plays in browser</p>
                  </div>
                </div>
              )}
            </div>
            <div className="mt-3 flex items-center justify-between gap-2">
              {videoUrl && (
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); togglePlay(); }}
                  className="rounded-lg border border-border/60 px-3 py-2 text-sm flex items-center gap-2 hover:bg-white/5"
                >
                  {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  {playing ? "Pause" : "Play"}
                </button>
              )}
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); inputRef.current?.click(); }}
                className="ml-auto rounded-lg bg-gradient-to-r from-neon-blue to-neon-purple px-4 py-2 text-sm font-medium text-primary-foreground flex items-center gap-2 glow-blue"
              >
                <Upload className="h-4 w-4" /> Choose video
              </button>
            </div>
          </label>
        </div>

        <div className="space-y-3">
          <div className="rounded-2xl glass p-5">
            <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground mb-3">
              Current frame ({faces.length} face{faces.length === 1 ? "" : "s"})
            </div>
            {faces.length === 0 && (
              <div className="text-sm text-muted-foreground">Play the video to start tracking.</div>
            )}
            {faces[0] && (
              <div className="rounded-xl border border-border/60 p-3">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{EMOTION_META[faces[0].emotion].label}</div>
                  <div className="text-2xl">{EMOTION_META[faces[0].emotion].emoji}</div>
                </div>
                <div className="text-sm text-neon">{Math.round(faces[0].confidence * 100)}%</div>
              </div>
            )}
          </div>

          <div className="rounded-2xl glass p-5">
            <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground mb-3">
              Aggregate · {framesRef.current} frames
            </div>
            {framesRef.current > 0 ? (
              <>
                <div className="mb-3 text-sm">
                  Dominant: <span className="text-neon font-medium">{EMOTION_META[dominant].label}</span>
                </div>
                <div className="space-y-2">
                  {EMOTIONS.map((e) => {
                    const pct = (agg[e] / totalAgg) * 100;
                    const m = EMOTION_META[e];
                    return (
                      <div key={e}>
                        <div className="flex justify-between text-xs">
                          <span>{m.emoji} {m.label}</span>
                          <span className="text-muted-foreground">{pct.toFixed(1)}%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                          <div className="h-full" style={{ width: `${pct}%`, background: m.color }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">No data yet.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}