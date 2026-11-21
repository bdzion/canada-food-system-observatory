/* Chart for each indicator kind, drawn from series/<id>.json. */
import { useState } from "react";
import { useData } from "../lib/data";
import { monthYear, num, shortDate } from "../lib/format";
import LineChart, { Legend } from "./LineChart";
import { useWidth } from "./useWidth";

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY = 86400000;

function isoWeek(d: Date) {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((+t - +y0) / DAY + 1) / 7);
}

export function CropWeekChart({ d }: { d: any }) {
  const [sel, setSel] = useState(0);
  const s = d.series[sel];
  const y0 = +d.crop_year.slice(0, 4);
  const weekDate = (w: number) => new Date(Date.UTC(y0, 7, 1) + (w - 1) * 7 * DAY);
  // One tick at the first grain week of each month.
  const xTicks = Array.from({ length: 52 }, (_, i) => i + 1)
    .filter((w) => w === 1 || weekDate(w).getUTCMonth() !== weekDate(w - 1).getUTCMonth())
    .map((w) => ({ v: w, label: MON[weekDate(w).getUTCMonth()] }));
  const prevLabel = d.prior_crop_years[0];
  return (
    <div>
      {d.series.length > 1 && (
        <div className="chips" role="group" aria-label="Choose a measure">
          {d.series.map((x: any, i: number) => <button key={x.id} className="chip" aria-pressed={i === sel} onClick={() => setSel(i)}>{x.label}</button>)}
        </div>
      )}
      <Legend items={[
        { label: `Crop year ${d.crop_year}`, color: "var(--act)" },
        { label: `Crop year ${prevLabel}`, color: "var(--muted)", dash: true },
        { label: `Range of ${d.prior_crop_years.length} previous crop years`, color: "var(--band)", box: true },
      ]} />
      <LineChart
        aria={`${s.label}, thousand tonnes by grain week, crop year ${d.crop_year} compared with earlier years`}
        xDomain={[1, 52]} xTicks={xTicks} yLabel="thousand tonnes"
        yFmt={(v) => num(v)} xFmt={(w) => `Grain week ${w} (about ${shortDate(weekDate(w).toISOString())})`}
        bands={[{ data: s.rows.map((r: any) => ({ x: r.w, lo: r.lo, hi: r.hi })), color: "var(--band)", label: "Earlier years' range" }]}
        series={[
          { id: "med", label: "Median of earlier years", color: "var(--muted)", dash: "1 3", width: 1.5, endLabel: false, data: s.rows.map((r: any) => ({ x: r.w, y: r.med })) },
          { id: "prev", label: prevLabel, color: "var(--muted)", dash: "6 4", width: 1.5, data: s.rows.map((r: any) => ({ x: r.w, y: r.prev })) },
          { id: "cur", label: d.crop_year, color: "var(--act)", width: 2.75, data: s.rows.map((r: any) => ({ x: r.w, y: r.v })) },
        ]}
      />
    </div>
  );
}

export function ProduceChart({ d, initial }: { d: any; initial?: string }) {
  const [sel, setSel] = useState(initial || d.series[0]?.id);
  const s = d.series.find((x: any) => x.id === sel) || d.series[0];
  if (!s) return <p className="empty">No series.</p>;
  const pts = s.points.map((p: any) => ({ ...p, x: Math.round(+new Date(p.t + "T12:00:00Z") / DAY) }));
  const x0 = pts[0].x, x1 = pts[pts.length - 1].x;
  const band = pts.map((p: any) => { const b = s.band[isoWeek(new Date(p.x * DAY)) - 1] || {}; return { x: p.x, lo: b.lo ?? null, hi: b.hi ?? null }; });
  const med = pts.map((p: any) => ({ x: p.x, y: (s.band[isoWeek(new Date(p.x * DAY)) - 1] || {}).med ?? null }));
  const ticks = [];
  for (let x = x0; x <= x1; x += 1) { const dt = new Date(x * DAY); if (dt.getUTCDate() === 1 && dt.getUTCMonth() % 2 === 0) ticks.push({ v: x, label: MON[dt.getUTCMonth()] + (dt.getUTCMonth() === 0 ? " " + dt.getUTCFullYear() : "") }); }
  return (
    <div>
      <label className="small" htmlFor="prodsel"><b>Product</b> </label>
      <select id="prodsel" value={sel} onChange={(e) => setSel(e.target.value)}>
        {d.series.map((x: any) => <option key={x.id} value={x.id}>{x.label}</option>)}
      </select>
      <p className="small muted" style={{ marginTop: 6 }}>Toronto wholesale, per {s.package}. Origin: {s.origin}.</p>
      <Legend items={[
        { label: "This year: daily midpoint of low and high price", color: "var(--act)" },
        { label: "Median of earlier years, same week", color: "var(--muted)", dash: true },
        { label: `Earlier years' range (in ${d.ref_month ? monthYear(d.ref_month + "-01") : "current"} dollars)`, color: "var(--band)", box: true },
      ]} />
      <LineChart aria={`${s.label}: daily wholesale price compared with the range of earlier years`}
        xDomain={[x0, x1]} xTicks={ticks} yFmt={(v) => "$" + num(v, v < 10 ? 2 : 0)} yLabel="CAD per package"
        xFmt={(x) => shortDate(new Date(x * DAY).toISOString()) + " " + new Date(x * DAY).getUTCFullYear()}
        bands={[{ data: band, color: "var(--band)", label: "Earlier years" }]}
        series={[
          { id: "med", label: "Usual (median)", color: "var(--muted)", dash: "6 4", width: 1.5, data: med },
          { id: "mid", label: "This year", color: "var(--act)", width: 2, data: pts.map((p: any) => ({ x: p.x, y: p.mid })) },
        ]} />
    </div>
  );
}

