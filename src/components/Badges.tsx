import { EVIDENCE, STATE } from "../lib/format";

export function Evidence({ cls }: { cls: string }) {
  const [label, title] = EVIDENCE[cls] || [cls.replace(/_/g, " "), ""];
  return <span className={`ev ${cls}`} title={title}>{label}</span>;
}

export function StateChip({ state, direction }: { state?: string; direction?: string }) {
  if (!state || state === "observed") return null;
  if (state === "outside_reference_range_review") {
    return <span className="st out">{direction === "below" ? "Unusual: lower than past years" : "Unusual: higher than past years"}</span>;
  }
  const [label, cls] = STATE[state] || [state.replace(/_/g, " "), "insufficient"];
  return <span className={`st ${cls}`}>{label}</span>;
}
