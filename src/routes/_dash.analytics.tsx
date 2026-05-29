import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAuth } from "@/lib/auth";
import { useHistory } from "@/lib/history";
import { EMOTIONS, EMOTION_META, type Emotion } from "@/lib/emotions";

export const Route = createFileRoute("/_dash/analytics")({
  head: () => ({ meta: [{ title: "Analytics · EmotionSense AI" }] }),
  component: AnalyticsPage,
});

const POSITIVE: Emotion[] = ["happy", "surprise", "neutral"];

function AnalyticsPage() {
  const { user } = useAuth();
  const { entries } = useHistory(user?.email ?? "");

  const dist = useMemo(() => {
    const counts: Record<Emotion, number> = {
      happy: 0, sad: 0, angry: 0, fear: 0, surprise: 0, neutral: 0, disgust: 0,
    };
    entries.forEach((e) => counts[e.emotion]++);
    return EMOTIONS.map((e) => ({
      emotion: e,
      name: EMOTION_META[e].label,
      value: counts[e],
      color: EMOTION_META[e].color,
    })).filter((d) => d.value > 0);
  }, [entries]);

  const hourly = useMemo(() => {
    const buckets = Array.from({ length: 24 }, (_, h) => ({ hour: `${h}h`, count: 0 }));
    entries.forEach((e) => {
      const h = new Date(e.timestamp).getHours();
      buckets[h].count++;
    });
    return buckets;
  }, [entries]);

  const moodScore = useMemo(() => {
    if (entries.length === 0) return 0;
    const pos = entries.filter((e) => POSITIVE.includes(e.emotion)).length;
    return Math.round((pos / entries.length) * 100);
  }, [entries]);

  const dominant = dist.slice().sort((a, b) => b.value - a.value)[0];

  const insights = useMemo(() => {
    if (entries.length === 0) return [];
    const out: string[] = [];
    out.push(`You logged ${entries.length} emotion event${entries.length === 1 ? "" : "s"}.`);
    if (dominant) out.push(`Your most frequent emotion is ${EMOTION_META[dominant.emotion as Emotion].label}.`);
    out.push(`Positive mood score: ${moodScore}%.`);
    const last24 = entries.filter((e) => Date.now() - e.timestamp < 86_400_000);
    if (last24.length > 0) out.push(`${last24.length} captures in the last 24 hours.`);
    return out;
  }, [entries, dominant, moodScore]);

  return (
    <div className="space-y-6">
      <header>
        <div className="text-xs uppercase tracking-[0.25em] text-neon-cyan">Analytics</div>
        <h1 className="font-display text-3xl md:text-4xl">Emotion intelligence</h1>
      </header>

      <div className="grid md:grid-cols-3 gap-4">
        <StatCard label="Total captures" value={entries.length.toString()} />
        <StatCard label="Mood score" value={`${moodScore}%`} accent />
        <StatCard
          label="Dominant emotion"
          value={dominant ? `${EMOTION_META[dominant.emotion as Emotion].emoji} ${EMOTION_META[dominant.emotion as Emotion].label}` : "—"}
        />
      </div>

      {entries.length === 0 ? (
        <div className="rounded-2xl glass p-12 text-center text-muted-foreground">
          No data yet. Run the live monitor or upload an image to populate analytics.
        </div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="rounded-2xl glass p-6">
            <h3 className="font-display text-lg mb-4">Emotion distribution</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={dist} dataKey="value" nameKey="name" innerRadius={50} outerRadius={100} paddingAngle={3}>
                    {dist.map((d) => (
                      <Cell key={d.emotion} fill={d.color} stroke="oklch(0.16 0.04 270)" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: "oklch(0.22 0.05 275)", border: "1px solid oklch(0.55 0.15 280 / 40%)", borderRadius: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {dist.map((d) => (
                <span key={d.emotion} className="text-xs flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ background: d.color }} />
                  {d.name} · {d.value}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-2xl glass p-6">
            <h3 className="font-display text-lg mb-4">Captures by hour</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourly}>
                  <XAxis dataKey="hour" tick={{ fill: "oklch(0.72 0.04 260)", fontSize: 11 }} axisLine={false} tickLine={false} interval={2} />
                  <YAxis tick={{ fill: "oklch(0.72 0.04 260)", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    cursor={{ fill: "oklch(1 0 0 / 5%)" }}
                    contentStyle={{ background: "oklch(0.22 0.05 275)", border: "1px solid oklch(0.55 0.15 280 / 40%)", borderRadius: 12 }}
                  />
                  <Bar dataKey="count" fill="oklch(0.72 0.22 260)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="lg:col-span-2 rounded-2xl glass p-6">
            <h3 className="font-display text-lg mb-4">AI insights</h3>
            <ul className="space-y-2">
              {insights.map((s, i) => (
                <li key={i} className="flex items-start gap-3 text-sm">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-neon-cyan shrink-0" />
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl p-6 ${accent ? "neon-border glow-blue" : "glass"}`}>
      <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground">{label}</div>
      <div className={`mt-2 font-display text-3xl ${accent ? "text-neon" : ""}`}>{value}</div>
    </div>
  );
}