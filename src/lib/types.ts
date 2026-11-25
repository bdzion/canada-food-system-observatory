/* Shapes of the public JSON release written by the pipeline (schema 1.0.0). */
export const SCHEMA = "1.0.0";

/* The two screens, and the rung they place a reading on. See the pipeline's
 * cfso/screening.py and the About page: the level screen asks whether a reading
 * is outside the range of the same period in past years, the pace screen
 * whether it is moving unusually fast, and only the two together are worth a
 * closer look. */
export type Rung = "clear" | "level" | "pace" | "converging" | "insufficient" | "not_screened";
export interface Screen {
  screens: ("level" | "pace")[]; screens_why: string;
  rung: Rung; top_rung: Rung; rung_label: string; rung_means: string;
  flagged: boolean; worth_a_look: boolean;
  level_fired: boolean; pace_fired: boolean; pace_elevated: boolean;
  level_blocked_by_years: boolean; level_min_years_to_flag: number;
  level_words?: string; level_luck?: string | null; pace_words?: string;
  main_rung?: Rung;
  counts?: { n: number; level: number; pace: number; converging: number };
}
export interface Headline {
  state?: string; direction?: string; text: string; period_label?: string; observation_end?: string;
  value?: number; unit?: string; n_years?: number; median?: number; min?: number; max?: number; vs_median_pct?: number;
  screen?: Screen;
  /* Lateness is decided once, in the pipeline, from the source registry. */
  age_days?: number | null; late?: boolean; late_note?: string;
  late_source?: { id: string; provider: string; health: string; observation_end?: string;
                  age_days?: number | null; expected_frequency: string; stale_after_days: number };
  [k: string]: any;
}

/* How far along the food chain the published readings have reached, per
 * what-if test. Written by cfso/transmission.py. */
export type StageState = "unwatched" | "insufficient" | "clear" | "easing" | "reached";
export interface StageWatch {
  indicator: string; item?: string | null; why: string; rungs: string[]; direction: string;
  state: "firing" | "quiet" | "insufficient" | "missing" | "not_screened"; firing: boolean;
  rung?: Rung; rung_label?: string; title?: string; period?: string; observation_end?: string;
  value?: number; unit?: string; late?: boolean; late_note?: string | null; age_days?: number | null;
  direction_seen?: string; text?: string;
}
export interface Stage {
  id: string; label: string; what: string; link?: string;
  state: StageState; previous_state?: StageState | null; unsupported?: boolean;
  counts: { watched: number; firing: number; quiet: number; unreadable: number; late: number };
  min_firing: number; unwatched_why?: string | null;
  oldest_observation?: string | null; any_late: boolean; watch: StageWatch[];
}
export interface Sign {
  id: "watch" | "ready" | "act"; label: string; stage: string; stage_label: string;
  min_firing: number; text: string; supported: boolean; rests_on_late_data: boolean;
  fired_without_support: boolean; stage_state: string; firing: number; watched: number;
  evidence: { indicator: string; item?: string | null; title?: string; rung?: string; period?: string; late?: boolean }[];
}
export interface Chain {
  id: string; title: string; summary: string;
  stage_reached: string | null; stage_reached_label: string | null;
  sign_supported: "watch" | "ready" | "act" | null; sign_supported_label: string | null;
  stages: Stage[]; signs: Sign[];
  depends_on: { indicator: string; assumption: string; would_change: string }[];
  unwatched_stages: string[]; late_stages: string[]; unsupported_stages: string[];
  rests_on_late_data: boolean; text: string;
}
export interface Transmission {
  schema_version: string; release_id: string; generated_at: string;
  stages: { id: string; label: string; what: string }[];
  chains: Chain[]; note: string;
}
export interface Indicator {
  id: string; title: string; role: string; question?: string; unit?: string; source_ids?: string[];
  frequency?: string; definition?: string; how_calculated?: string; does_not_show?: string;
  scenario?: string; chart?: string; headline: Headline; baseline_rule?: string; items?: any[];
  /* The team's reading of the figure: the second, third and fourth of the four
   * questions. Judgement, never measurement, and labelled as such on screen. */
  reading?: { why_for_canada: string; what_next: string; to_consider: string;
              evidence_class: string; note: string };
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
  ongoing?: { id: string; title: string; since: string; days: number; live: any; review_overdue: boolean;
              expired?: boolean }[];
  transmission?: {
    n_chains: number; n_moving: number; n_unwatched: number; text: string;
    furthest: { id: string; title: string; stage: string | null; stage_label: string | null;
                sign: string | null; sign_label: string | null }[];
  } | null;
}
export interface Manifest {
  schema_version: string; release_id: string; generated_at: string; git_sha?: string; run_url?: string;
  sources_ok: number; sources_total: number; files: Record<string, { sha256: string; bytes: number }>;
}
