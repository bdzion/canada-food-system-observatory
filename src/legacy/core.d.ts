/* Loose types for the generated legacy module: the code is copied verbatim and tested by
 * tests/legacy-regression.test.ts, so it is treated as untyped here. */
export const SCEN: any, MODELLED: string[], MODEL_CARDS: any, MODEL_CAT: any, CATS: any[], PATHS: any, ORIGIN: any,
  SIG: string[], TREND: any, REG: any[], UPDATES: any[], NOTES: any, STORIES: any[], SNAPSHOT: string, VERSION: string,
  CHECKED: string, NODES: any[], PATH_NODE: any, LEVEL: any, INDIC: any[], TIMELINES: any[], KIND: any,
  GX: any, GC: any, GPATHS: any, GWORST: any, GPLANS0: any, GCOMP: any, GNONE: any, GCAT: any[], GCOST_SRC: any[];
export function fmtM(v: number): string;
export function fmtCM(v: number): string;
export function dayToDate(d: number, month?: number): string;
export function fmtDay(s: any, d: number): string;
export function clamp(x: number, a: number, b: number): number;
export function esc(t: any): string;
export function gOpts5(p0: string, path: any): any[];
export function gSim(plan: any, path: any): any;
export function gPlanName(plan: any): string;
export function gMetrics(sim: any): any[];
export function gDebrief(plan: any): any;
