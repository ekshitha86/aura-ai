import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Brain, Camera, History as HistoryIcon, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { AIFace } from "@/components/AIFace";
import { ParticleField } from "@/components/ParticleField";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "EmotionSense AI — Real-time Emotion Intelligence" },
      {
        name: "description",
        content: "A futuristic AI dashboard for live webcam and image emotion detection with timeline, history, and analytics.",
      },
      { property: "og:title", content: "EmotionSense AI" },
      { property: "og:description", content: "Real-time emotion intelligence dashboard." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (user) {
      // Auto-prefill — they can click Enter Dashboard right away
      setName(user.name);
      setEmail(user.email);
    }
  }, [user]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    login(name || "guest", email);
    navigate({ to: "/live" });
  };

  return (
    <div className="relative min-h-screen overflow-hidden grid-bg">
      <ParticleField count={40} />

      {/* Top nav */}
      <header className="relative z-10 flex items-center justify-between px-6 py-5 md:px-12">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg neon-border grid place-items-center glow-blue">
            <Sparkles className="h-4 w-4 text-neon-cyan" />
          </div>
          <span className="font-display tracking-widest text-sm text-neon">EMOTIONSENSE AI</span>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 px-6 md:px-12 pt-8 pb-24 grid lg:grid-cols-2 gap-12 items-center max-w-7xl mx-auto">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full glass px-3 py-1 text-xs uppercase tracking-[0.25em] text-neon-cyan">
            <span className="h-1.5 w-1.5 rounded-full bg-neon-cyan animate-pulse" />
            Neural emotion engine online
          </div>
          <h1 className="font-display mt-6 text-5xl md:text-7xl font-black leading-[0.95]">
            <span className="text-neon">Read</span> the room.
            <br />
            In <span className="text-neon">real time.</span>
          </h1>
          <p className="mt-6 max-w-lg text-muted-foreground text-lg leading-relaxed"></p>

          <div className="mt-8 flex flex-wrap gap-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">
            <span className="rounded-full glass px-3 py-1.5">Webcam</span>
            <span className="rounded-full glass px-3 py-1.5">Image upload</span>
            <span className="rounded-full glass px-3 py-1.5">Timeline</span>
            <span className="rounded-full glass px-3 py-1.5">Analytics</span>
            <span className="rounded-full glass px-3 py-1.5">Video upload</span>
          </div>
        </div>

        <div className="relative">
          <AIFace />
        </div>
      </section>

      {/* Feature cards */}
      <section className="relative z-10 px-6 md:px-12 max-w-7xl mx-auto grid md:grid-cols-3 gap-4 pb-24">
        {[
          { icon: Camera, title: "Live monitor", desc: "Stream your camera and watch emotions update each second with bounding boxes and confidence bars." },
          { icon: Brain, title: "AI insights", desc: "Per-emotion confidence, dominant mood, and trends — auto-logged as your sessions unfold." },
          { icon: HistoryIcon, title: "Always remembered", desc: "Sign in with any email and your full history comes back. No password, no friction." },
        ].map((f) => {
          const Icon = f.icon;
          return (
            <div key={f.title} className="rounded-2xl glass p-6 hover:glow-purple transition-shadow">
              <div className="h-10 w-10 rounded-lg bg-primary/15 grid place-items-center mb-4">
                <Icon className="h-5 w-5 text-neon-cyan" />
              </div>
              <h3 className="font-display text-lg">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          );
        })}
      </section>

      {/* Login */}
      <section id="enter" className="relative z-10 px-6 md:px-12 pb-24 max-w-md mx-auto">
        <div className="rounded-2xl neon-border p-8 glow-blue">
          <h2 className="font-display text-2xl mb-1">Enter the system</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Any username and email. Use the same email later to recover your history.
          </p>
          <form onSubmit={submit} className="space-y-3">
            <label className="block">
              <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Username</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="neo"
                className="mt-1 w-full rounded-lg bg-input/60 border border-border px-4 py-2.5 outline-none focus:border-neon-cyan focus:glow-blue transition"
              />
            </label>
            <label className="block">
              <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Email</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@anywhere.io"
                className="mt-1 w-full rounded-lg bg-input/60 border border-border px-4 py-2.5 outline-none focus:border-neon-cyan focus:glow-blue transition"
              />
            </label>
            <button
              type="submit"
              className="mt-2 w-full rounded-lg bg-gradient-to-r from-neon-blue to-neon-purple px-4 py-3 font-medium text-primary-foreground hover:opacity-90 transition flex items-center justify-center gap-2 glow-purple"
            >
              Enter dashboard <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        </div>
      </section>

      <footer className="relative z-10 border-t border-border/40 py-6 text-center text-xs text-muted-foreground">
        EmotionSense AI · v1.0 · Built for futuristic intelligence
      </footer>
    </div>
  );
}
