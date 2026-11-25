const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const MON = MONTHS.map((m) => m.slice(0, 3));

export function longDate(s?: string | null): string {
  if (!s) return "—";
  const d = new Date(s.length <= 10 ? s + "T12:00:00Z" : s);
  if (isNaN(+d)) return s;
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}
export function shortDate(s?: string | null): string {
  if (!s) return "—";
  const d = new Date(s.length <= 10 ? s + "T12:00:00Z" : s);
  return `${d.getUTCDate()} ${MON[d.getUTCMonth()]}`;
}
export function monthYear(s: string): string {
  const d = new Date(s.slice(0, 10) + "T12:00:00Z");
  return `${MON[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}
export function dateTime(s?: string | null): string {
  if (!s) return "—";
  const d = new Date(s);
  return d.toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Toronto" }) + " ET";
}
export function ago(s?: string | null): string {
  if (!s) return "";
  const m = Math.round((Date.now() - +new Date(s)) / 60000);
  if (m < 2) return "just now";
  if (m < 90) return `${m} minutes ago`;
  const h = Math.round(m / 60);
  if (h < 36) return `${h} hours ago`;
  return `${Math.round(h / 24)} days ago`;
}
/* "1 day" not "1 days". Used wherever an age or a threshold in days is shown. */
export const days = (n: number) => `${n} ${n === 1 ? "day" : "days"}`;

export const num = (v: number | null | undefined, d = 0) =>
  v == null || !isFinite(v) ? "—" : v.toLocaleString("en-CA", { minimumFractionDigits: d, maximumFractionDigits: d });
export const pct = (v: number | null | undefined, d = 1) => (v == null ? "—" : `${v > 0 ? "+" : ""}${v.toFixed(d)}%`);
export const usdM = (v: number) => `US$${(v / 1e6).toLocaleString("en-CA", { maximumFractionDigits: v >= 1e8 ? 0 : 1 })}M`;

export const STATE: Record<string, [string, string]> = {
  within_reference_range: ["Normal for the time of year", "within"],
  /* Kept for older archived days. Live readings use the two-screen ladder
     (see RungChip in components/Badges.tsx), which does not call a reading
     unusual on the level alone. */
  outside_reference_range_review: ["Outside past years for the time of year", "out"],
  insufficient_data: ["Not enough past data", "insufficient"],
  official_notice_active: ["Alerts in effect", "notice"],
  none_active: ["No alerts in effect", "within"],
  source_unavailable: ["Data unavailable", "insufficient"],
};
/* "Type of information" labels shown on every card. Colour is never the only cue: each has a word label. */
export const EVIDENCE: Record<string, [string, string]> = {
  observation: ["Measured data", "A figure published by a government or international agency."],
  official_alert: ["Official warning", "A warning issued by the agency named, such as Environment and Climate Change Canada."],
  official_notice: ["Government notice", "A notice or announcement from a government department. It tells you what was announced, not what effect followed."],
  reported_event: ["News report", "Found in news coverage and not yet confirmed."],
  screening_signal: ["Screening signal", "A figure our automatic checks picked out. A reason to look closer, not a finding."],
  scenario_output: ["What-if illustration", "The result of a simple model with stated assumptions. Not a forecast."],
  author_judgement: ["Our team's rating", "A rating made by the research team, not a measurement. It should be replaced by a structured review with experts."],
  supplier_link: ["Canada buys from here", "Canada imports this product from the country affected. We do not yet know whether the disaster affects that supply."],
  source_fact: ["Published fact", "A figure taken from the report or article named, checked on the date shown."],
};
