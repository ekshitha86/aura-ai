import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, CircleStop } from "lucide-react";
import { toast } from "sonner";
import {
  drawHandOverlay,
  loadHandModels,
  recognizeHands,
  type HandFrame,
} from "@/lib/hand-detector";

interface Props {
  onFrame?: (frame: HandFrame, video: HTMLVideoElement) => void;
  fps?: number;
}

export function HandCamera({ onFrame, fps = 20 }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const overlayRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [ready, setReady] = useState(false);
  const cbRef = useRef(onFrame);
  cbRef.current = onFrame;

  useEffect(() => {
    loadHandModels()
      .then(() => setReady(true))
      .catch((err) => {
        console.error(err);
        toast.error("Could not load hand detection model.");
      });
  }, []);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStreaming(false);
  }, []);

  const start = useCallback(async () => {
    try {
      stop();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setStreaming(true);
    } catch (err) {
      console.error(err);
      toast.error("Could not access camera. Check permissions.");
    }
  }, [stop]);

  useEffect(() => () => stop(), [stop]);

  useEffect(() => {
    if (!streaming || !ready) return;
    let cancelled = false;
    let busy = false;
    const interval = setInterval(async () => {
      if (cancelled || busy) return;
      const v = videoRef.current;
      const c = overlayRef.current;
      if (!v || !c || v.videoWidth === 0) return;
      busy = true;
      try {
        const frame = await recognizeHands(v, performance.now());
        if (cancelled) return;
        drawHandOverlay(c, v.videoWidth, v.videoHeight, frame);
        cbRef.current?.(frame, v);
      } catch (err) {
        console.error(err);
      } finally {
        busy = false;
      }
    }, 1000 / fps);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [streaming, ready, fps]);

  return (
    <div className="rounded-2xl neon-border p-3 relative overflow-hidden">
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
              <p>
                Click <span className="text-foreground font-medium">Start camera</span> to begin.
              </p>
            </div>
          </div>
        )}
        <div className="absolute top-3 right-3 flex gap-2">
          {!ready && (
            <span className="rounded-lg glass px-3 py-1.5 text-xs flex items-center gap-2 text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-neon-cyan animate-pulse" />
              Loading hand model…
            </span>
          )}
          {streaming ? (
            <button
              onClick={stop}
              className="rounded-lg border border-destructive/50 bg-background/60 px-3 py-1.5 text-xs flex items-center gap-2 hover:bg-destructive/10"
            >
              <CircleStop className="h-3.5 w-3.5" /> Stop
            </button>
          ) : (
            <button
              onClick={start}
              disabled={!ready}
              className="rounded-lg bg-gradient-to-r from-neon-blue to-neon-purple px-3 py-1.5 text-xs font-medium text-primary-foreground flex items-center gap-2 glow-blue disabled:opacity-50"
            >
              <Camera className="h-3.5 w-3.5" /> Start camera
            </button>
          )}
        </div>
      </div>
    </div>
  );
}