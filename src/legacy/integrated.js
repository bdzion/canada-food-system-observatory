// @ts-nocheck
/* Compound-year calculation, copied from the legacy page's `integrated` function
 * (reference/legacy-index.html). The only change: the per-threat settings are
 * passed in as `state` instead of read from a page-level variable. */
import { SCEN } from "./core.js";

/* when: null = doing nothing (boundary case); "react" = each shock acted on at its “act now” sign
   (stand-in for current practice); a number = days after each “get ready” sign */
export function integrated(cfg, when, withPlaybook, state) {
  const keys = cfg.set;
  const n = keys.length;
  const pen = withPlaybook ? 0 : cfg.penalty * Math.max(0, n - 1);
  const kap = cfg.kappa / 100 * Math.max(0, n - 1);
  let standalone = 0, lossSum = 0, costSum = 0;
  const per = keys.map(k => {
    const s = SCEN[k], p = state[k];
    const sg = s.signals(s.run(p, Infinity));
    if (when === null) { const r = s.run(p, Infinity); standalone += r.total; lossSum += r.loss; return { k, solo: r.total }; }
    const start = when === "react" ? Math.max(0, sg[2][1]) : Math.max(0, sg[1][1]) + when;
    const solo = s.run(p, start);
    const joint = s.run(p, start + pen);
    standalone += solo.total; lossSum += joint.loss; costSum += joint.cost;
    return { k, solo: solo.total };
  });
  const combined = lossSum * (1 + kap) + costSum;
  return { per, standalone, combined, overlap: combined - standalone, n, cost: costSum, loss: lossSum * (1 + kap) };
}

export function defaultState() {
  const state = {};
  Object.keys(SCEN).forEach(k => { state[k] = {}; SCEN[k].params.forEach(p => state[k][p.id] = p.value); });
  return state;
}
