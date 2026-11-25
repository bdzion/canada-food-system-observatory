/* One SVG line chart used across the site: thin lines, a recessive grid,
 * an optional reference band, direct end labels, and a crosshair tooltip.
 * Identity never relies on colour alone: series also differ by dash and label.
 *
 * Every chart also offers the same numbers as a table. These charts carry the
 * site's central argument about acting early, and an image with a one-line
 * description is not a text alternative to a curve: a reader using a screen
 * reader, or anyone who wants the figures, needs the values. */
import { useId, useMemo, useState } from "react";
import { useWidth } from "./useWidth";

export interface Pt { x: number; y: number | null }
export interface Series { id: string; label: string; color: string; dash?: string; width?: number; data: Pt[]; endLabel?: boolean }
export interface Band { data: { x: number; lo: number | null; hi: number | null }[]; color: string; label: string }
export interface Props {
  series: Series[]; bands?: Band[]; xTicks: { v: number; label: string }[]; xDomain?: [number, number];
  yDomain?: [number, number]; yFmt: (v: number) => string; xFmt: (x: number) => string; yLabel?: string;
  vlines?: { x: number; label: string; color: string; dash?: string }[]; refLine?: { y: number; label: string };
  height?: number; aria: string; zeroLine?: boolean; points?: { x: number; y: number; color: string; label: string }[];
  fill?: { a: Pt[]; b: Pt[]; color: string };
}

