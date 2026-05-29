import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { Activity, BarChart3, Brain, Gamepad2, Hand, History, Image as ImageIcon, Languages, LogOut, Sparkles, Video } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { apiMode } from "@/lib/api";

const NAV = [
  { to: "/live", label: "Live Monitor", icon: Activity },
  { to: "/upload", label: "Image Analysis", icon: ImageIcon },
  { to: "/video", label: "Video Analysis", icon: Video },
  { to: "/gestures", label: "Gestures ", icon: Hand },
  { to: "/sign", label: "Sign Translator", icon: Languages },
  { to: "/insights", label: "Insights", icon: Brain },
  { to: "/history", label: "History", icon: History },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
] as const;

export function Sidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col gap-6 border-r border-border/60 bg-sidebar/60 backdrop-blur-xl p-5">
      <Link to="/" className="flex items-center gap-2">
        <div className="h-9 w-9 rounded-lg neon-border grid place-items-center glow-blue">
          <Sparkles className="h-4 w-4 text-neon-cyan" />
        </div>
        <div>
          <div className="font-display text-sm tracking-widest text-neon">EMOTIONSENSE</div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">AI · v1.0</div>
        </div>
      </Link>

      <nav className="flex-1 flex flex-col gap-1">
        {NAV.map((item) => {
          const active = pathname === item.to;
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all ${
                active
                  ? "bg-primary/15 text-foreground glow-blue"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              }`}
            >
              <Icon className={`h-4 w-4 ${active ? "text-neon-cyan" : ""}`} />
              <span>{item.label}</span>
              {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-neon-cyan animate-pulse" />}
            </Link>
          );
        })}
      </nav>

      <div className="rounded-lg glass p-3 text-xs">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${apiMode === "remote" ? "bg-emerald-400" : "bg-neon-cyan"} animate-pulse`} />
          <span className="font-medium uppercase tracking-wider">
            {apiMode === "remote" ? "FastAPI" : ""}
          </span>
        </div>
        <p className="mt-1 text-muted-foreground leading-relaxed">
          {apiMode === "remote"
            ? "Streaming to your FastAPI backend."
            : "HELLO."}
        </p>
      </div>

      <div className="rounded-lg glass p-3">
        <div className="text-xs text-muted-foreground">Signed in as</div>
        <div className="truncate font-medium">{user?.name}</div>
        <div className="truncate text-xs text-muted-foreground">{user?.email}</div>
        <button
          onClick={() => {
            logout();
            navigate({ to: "/" });
          }}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-md border border-border/60 px-3 py-1.5 text-xs hover:bg-white/5"
        >
          <LogOut className="h-3 w-3" /> Sign out
        </button>
      </div>
    </aside>
  );
}