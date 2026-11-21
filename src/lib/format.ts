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
export const num = (v: number | null | undefined, d = 0) =>
  v == null || !isFinite(v) ? "—" : v.toLocaleString("en-CA", { minimumFractionDigits: d, maximumFractionDigits: d });
export const pct = (v: number | null | undefined, d = 1) => (v == null ? "—" : `${v > 0 ? "+" : ""}${v.toFixed(d)}%`);
export const usdM = (v: number) => `US$${(v / 1e6).toLocaleString("en-CA", { maximumFractionDigits: v >= 1e8 ? 0 : 1 })}M`;

export const STATE: Record<string, [string, string]> = {
  within_reference_range: ["Within usual range", "within"],
  outside_reference_range_review: ["Outside usual range — review", "out"],
  insufficient_data: ["Not enough history", "insufficient"],
  official_notice_active: ["Official notices active", "notice"],
  none_active: ["None in effect", "within"],
  observed: ["Observed", "within"],
  source_unavailable: ["Source unavailable", "insufficient"],
};
export const EVIDENCE: Record<string, [string, string]> = {
  observation: ["Observation", "A recorded value from a named data provider."],
  official_alert: ["Official alert", "An authoritative notice of a hazard, issued by the named agency."],
  official_notice: ["Official notice", "A government notice or announcement. It shows what was announced, not what effect followed."],
  reported_event: ["Reported event", "Found in reporting; not yet corroborated."],
  screening_signal: ["Screening signal", "A rule flagged this for a closer look. It is not a finding."],
  scenario_output: ["Illustrative model", "Result of stated assumptions. Not a forecast."],
  author_judgement: ["Preliminary author judgement", "The authors' own rating, not a measurement. A structured expert ranking would replace it."],
  supplier_link: ["Supplier link (L1)", "Canada has imported this product from the affected country. Specific impact unknown."],
};
