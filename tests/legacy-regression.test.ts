/* Regression test: the migrated stress-test models must reproduce the pinned
 * legacy page exactly. The legacy code is run straight from
 * reference/legacy-index.html; the migrated code from src/legacy. */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
// @ts-ignore - plain ES module
import { legacyCode, EXPORTS } from "../scripts/extract-legacy.mjs";
import * as M from "../src/legacy/core.js";
import { integrated, defaultState } from "../src/legacy/integrated.js";

const html = readFileSync("reference/legacy-index.html", "utf8");
// Evaluate the legacy script in isolation and collect the same names.
const L: any = new Function(`${legacyCode(html)}; return { ${EXPORTS.join(", ")} };`)();
// The legacy page's own integrated() reads a page-level `state`; rebuild it the same way.
const legacyIntegrated = new Function("SCEN", "state",
  html.slice(html.indexOf("function integrated("), html.indexOf("/* ---------- UI build ---------- */")) + "; return integrated;");

const TOL = 1e-9;
const keys = Object.keys(L.SCEN);

function grid(s: any): any[] {
  // Every parameter at its minimum, default and maximum, one at a time.
  const base: any = {}; s.params.forEach((p: any) => (base[p.id] = p.value));
  const out = [base];
  for (const p of s.params) for (const v of [p.min, p.max]) out.push({ ...base, [p.id]: v });
  return out;
}

describe("seven stress-test models", () => {
  it("has the same scenarios", () => expect(Object.keys(M.SCEN)).toEqual(keys));
  for (const k of keys) {
    it(`${k}: identical results across settings and start days`, () => {
      const s = L.SCEN[k], m = (M.SCEN as any)[k];
      for (const p of grid(s)) for (const a of [Infinity, 0, 3, 10, 30, s.aMax]) {
        const r1 = s.run(p, a), r2 = m.run(p, a);
        expect(Math.abs(r1.total - r2.total)).toBeLessThan(TOL);
        expect(Math.abs(r1.loss - r2.loss)).toBeLessThan(TOL);
        expect(Math.abs(r1.cost - r2.cost)).toBeLessThan(TOL);
        expect(r2.y.length).toBe(r1.y.length);
        r1.y.forEach((v: number, i: number) => expect(Math.abs(v - r2.y[i])).toBeLessThan(TOL));
        expect(m.signals(r2)).toEqual(s.signals(r1));
      }
    });
  }
});

describe("compound year", () => {
  it("matches the legacy integrated() for every timing and the shared plan", () => {
    const state = defaultState();
    const leg = legacyIntegrated(L.SCEN, state);
    for (const set of [keys, ["drought", "rail"], ["phosphate", "export", "rail", "cyber"]])
      for (const kappa of [0, 8, 40]) for (const penalty of [0, 5, 21]) for (const pb of [false, true])
        for (const when of [null, "react", 0, 7]) {
          const cfg = { set, kappa, penalty };
          const a = leg(cfg, when, pb), b = integrated(cfg, when, pb, state);
          expect(Math.abs(a.combined - b.combined)).toBeLessThan(TOL);
          expect(Math.abs(a.standalone - b.standalone)).toBeLessThan(TOL);
        }
  });
});

describe("decision game", () => {
  it("gives identical costs for every plan and path", () => {
    for (const path of Object.keys(L.GPATHS)) {
      for (const p0 of Object.keys(L.GPLANS0)) for (const o of L.gOpts5(p0, path)) {
        const a = L.gSim({ p0, p5: o.id }, path).c, b = (M as any).gSim({ p0, p5: o.id }, path).c;
        expect(b).toEqual(a);
      }
      expect((M as any).gSim(L.GCOMP, path).c).toEqual(L.gSim(L.GCOMP, path).c);
      for (const d of [0, 2, 5, 9]) expect((M as any).gSim({ book: d }, path).c).toEqual(L.gSim({ book: d }, path).c);
    }
  });
});

describe("register and storylines", () => {
  it("are carried over unchanged", () => {
    expect(JSON.stringify(M.REG)).toBe(JSON.stringify(L.REG));
    expect(JSON.stringify(M.STORIES)).toBe(JSON.stringify(L.STORIES));
    expect(JSON.stringify(M.INDIC)).toBe(JSON.stringify(L.INDIC));
  });
});
