/* Small inline cues used on cards: a sparkline, a change arrow and the age of the data.
 * Each carries a text label, so none relies on colour or shape alone. */
import { longDate, monthYear } from "../lib/format";

export function Spark({ values, w = 96, h = 26, label }: { values?: (number | null)[]; w?: number; h?: number; label?: string }) {
  const v = (values || []).filter((x): x is number => x != null && isFinite(x));
  if (v.length < 3) return null;
  const lo = Math.min(...v), hi = Math.max(...v);
  const X = (i: number) => 2 + (i / (v.length - 1)) * (w - 4);
  const Y = (y: number) => h - 3 - ((y - lo) / (hi - lo || 1)) * (h - 6);
  const d = v.map((y, i) => `${i ? "L" : "M"}${X(i).toFixed(1)},${Y(y).toFixed(1)}`).join("");
  return (
    <svg className="spark" width={w} height={h} viewBox={`0 0 ${w} ${h}`} role="img" aria-label={label || `Recent values, from ${v[0]} to ${v[v.length - 1]}`}>
      <path d={d} fill="none" stroke="var(--act)" strokeWidth={1.6} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={X(v.length - 1)} cy={Y(v[v.length - 1])} r={2.4} fill="var(--act)" />
    </svg>
  );
}

export function Trend({ t, freq }: { t?: { pct: number; dir: string; from: string } | null; freq?: string }) {
  if (!t) return null;
  const arrow = t.dir === "up" ? "↑" : t.dir === "down" ? "↓" : "→";
  const word = t.dir === "flat" ? "little change" : `${t.dir} ${Math.abs(t.pct).toFixed(Math.abs(t.pct) < 10 ? 1 : 0)}%`;
  const since = freq === "weekly" || freq === "daily" ? longDate(t.from) : monthYear(t.from);
  return <span className={`trend ${t.dir}`} title={`Change since ${since}`}>{arrow} {word} <span className="muted">since {since}</span></span>;
}

const EXPECT: Record<string, number> = { weekly: 21, daily: 7, "business days": 10, monthly: 120, quarterly: 280, annual: 900, continuous: 2 };

export function Age({ t, freq }: { t?: string; freq?: string }) {
  if (!t) return null;
  const days = Math.round((Date.now() - +new Date(t.length <= 10 ? t + "T12:00:00Z" : t)) / 864e5);
  if (days < 0) return null;
  const label = days < 2 ? "current" : days < 60 ? `${days} days old` : days < 730 ? `${Math.round(days / 30.4)} months old` : `${Math.round(days / 365)} years old`;
  const late = freq && EXPECT[freq] != null && days > EXPECT[freq];
  return <span className={`age${late ? " late" : ""}`} title={late ? "Older than this source usually is" : "Age of the latest figure"}>Data {label}{late ? " (late)" : ""}</span>;
}
