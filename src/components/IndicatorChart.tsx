/* Chart for each indicator kind, drawn from series/<id>.json. */
import { useState } from "react";
import { useData } from "../lib/data";
import { longDate, monthYear, num, shortDate } from "../lib/format";
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
        { label: `This crop year (${d.crop_year})`, color: "var(--act)" },
        { label: `Last crop year (${prevLabel})`, color: "var(--muted)", dash: true },
        { label: `Lowest to highest of the past ${d.prior_crop_years.length} crop years`, color: "var(--band)", box: true },
      ]} />
      <LineChart
        aria={`${s.label}, thousand tonnes by grain week, crop year ${d.crop_year} compared with earlier years`}
        xDomain={[1, 52]} xTicks={xTicks} yLabel="thousand tonnes"
        yFmt={(v) => num(v)} xFmt={(w) => `Week ${w} of the crop year (about ${shortDate(weekDate(w).toISOString())})`}
        bands={[{ data: s.rows.map((r: any) => ({ x: r.w, lo: r.lo, hi: r.hi })), color: "var(--band)", label: "Past years (low to high)" }]}
        series={[
          { id: "med", label: "Typical year", color: "var(--muted)", dash: "1 3", width: 1.5, endLabel: false, data: s.rows.map((r: any) => ({ x: r.w, y: r.med })) },
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
      <p className="small muted" style={{ marginTop: 6 }}>Toronto wholesale price per {s.package}.</p>
      <Legend items={[
        { label: "This year (daily price; the middle of the reported range)", color: "var(--act)" },
        { label: "Typical price for the same week in past years", color: "var(--muted)", dash: true },
        { label: `Lowest to highest in past years (in ${d.ref_month ? monthYear(d.ref_month + "-01") : "today's"} dollars)`, color: "var(--band)", box: true },
      ]} />
      <LineChart aria={`${s.label}: daily wholesale price compared with the range of earlier years`}
        xDomain={[x0, x1]} xTicks={ticks} yFmt={(v) => "$" + num(v, v < 10 ? 2 : 0)} yLabel="CAD per package"
        xFmt={(x) => shortDate(new Date(x * DAY).toISOString()) + " " + new Date(x * DAY).getUTCFullYear()}
        bands={[{ data: band, color: "var(--band)", label: "Past years" }]}
        series={[
          { id: "med", label: "Typical", color: "var(--muted)", dash: "6 4", width: 1.5, data: med },
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
        { label: "Grocery prices", color: "var(--base)" },
        { label: "Average hourly wage", color: "var(--act)", dash: true },
        { label: "All consumer prices", color: "var(--muted)", dash: true },
      ]} />
      <LineChart aria="Year-over-year change in store food prices, all prices and hourly wages, by month"
        xDomain={[xs[0], xs[xs.length - 1]]} xTicks={ticks} zeroLine yLabel="% change from the same month a year earlier"
        yFmt={(v) => v.toFixed(0) + "%"} xFmt={(i) => monthYear(rows[i].t)}
        series={[
          { id: "all", label: "All prices", color: "var(--muted)", dash: "1 3", width: 1.5, data: rows.map((r: any, i: number) => ({ x: i, y: r.all })) },
          { id: "wage", label: "Wages", color: "var(--act)", dash: "6 4", width: 2, data: rows.map((r: any, i: number) => ({ x: i, y: r.wage })) },
          { id: "food", label: "Groceries", color: "var(--base)", width: 2.5, data: rows.map((r: any, i: number) => ({ x: i, y: r.food })) },
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

/* Generic chart for the release-2 indicators: one or more lines over time,
 * with the range of the same period in past years shaded behind the selected line. */
const DASH = [undefined, "6 4", "2 3", "8 3 2 3", "1 3"];
const COLS = ["var(--act)", "var(--base)", "var(--c3)", "var(--c4)", "var(--c5)"];
const dayOf = (t: string) => Math.round(+new Date(t.slice(0, 10) + "T12:00:00Z") / DAY);

function fmtFor(unit: string) {
  if (unit === "dollars") return (v: number) => "$" + num(v, v < 20 ? 2 : 0);
  if (unit === "CAD") return (v: number) => "$" + num(v, v < 0.2 ? 3 : 2);
  if (unit === "percent") return (v: number) => num(v, v < 10 ? 1 : 0) + "%";
  if (unit === "cents per litre") return (v: number) => num(v, 0) + "¢";
  return (v: number) => (Math.abs(v) >= 1e6 ? num(v / 1e6, 1) + "M" : Math.abs(v) >= 1e4 ? num(v / 1e3, 0) + "k" : num(v, Math.abs(v) < 10 ? 1 : 0));
}

function yearTicks(x0: number, x1: number) {
  const out = [];
  const y0 = new Date(x0 * DAY).getUTCFullYear(), y1 = new Date(x1 * DAY).getUTCFullYear();
  const span = y1 - y0;
  for (let y = y0; y <= y1 + 1; y++) {
    if (span > 5 && y % 2) continue;
    out.push({ v: dayOf(`${y}-01-01`), label: String(y) });
    if (span <= 1) out.push({ v: dayOf(`${y}-07-01`), label: `Jul ${y}` });
  }
  return out;
}

function MiniTable({ lines, unit, freq }: { lines: any[]; unit: string; freq: string }) {
  const f = fmtFor(unit);
  const ts = [...new Set(lines.flatMap((l) => l.points.map((p: any) => p.t)))].sort().slice(-24).reverse();
  return (
    <div className="tablewrap" style={{ maxHeight: 360, overflow: "auto" }}><table className="data">
      <thead><tr><th>{freq === "weekly" ? "Week ending" : freq === "annual" ? "Year" : "Month"}</th>{lines.map((l) => <th key={l.id} className="num">{l.label}</th>)}</tr></thead>
      <tbody>{ts.map((t) => <tr key={t}><td>{freq === "annual" ? t.slice(0, 4) : freq === "weekly" ? longDate(t) : monthYear(t)}</td>
        {lines.map((l) => { const p = l.points.find((q: any) => q.t === t); const b = (l.band || []).find((q: any) => q.t === t);
          return <td key={l.id} className="num">{p && p.v != null ? f(p.v) : "—"}{b && b.lo != null && <div className="small muted">past {f(b.lo)}–{f(b.hi)}</div>}</td>; })}</tr>)}</tbody>
    </table></div>
  );
}

export function LinesChart({ d, initial, height }: { d: any; initial?: string; height?: number }) {
  const [sel, setSel] = useState<string>(initial && d.lines.some((l: any) => l.id === initial) ? initial : d.main);
  const [table, setTable] = useState(false);
  const unit = d.unit;
  if (d.multiples) return <Multiples d={d} />;
  const pick = d.pick && d.lines.length > 1;
  const shown = pick ? d.lines.filter((l: any) => l.id === sel) : d.lines;
  const ln = shown[0];
  const lineUnit = (ln && d.units?.[ln.id]) || unit;
  const f = fmtFor(pick ? lineUnit : unit);
  const xs = shown.flatMap((l: any) => l.points.map((p: any) => dayOf(p.t)));
  if (!xs.length) return <p className="empty">No data to draw.</p>;
  const x0 = Math.min(...xs), x1 = Math.max(...xs);
  const bandLine = pick || shown.length === 1 ? ln : null;
  const pastWord = d.inflation_adjusted ? "Lowest to highest in the same period of the past five years, in that period's dollars" : "Lowest to highest in the same period of the past five years";
  return (
    <div>
      {pick && (
        <div className="chips" role="group" aria-label="Choose a series">
          {d.lines.map((l: any) => <button key={l.id} className="chip" aria-pressed={l.id === sel} onClick={() => setSel(l.id)}>{l.label}</button>)}
        </div>
      )}
      <Legend items={[
        ...shown.map((l: any, i: number) => ({ label: l.label, color: COLS[i % COLS.length], dash: i > 0 })),
        ...(bandLine && (bandLine.band || []).some((b: any) => b.lo != null) ? [{ label: pastWord, color: "var(--band)", box: true }] : []),
      ]} />
      {table ? <MiniTable lines={shown} unit={unit} freq={d.freq} /> : (
        <LineChart aria={`${shown.map((l: any) => l.label).join(", ")} over time`} height={height}
          xDomain={[x0, x1]} xTicks={yearTicks(x0, x1)} yLabel={d.y_label || (pick ? d.units?.[sel] : "") || unit}
          yFmt={f} xFmt={(x) => (d.freq === "weekly" || d.freq === "daily" ? longDate(new Date(x * DAY).toISOString()) : d.freq === "annual" ? String(new Date(x * DAY).getUTCFullYear()) : monthYear(new Date(x * DAY).toISOString()))}
          vlines={(d.marks || []).map((m: any) => ({ x: dayOf(m.t), label: m.label, color: "var(--ready)" }))}
          bands={bandLine ? [{ data: (bandLine.band || []).map((b: any) => ({ x: dayOf(b.t), lo: b.lo, hi: b.hi })), color: "var(--band)", label: "Past five years" }] : []}
          series={shown.map((l: any, i: number) => ({ id: l.id, label: l.label, color: COLS[i % COLS.length], dash: DASH[i % DASH.length], width: i === 0 ? 2.5 : 2,
            data: l.points.map((p: any) => ({ x: dayOf(p.t), y: p.v })) }))} />
      )}
      <p className="noprint"><button className="btn ghost small" onClick={() => setTable(!table)} aria-pressed={table}>{table ? "Show as a chart" : "Show as a table"}</button></p>
    </div>
  );
}

function Multiples({ d }: { d: any }) {
  const f = fmtFor(d.unit);
  return (
    <div>
      <Legend items={[{ label: "Average shelf price", color: "var(--act)" }, { label: "Lowest to highest in the same month of the past five years, in that month's dollars", color: "var(--band)", box: true }]} />
      <div className="multiples">
        {d.lines.map((l: any) => {
          const xs = l.points.map((p: any) => dayOf(p.t));
          const last = [...l.points].reverse().find((p: any) => p.v != null);
          const lb = (l.band || []).find((b: any) => b.t === last?.t);
          const out = lb && lb.hi != null && last && (last.v > lb.hi || last.v < lb.lo);
          return (
            <div key={l.id} className={`mult${out ? " out" : ""}`}>
              <div className="mh"><b>{l.label}</b><span>{last ? f(last.v) : "—"}</span></div>
              <LineChart aria={`${l.label}, price by month`} height={120} xDomain={[Math.min(...xs), Math.max(...xs)]} xTicks={yearTicks(Math.min(...xs), Math.max(...xs)).filter((_, i) => i % 2 === 0)}
                yFmt={f} xFmt={(x) => monthYear(new Date(x * DAY).toISOString())}
                bands={[{ data: (l.band || []).map((b: any) => ({ x: dayOf(b.t), lo: b.lo, hi: b.hi })), color: "var(--band)", label: "Past five years" }]}
                series={[{ id: l.id, label: l.label, color: "var(--act)", width: 2, endLabel: false, data: l.points.map((p: any) => ({ x: dayOf(p.t), y: p.v })) }]} />
              {out && <div className="small"><span className="st out">{last.v > lb.hi ? "Higher" : "Lower"} than in the past five years</span></div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function BarsChart({ d }: { d: any }) {
  const rows = d.rows;
  const max = Math.max(...rows.map((r: any) => Math.abs(r.yoy)), Math.abs(d.ref?.v || 0), 0.5);
  const neg = rows.some((r: any) => r.yoy < 0);
  return (
    <div>
      <div className="bars hbars" role="table" aria-label={`Change in grocery prices from a year earlier, by province`}>
        {rows.map((r: any) => (
          <div className="row" role="row" key={r.id}>
            <span role="cell">{r.label}</span>
            <span role="cell" className="track">
              {neg && <span className="zero" />}
              <span className="bar" style={{ display: "block", width: `${(100 * Math.abs(r.yoy)) / max / (neg ? 2 : 1)}%`, marginLeft: neg ? (r.yoy < 0 ? `${50 - (50 * Math.abs(r.yoy)) / max}%` : "50%") : 0, background: "var(--act)" }} />
              {d.ref && <span className="refmark" style={{ left: neg ? `${50 + (50 * d.ref.v) / max}%` : `${(100 * d.ref.v) / max}%` }} title={`${d.ref.label}: ${d.ref.v}%`} />}
            </span>
            <span role="cell" className="v">{r.yoy > 0 ? "+" : ""}{r.yoy.toFixed(1)}%</span>
          </div>
        ))}
      </div>
      {d.ref && <p className="small muted">The thin vertical mark shows {d.ref.label} as a whole ({d.ref.v > 0 ? "+" : ""}{d.ref.v}%). {d.unit}.</p>}
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
  if (data.kind === "lines") return <LinesChart d={data} initial={initial} />;
  if (data.kind === "bars") return <BarsChart d={data} />;
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
  } else if (d.kind === "lines") {
    rows.push(["series", "label", "date", "value", "past_5y_min", "past_5y_median", "past_5y_max", "unit"]);
    d.lines.forEach((l: any) => l.points.forEach((p: any) => { const b = (l.band || []).find((q: any) => q.t === p.t) || {};
      rows.push([l.id, l.label, p.t, p.v ?? "", b.lo ?? "", b.med ?? "", b.hi ?? "", d.units?.[l.id] || d.unit]); }));
  } else if (d.kind === "bars") {
    rows.push(["id", "label", "month", "change_from_year_earlier_pct"]);
    d.rows.forEach((r: any) => rows.push([r.id, r.label, r.t.slice(0, 7), r.yoy]));
  }
  return rows.map((r) => r.map((c) => (/[",\n]/.test(String(c)) ? `"${String(c).replace(/"/g, '""')}"` : c)).join(",")).join("\n") + "\n";
}
