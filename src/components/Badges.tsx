import { EVIDENCE, STATE } from "../lib/format";
import type { Screen } from "../lib/types";

export function Evidence({ cls }: { cls: string }) {
  const [label, title] = EVIDENCE[cls] || [cls.replace(/_/g, " "), ""];
  return <span className={`ev ${cls}`} title={title}>{label}</span>;
}

/* Where a reading sits on the two-screen ladder. The wording is deliberately
 * flat: only the top rung, where both screens agree, is worth calling out, and
 * the label says which screen fired rather than passing a verdict. The old
 * single label called a reading "unusual" whenever it was the highest of five
 * years, which on a figure that climbs every year is its ordinary state. */
const RUNG: Record<string, [string, string]> = {
  converging: ["Outside past years and moving fast", "out"],
  pace: ["Moving unusually fast", "pace"],
  level: ["Highest or lowest in five years", "level"],
  clear: ["Nothing unusual", "ok"],
  insufficient: ["Not enough past data", "insufficient"],
  not_screened: ["Shown as published", "insufficient"],
};

export function RungChip({ screen, direction }: { screen?: Screen; direction?: string }) {
  if (!screen || !screen.screens.length) return null;
  const [label, cls] = RUNG[screen.rung] || [screen.rung_label, "insufficient"];
  if (screen.rung === "clear") return <span className="st ok">{label}</span>;
  let t = label;
  if (screen.rung === "level" && direction === "above") t = "Highest in five years";
  if (screen.rung === "level" && direction === "below") t = "Lowest in five years";
  return <span className={`st ${cls}`} title={screen.rung_means}>{t}</span>;
}

export function StateChip({ state, direction, screen }: { state?: string; direction?: string; screen?: Screen }) {
  if (screen && screen.screens.length) return <RungChip screen={screen} direction={direction} />;
  if (!state || state === "observed") return null;
  const [label, cls] = STATE[state] || [state.replace(/_/g, " "), "insufficient"];
  return <span className={`st ${cls}`}>{label}</span>;
}
