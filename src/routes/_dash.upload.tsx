import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Upload, ImagePlus } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { useHistory } from "@/lib/history";
import { detectFromBlob } from "@/lib/api";
import { EMOTION_META, type DetectedFace } from "@/lib/emotions";

export const Route = createFileRoute("/_dash/upload")({
  head: () => ({ meta: [{ title: "Image Analysis · EmotionSense AI" }] }),
  component: UploadPage,
});

function UploadPage() {
  const { user } = useAuth();
  const { add } = useHistory(user?.email ?? "");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [faces, setFaces] = useState<DetectedFace[]>([]);
  const [loading, setLoading] = useState(false);
  const [dims, setDims] = useState({ w: 0, h: 0 });
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleFile = async (file: File) => {
    setLoading(true);
    setFaces([]);
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    const img = new Image();
    img.onload = () => setDims({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = url;
    try {
      const { faces: detected } = await detectFromBlob(file);
      setFaces(detected);
      // log dominant
      const top = detected[0];
      if (top) {
        const reader = new FileReader();
        reader.onload = () => {
          add({
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            timestamp: Date.now(),
            emotion: top.emotion,
            confidence: top.confidence,
            imageDataUrl: typeof reader.result === "string" ? reader.result : undefined,
            source: "user_upload",
          });
        };
        reader.readAsDataURL(file);
      }
      toast.success(`${detected.length} face${detected.length === 1 ? "" : "s"} analyzed`);
    } catch (err) {
      console.error(err);
      toast.error("Detection failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <div className="text-xs uppercase tracking-[0.25em] text-neon-cyan">Image analysis</div>
        <h1 className="font-display text-3xl md:text-4xl">Upload and decode</h1>
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
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
            <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black">
              {imageUrl ? (
                <>
                  <img src={imageUrl} alt="uploaded" className="absolute inset-0 h-full w-full object-contain" />
                  <ImageOverlay faces={faces} dims={dims} />
                </>
              ) : (
                <div className="absolute inset-0 grid place-items-center text-center text-muted-foreground p-6">
                  <div>
                    <ImagePlus className="mx-auto h-10 w-10 mb-3" />
                    <p>Drop an image here or click to browse</p>
                    <p className="mt-1 text-xs">JPG, PNG · up to 10 MB</p>
                  </div>
                </div>
              )}
              {loading && (
                <div className="absolute inset-0 grid place-items-center bg-background/60 backdrop-blur-sm">
                  <div className="font-display text-neon-cyan animate-pulse">Analyzing…</div>
                </div>
              )}
            </div>
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="rounded-lg bg-gradient-to-r from-neon-blue to-neon-purple px-4 py-2 text-sm font-medium text-primary-foreground flex items-center gap-2 glow-blue"
              >
                <Upload className="h-4 w-4" /> Choose image
              </button>
            </div>
          </label>
        </div>

        <div className="space-y-3">
          <div className="rounded-2xl glass p-5">
            <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground mb-3">
              Detected faces ({faces.length})
            </div>
            {faces.length === 0 && (
              <div className="text-sm text-muted-foreground">No analysis yet.</div>
            )}
            <div className="space-y-3">
              {faces.map((f, i) => {
                const m = EMOTION_META[f.emotion];
                return (
                  <div key={i} className="rounded-xl border border-border/60 p-3">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">Face {i + 1}</div>
                      <div className="text-xl">{m.emoji}</div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {m.label} · <span className="text-neon">{Math.round(f.confidence * 100)}%</span>
                    </div>
                    <div className="mt-2 h-1.5 rounded-full bg-white/5 overflow-hidden">
                      <div className="h-full" style={{ width: `${f.confidence * 100}%`, background: m.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ImageOverlay({ faces, dims }: { faces: DetectedFace[]; dims: { w: number; h: number } }) {
  if (faces.length === 0 || dims.w === 0) return null;
  return (
    <svg
      viewBox={`0 0 ${dims.w} ${dims.h}`}
      preserveAspectRatio="xMidYMid meet"
      className="absolute inset-0 h-full w-full pointer-events-none"
    >
      {faces.map((f, i) => {
        const color = EMOTION_META[f.emotion].color;
        const x = f.box.x * dims.w;
        const y = f.box.y * dims.h;
        const w = f.box.width * dims.w;
        const h = f.box.height * dims.h;
        return (
          <g key={i}>
            <rect
              x={x}
              y={y}
              width={w}
              height={h}
              fill="none"
              stroke={color}
              strokeWidth={Math.max(2, dims.w / 400)}
              style={{ filter: `drop-shadow(0 0 8px ${color})` }}
            />
            <rect x={x} y={y - 32} width={Math.max(w, 160)} height={28} fill="rgba(0,0,0,0.7)" />
            <text x={x + 8} y={y - 12} fill={color} fontSize={20} fontWeight="bold" fontFamily="Inter,sans-serif">
              {EMOTION_META[f.emotion].label} {Math.round(f.confidence * 100)}%
            </text>
          </g>
        );
      })}
    </svg>
  );
}