function niceMax(v: number) {
  if (v <= 0) return 1;
  const e = Math.pow(10, Math.floor(Math.log10(v)));
  for (const m of [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) if (m * e >= v) return m * e;
  return 10 * e;
}
function ticks(lo: number, hi: number, n = 4) {
  const step = niceMax((hi - lo) / n);
  const out = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(+v.toFixed(10));
  return out;
}

/* The same numbers the chart draws, as a table. Rows are the x values that any
 * series actually has a reading at, so a sparse series shows gaps as "no data"
 * rather than being silently filled in. */
function ChartTable(p: Props & { id: string }) {
  const xs = useMemo(() => {
    const s = new Set<number>();
    for (const se of p.series) for (const d of se.data) if (d.y != null) s.add(d.x);
    return [...s].sort((a, b) => a - b);
  }, [p.series]);
  const marks = useMemo(() => {
    const m = new Map<number, string[]>();
    for (const v of p.vlines || []) {
      let best: number | null = null, bd = Infinity;
      for (const x of xs) { const d = Math.abs(x - v.x); if (d < bd) { bd = d; best = x; } }
      if (best != null) m.set(best, [...(m.get(best) || []), v.label]);
    }
    return m;
  }, [p.vlines, xs]);
  return (
    <div className="tablewrap">
      <table className="data" id={p.id}>
        <caption>{p.aria}</caption>
        <thead>
          <tr>
            <th scope="col">{p.yLabel ? "Step" : "When"}</th>
            {p.series.map((s) => <th scope="col" key={s.id}>{s.label}</th>)}
            {(p.bands || []).map((b, i) => <th scope="col" key={"b" + i}>{b.label}</th>)}
            {marks.size > 0 && <th scope="col">Marked</th>}
          </tr>
        </thead>
        <tbody>
          {xs.map((x) => (
            <tr key={x}>
              <th scope="row">{p.xFmt(x)}</th>
              {p.series.map((s) => {
                const d = s.data.find((q) => q.x === x);
                return <td key={s.id}>{d && d.y != null ? p.yFmt(d.y) : "no data"}</td>;
              })}
              {(p.bands || []).map((b, i) => {
                const d = b.data.find((q) => q.x === x);
                return <td key={"b" + i}>{d && d.lo != null && d.hi != null ? `${p.yFmt(d.lo)} to ${p.yFmt(d.hi)}` : "no data"}</td>;
              })}
              {marks.size > 0 && <td>{(marks.get(x) || []).join("; ")}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function LineChart(p: Props) {
  const [ref, W] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const [asTable, setAsTable] = useState(false);
  const tableId = useId();
  const H = p.height ?? (W < 560 ? 240 : 280);
  const m = { l: 54, r: W < 560 ? 12 : 120, t: 18, b: 34 };
  const iw = W - m.l - m.r, ih = H - m.t - m.b;
  const allX = useMemo(() => p.series.flatMap((s) => s.data.map((d) => d.x)), [p.series]);
  const [x0, x1] = p.xDomain ?? [Math.min(...allX), Math.max(...allX)];
  const ys = [
    ...p.series.flatMap((s) => s.data.map((d) => d.y)),
    ...(p.bands || []).flatMap((b) => b.data.flatMap((d) => [d.lo, d.hi])),
    ...(p.refLine ? [p.refLine.y] : []),
  ].filter((v): v is number => v != null && isFinite(v));
  let [y0, y1] = p.yDomain ?? [Math.min(0, ...ys), niceMax(Math.max(...ys, 0) * 1.06)];
  if (!p.yDomain && Math.min(...ys) < 0) { y0 = -niceMax(-Math.min(...ys) * 1.1); }
  const X = (x: number) => m.l + ((x - x0) / (x1 - x0 || 1)) * iw;
  const Y = (y: number) => m.t + ih - ((y - y0) / (y1 - y0 || 1)) * ih;
  const path = (d: Pt[]) => {
    let s = "", pen = false;
    for (const pt of d) {
      if (pt.y == null || pt.x < x0 || pt.x > x1) { pen = false; continue; }
      s += `${pen ? "L" : "M"}${X(pt.x).toFixed(1)},${Y(pt.y).toFixed(1)}`;
      pen = true;
    }
    return s;
  };
  const area = (b: Band) => {
    const pts = b.data.filter((d) => d.lo != null && d.hi != null && d.x >= x0 && d.x <= x1);
    if (pts.length < 2) return "";
    return "M" + pts.map((d) => `${X(d.x).toFixed(1)},${Y(d.hi!).toFixed(1)}`).join("L") + "L" +
      pts.slice().reverse().map((d) => `${X(d.x).toFixed(1)},${Y(d.lo!).toFixed(1)}`).join("L") + "Z";
  };
  const xsUnique = useMemo(() => [...new Set(allX)].sort((a, b) => a - b), [allX]);
  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    const xv = x0 + ((px - m.l) / iw) * (x1 - x0);
    let best = xsUnique[0], bd = Infinity;
    for (const x of xsUnique) { const d = Math.abs(x - xv); if (d < bd) { bd = d; best = x; } }
    setHover(best);
  };
  const yt = ticks(y0, y1, 4);
  const ends = p.series.filter((s) => s.endLabel !== false).map((s) => {
    const last = [...s.data].reverse().find((d) => d.y != null && d.x <= x1);
    return last ? { s, y: Y(last.y!), x: X(last.x) } : null;
  }).filter(Boolean) as { s: Series; y: number; x: number }[];
  // Nudge end labels apart so they never overlap.
  ends.sort((a, b) => a.y - b.y);
  for (let i = 1; i < ends.length; i++) if (ends[i].y - ends[i - 1].y < 14) ends[i].y = ends[i - 1].y + 14;
  return (
    <div className="chart" ref={ref}>
      <div className="chart-tools">
        <button type="button" className="chip" aria-expanded={asTable} aria-controls={tableId}
                onClick={() => setAsTable(!asTable)}>
          {asTable ? "Show as a chart" : "Show as a table"}
        </button>
      </div>
      {asTable && <ChartTable {...p} id={tableId} />}
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={p.aria}
           style={asTable ? { display: "none" } : undefined} aria-hidden={asTable || undefined}
           onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
        <g className="grid">{yt.map((v) => <line key={v} x1={m.l} x2={m.l + iw} y1={Y(v)} y2={Y(v)} />)}</g>
        <g className="axis">
          {yt.map((v) => <text key={v} x={m.l - 8} y={Y(v) + 4} textAnchor="end">{p.yFmt(v)}</text>)}
          {p.xTicks.filter((t) => t.v >= x0 && t.v <= x1).map((t) => <text key={t.v} x={X(t.v)} y={H - 12} textAnchor="middle">{t.label}</text>)}
          {p.yLabel && <text x={m.l} y={10} textAnchor="start" fontWeight={600}>{p.yLabel}</text>}
        </g>
        {p.zeroLine && y0 < 0 && <line x1={m.l} x2={m.l + iw} y1={Y(0)} y2={Y(0)} stroke="var(--muted)" />}
        {(p.bands || []).map((b, i) => <path key={i} d={area(b)} fill={b.color} stroke="none" />)}
        {p.fill && <path d={"M" + p.fill.a.filter(d => d.y != null).map((d) => `${X(d.x)},${Y(d.y!)}`).join("L") + "L" + p.fill.b.filter(d => d.y != null).slice().reverse().map((d) => `${X(d.x)},${Y(d.y!)}`).join("L") + "Z"} fill={p.fill.color} />}
        {p.refLine && <g><line x1={m.l} x2={m.l + iw} y1={Y(p.refLine.y)} y2={Y(p.refLine.y)} stroke="var(--muted)" strokeDasharray="2 3" /><text x={m.l + iw - 4} y={Y(p.refLine.y) - 4} textAnchor="end" fontSize={11} fill="var(--muted)">{p.refLine.label}</text></g>}
        {(p.vlines || []).map((v, i) => v.x >= x0 && v.x <= x1 && (
          <g key={i}><line x1={X(v.x)} x2={X(v.x)} y1={m.t} y2={m.t + ih} stroke={v.color} strokeDasharray={v.dash ?? "4 3"} strokeWidth={1.5} />
            <text x={X(v.x) + 4} y={m.t + 11 + (i % 4) * 13} fontSize={11} fill={v.color} fontWeight={600} paintOrder="stroke" stroke="var(--surface)" strokeWidth={3}>{v.label}</text></g>))}
        {p.series.map((s) => <path key={s.id} d={path(s.data)} fill="none" stroke={s.color} strokeWidth={s.width ?? 2} strokeDasharray={s.dash} strokeLinejoin="round" strokeLinecap="round" />)}
        {(p.points || []).map((pt, i) => <circle key={i} cx={X(pt.x)} cy={Y(pt.y)} r={5} fill={pt.color} stroke="var(--surface)" strokeWidth={2} />)}
        {W >= 560 && ends.map(({ s, y, x }) => <text key={s.id} x={x + 8} y={y + 4} fontSize={11.5} fill="var(--ink)" fontWeight={600} paintOrder="stroke" stroke="var(--surface)" strokeWidth={3}>{s.label}</text>)}
        {hover != null && <line x1={X(hover)} x2={X(hover)} y1={m.t} y2={m.t + ih} stroke="var(--muted)" strokeWidth={1} />}
        {hover != null && p.series.map((s) => { const d = s.data.find((q) => q.x === hover); return d && d.y != null ? <circle key={s.id} cx={X(hover)} cy={Y(d.y)} r={4} fill={s.color} stroke="var(--surface)" strokeWidth={2} /> : null; })}
        <rect x={m.l} y={m.t} width={iw} height={ih} fill="transparent" />
      </svg>
      {hover != null && !asTable && (
        <div className="tip" style={{ left: Math.min(X(hover) + 12, W - 200), top: 8 }}>
          <b>{p.xFmt(hover)}</b>
          {p.series.map((s) => { const d = s.data.find((q) => q.x === hover); return <div className="r" key={s.id}><span><i style={{ background: s.color }} />{s.label}</span><span>{d && d.y != null ? p.yFmt(d.y) : "no data"}</span></div>; })}
          {(p.bands || []).map((b, i) => { const d = b.data.find((q) => q.x === hover); return d && d.lo != null ? <div className="r" key={"b" + i}><span><i style={{ background: b.color, height: 8 }} />{b.label}</span><span>{p.yFmt(d.lo)}–{p.yFmt(d.hi!)}</span></div> : null; })}
        </div>
      )}
    </div>
  );
}

export function Legend({ items }: { items: { label: string; color: string; dash?: boolean; box?: boolean }[] }) {
  return <div className="legend">{items.map((i) => <span key={i.label}><i className={i.box ? "box" : ""} style={i.box ? { background: i.color } : { borderTopColor: i.color, borderTopStyle: i.dash ? "dashed" : "solid" }} />{i.label}</span>)}</div>;
}
