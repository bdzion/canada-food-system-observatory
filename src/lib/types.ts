/* Shapes of the public JSON release written by the pipeline (schema 1.0.0). */
export const SCHEMA = "1.0.0";

export interface Headline {
  state?: string; direction?: string; text: string; period_label?: string; observation_end?: string;
  value?: number; unit?: string; n_years?: number; median?: number; min?: number; max?: number; vs_median_pct?: number;
  [k: string]: any;
}
export interface Indicator {
  id: string; title: string; role: string; question?: string; unit?: string; source_ids?: string[];
  frequency?: string; definition?: string; how_calculated?: string; does_not_show?: string;
  scenario?: string; chart?: string; headline: Headline; baseline_rule?: string; items?: any[];
}
export interface Source {
  id: string; provider: string; dataset: string; documentation_url: string; endpoint: string; licence: string;
  licence_url?: string; evidence_class: string; expected_frequency: string; stale_after_days: number;
  browser_live: boolean; registry_status: string; health: "ok" | "stale" | "error" | "unavailable";
  observation_end?: string; age_days?: number; retrieved_at?: string; last_attempt_at?: string;
  last_success_at?: string; error?: string;
}
export interface EventItem {
  id: string; kind: "weather_alert" | "recall" | "gov_notice" | "global_hazard" | "us_alert"; evidence_class: string;
  source_id: string; issuer: string; title: string; date?: string; end?: string; place?: string; url: string;
  impact_status?: string; [k: string]: any;
}
export interface Card {
  id: string; title: string; role?: string; state?: string; direction?: string; text: string; period?: string;
  observation_end?: string; scenario?: string | null; level?: string;
}
export interface Situation {
  schema_version: string; release_id: string; generated_at: string;
  headline: { theme: string; text: string; evidence: string[]; link: string }[];
  columns: { happening: Card[]; reach: Card[]; absorbs: Card[]; feels: Card[] };
  questions: { text: string; scenario: string | null }[];
  scenario_of_week: { id: string; title: string; reason: string };
  changes: { kind: string; text: string; ids: string[]; link: string }[];
  gaps: { source_id: string; health: string; text: string }[];
  counts: Record<string, number>;
  ongoing?: { id: string; title: string; since: string; days: number; live: any; review_overdue: boolean }[];
}
export interface Manifest {
  schema_version: string; release_id: string; generated_at: string; git_sha?: string; run_url?: string;
  sources_ok: number; sources_total: number; files: Record<string, { sha256: string; bytes: number }>;
}