export function AffordabilityChart({ d }: { d: any }) {
  const rows = d.rows.filter((r: any) => r.food != null || r.wage != null);
  const xs = rows.map((_: any, i: number) => i);
  const ticks = rows.map((r: any, i: number) => ({ v: i, label: r.t.slice(5, 7) === "01" ? r.t.slice(0, 4) : "" })).filter((t: any) => t.label);
  return (
    <div>
      <Legend items={[
        { label: "Food bought in stores (CPI)", color: "var(--base)" },
        { label: "Average hourly wage", color: "var(--act)", dash: true },
        { label: "All-items CPI", color: "var(--muted)", dash: true },
      ]} />
      <LineChart aria="Year-over-year change in store food prices, all prices and hourly wages, by month"
        xDomain={[xs[0], xs[xs.length - 1]]} xTicks={ticks} zeroLine yLabel="% change from a year earlier"
        yFmt={(v) => v.toFixed(0) + "%"} xFmt={(i) => monthYear(rows[i].t)}
        series={[
          { id: "all", label: "All items", color: "var(--muted)", dash: "1 3", width: 1.5, data: rows.map((r: any, i: number) => ({ x: i, y: r.all })) },
          { id: "wage", label: "Wages", color: "var(--act)", dash: "6 4", width: 2, data: rows.map((r: any, i: number) => ({ x: i, y: r.wage })) },
          { id: "food", label: "Store food", color: "var(--base)", width: 2.5, data: rows.map((r: any, i: number) => ({ x: i, y: r.food })) },
        ]} />
    </div>
  );
}

export function WeeklyBars({ d }: { d: any }) {
  const [ref, W] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const rows = d.rows;
  const H = 200, m = { l: 40, r: 10, t: 12, b: 28 };
  const iw = W - m.l - m.r, ih = H - m.t - m.b;
  const max = Math.max(4, ...rows.map((r: any) => r.v));
  const bw = iw / rows.length;
  return (
    <div className="chart" ref={ref}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Notices per week over the last two years; maximum ${max}`}>
        <g className="grid">{[0, 0.5, 1].map((f) => <line key={f} x1={m.l} x2={m.l + iw} y1={m.t + ih * (1 - f)} y2={m.t + ih * (1 - f)} />)}</g>
        <g className="axis">{[0, 0.5, 1].map((f) => <text key={f} x={m.l - 6} y={m.t + ih * (1 - f) + 4} textAnchor="end">{Math.round(max * f)}</text>)}
          {rows.map((r: any, i: number) => r.t.slice(5, 7) === "01" && +r.t.slice(8) <= 7 ? <text key={i} x={m.l + i * bw} y={H - 8}>{r.t.slice(0, 4)}</text> : null)}</g>
        {rows.map((r: any, i: number) => (
          <rect key={i} x={m.l + i * bw + 1} y={m.t + ih - (r.v / max) * ih} width={Math.max(1, bw - 2)} height={(r.v / max) * ih}
            rx={Math.min(3, bw / 3)} fill={hover === i ? "var(--accent)" : "var(--off)"} onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)} />
        ))}
      </svg>
      {hover != null && <div className="tip" style={{ left: Math.min(m.l + hover * bw, W - 180), top: 0 }}><b>Week ending {shortDate(rows[hover].t)} {rows[hover].t.slice(0, 4)}</b>{rows[hover].v} notice{rows[hover].v === 1 ? "" : "s"}</div>}
    </div>
  );
}

export default function IndicatorChart({ id, kind, initial }: { id: string; kind?: string; initial?: string }) {
  const { data, error } = useData(kind === "alerts" ? null : `series/${id}.json`);
  if (kind === "alerts") return null;
  if (error) return <p className="empty">Chart data could not be loaded: {error}</p>;
  if (!data) return <p className="muted small">Loading chart…</p>;
  if (data.kind === "cropweek") return <CropWeekChart d={data} />;
  if (data.kind === "produce") return <ProduceChart d={data} initial={initial} />;
  if (data.kind === "monthly") return <AffordabilityChart d={data} />;
  if (data.kind === "weekly_counts") return <WeeklyBars d={data} />;
  return null;
}

export function toCSV(d: any): string {
  const rows: string[][] = [];
  if (d.kind === "cropweek") {
    rows.push(["measure", "grain_week", "week_end", `value_${d.crop_year}`, `value_${d.prior_crop_years[0]}`, "earlier_median", "earlier_min", "earlier_max", "n_years"]);
    d.series.forEach((s: any) => s.rows.forEach((r: any) => rows.push([s.id, r.w, r.t ?? "", r.v ?? "", r.prev ?? "", r.med ?? "", r.lo ?? "", r.hi ?? "", r.n])));
  } else if (d.kind === "produce") {
    rows.push(["series", "date", "low", "high", "midpoint"]);
    d.series.forEach((s: any) => s.points.forEach((p: any) => rows.push([s.id, p.t, p.lo, p.hi, p.mid])));
  } else if (d.kind === "monthly") {
    rows.push(["month", "food_from_stores_yoy_pct", "all_items_yoy_pct", "hourly_wage_yoy_pct", "gap_pp"]);
    d.rows.forEach((r: any) => rows.push([r.t.slice(0, 7), r.food ?? "", r.all ?? "", r.wage ?? "", r.gap ?? ""]));
  } else if (d.kind === "weekly_counts") {
    rows.push(["week_ending", "notices"]);
    d.rows.forEach((r: any) => rows.push([r.t, r.v]));
  }
  return rows.map((r) => r.map((c) => (/[",\n]/.test(String(c)) ? `"${String(c).replace(/"/g, '""')}"` : c)).join(",")).join("\n") + "\n";
}
