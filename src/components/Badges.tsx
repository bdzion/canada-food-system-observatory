import { EVIDENCE, STATE } from "../lib/format";

export function Evidence({ cls }: { cls: string }) {
  const [label, title] = EVIDENCE[cls] || [cls.replace(/_/g, " "), ""];
  return <span className={`ev ${cls}`} title={title}>{label}</span>;
}

export function StateChip({ state, direction }: { state?: string; direction?: string }) {
  if (!state) return null;
  const [label, cls] = STATE[state] || [state.replace(/_/g, " "), "insufficient"];
  const dir = state === "outside_reference_range_review" && direction ? (direction === "above" ? " (higher)" : " (lower)") : "";
  return <span className={`st ${cls}`}>{label}{dir}</span>;
}
