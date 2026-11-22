/* World map of where Canada buys a product: each country shaded by its share of
 * Canada's imports (one hue, light to dark). Countries with a serious disaster
 * listed get a dark outline and are named in the tooltip and the table beside it. */
import { useState } from "react";
import { useData } from "../lib/data";

const BINS: [number, string, string][] = [
  [0.25, "#08306b", "25% or more"], [0.1, "#2171b5", "10 to 25%"], [0.05, "#6baed6", "5 to 10%"],
  [0.01, "#bdd7e7", "1 to 5%"], [0, "#e6eef7", "under 1%"],
];
const colour = (s?: number) => (s == null ? "var(--surface-2)" : (BINS.find(([t]) => s >= t) || BINS[BINS.length - 1])[1]);

export default function WorldMap({ shares, flagged, label }: { shares: Record<string, number>; flagged?: Set<string>; label: string }) {
  const { data } = useData<any>(`../world-paths.json`);
  const [tip, setTip] = useState<{ x: number; y: number; t: string } | null>(null);
  if (!data) return <p className="muted small">Loading map…</p>;
  return (
    <div className="worldmap" style={{ position: "relative" }}>
      <svg viewBox={`0 0 ${data.width} ${data.height}`} role="img" aria-label={label} onPointerLeave={() => setTip(null)}>
        {data.countries.map((c: any) => {
          const s = shares[c.iso3];
          const f = flagged?.has(c.iso3);
          return (
            <path key={c.iso3 + c.name} d={c.d} fill={colour(s)} style={f ? { stroke: "var(--ready)", strokeWidth: 1.6 } : undefined}
              onPointerMove={(e) => {
                const r = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
                setTip({ x: e.clientX - r.left, y: e.clientY - r.top, t: `${c.name}: ${s == null ? "no recorded imports" : (s * 100).toFixed(1) + "% of Canada's imports"}${f ? " · disaster listed" : ""}` });
              }} />
          );
        })}
      </svg>
      {tip && <div className="tip" style={{ left: Math.min(tip.x + 12, 520), top: tip.y + 12 }}>{tip.t}</div>}
      <div className="scale" style={{ marginTop: 6 }}>
        <span className="small muted">Share of Canada's imports by value:</span>
        {BINS.slice().reverse().map(([, c, l]) => <span key={l}><i style={{ background: c }} />{l}</span>)}
        <span><i style={{ background: "var(--surface-2)", border: "1px solid var(--line)" }} />none recorded</span>
        {flagged && flagged.size > 0 && <span><i style={{ background: "transparent", border: "2px solid var(--ready)" }} />serious disaster listed</span>}
      </div>
    </div>
  );
}
