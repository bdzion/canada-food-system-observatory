/* One card per live indicator, used across the site. */
import { href } from "../lib/router";
import type { Indicator } from "../lib/types";
import { Evidence, StateChip } from "./Badges";
import { Age, Spark, Trend } from "./Spark";

export const ROLE: Record<string, string> = {
  buffer: "Backup supply", flow: "Movement of goods", market: "Prices", access: "Household budgets", signal: "Warnings and notices",
};
export const evClass = (id: string) => (id === "weather_alerts" ? "official_alert" : id === "food_recalls" ? "official_notice" : "observation");

export default function IndicatorCard({ i, role = true, compact = false }: { i: Indicator; role?: boolean; compact?: boolean }) {
  const h = i.headline;
  return (
    <a className="card" href={href(`/indicators/${i.id}`)}>
      <div className="meta">{role && <span className="pill">{ROLE[i.role] || i.role}</span>}<Evidence cls={evClass(i.id)} /></div>
      <h4>{i.title}</h4>
      {!compact && <p className="muted small">{i.question}</p>}
      <p style={{ marginTop: 6 }}>{h.text}</p>
      <div className="cue">
        <Spark values={h.spark} label={`${i.title}: recent readings`} />
        <Trend t={h.trend} freq={i.frequency} />
        <Age t={h.observation_end} freq={i.frequency} />
      </div>
      <div className="period">{h.period_label} <StateChip state={h.state} direction={h.direction} screen={h.screen} /></div>
      {h.late && <p className="rung warn">Late: this source has not published since then.</p>}
    </a>
  );
}
