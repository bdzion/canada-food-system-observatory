/* The site reads a published release as static JSON. These tests check that a
 * real release still has the shape the pages rely on, so a change in the
 * pipeline cannot quietly break a page: the build would pass and the page
 * would render a blank or a wrong label.
 *
 * They run against whatever release is checked out in public/data, and skip
 * themselves when there is none, so a clean clone still passes `npm test`.
 *
 * describe.skipIf is not enough on its own for that. Vitest still runs a
 * skipped describe's body at collection time and only marks the resulting
 * suite skipped, so a read at the top of a describe throws before any test is
 * skipped. public/data is gitignored, so on a clean checkout that failed the
 * whole file. The guard therefore lives in read() itself. */
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SCHEMA } from "../src/lib/types";

const DATA = "public/data";
const has = existsSync(`${DATA}/indicators.json`);
/* With no release present, every field of a read comes back as an empty array,
   so the collect-time constants below cannot throw whatever they reach for.
   The suites are then skipped rather than failed. */
const EMPTY: any = new Proxy({}, { get: () => [] });
const read = (f: string): any => (has ? JSON.parse(readFileSync(`${DATA}/${f}`, "utf8")) : EMPTY);

const RUNGS = ["clear", "level", "pace", "converging", "insufficient", "not_screened"];
const STAGE_STATES = ["unwatched", "insufficient", "clear", "easing", "reached"];

describe.skipIf(!has)("a published release", () => {
  it("keeps the schema version the site expects", () => {
    for (const f of ["indicators.json", "situation.json", "transmission.json", "ongoing.json"])
      expect(read(f).schema_version).toBe(SCHEMA);
  });

  describe("every indicator", () => {
    const inds = (read("indicators.json").indicators ?? []) as any[];

    it("has the fields a card and a page render", () => {
      expect(inds.length).toBeGreaterThan(0);
      for (const i of inds) {
        expect(i.id, "id").toBeTruthy();
        expect(i.title, `${i.id} title`).toBeTruthy();
        expect(i.question, `${i.id} question`).toBeTruthy();
        expect(i.definition, `${i.id} definition`).toBeTruthy();
        expect(i.how_calculated, `${i.id} how_calculated`).toBeTruthy();
        expect(i.does_not_show, `${i.id} does_not_show`).toBeTruthy();
        expect(i.headline?.text, `${i.id} headline text`).toBeTruthy();
      }
    });

    it("carries a role the indicators page can file it under", () => {
      // An unknown role drops the card off the list while still being counted.
      const ORDER = ["buffer", "flow", "market", "access", "signal"];
      for (const i of inds) expect(ORDER, `${i.id} role`).toContain(i.role);
    });

    it("answers the other three of the four questions", () => {
      for (const i of inds) {
        expect(i.reading, `${i.id} has no written reading`).toBeTruthy();
        expect(i.reading.why_for_canada, `${i.id} why_for_canada`).toBeTruthy();
        expect(i.reading.what_next, `${i.id} what_next`).toBeTruthy();
        expect(i.reading.to_consider, `${i.id} to_consider`).toBeTruthy();
        // The three written answers are judgement and must say so.
        expect(i.reading.evidence_class).toBe("author_judgement");
      }
    });

    it("sits on a rung the chip knows how to label", () => {
      for (const i of inds) {
        const s = i.headline.screen;
        expect(s, `${i.id} has no screening result`).toBeTruthy();
        expect(RUNGS, `${i.id} rung`).toContain(s.rung);
        expect(RUNGS, `${i.id} top_rung`).toContain(s.top_rung);
        expect(s.rung_label, `${i.id} rung_label`).toBeTruthy();
        expect(s.rung_means, `${i.id} rung_means`).toBeTruthy();
        expect(s.screens_why, `${i.id} screens_why`).toBeTruthy();
      }
    });

    it("never reaches a rung above the top one its checks allow", () => {
      for (const i of inds) {
        const s = i.headline.screen;
        if (!RUNGS.includes(s.rung) || s.rung === "insufficient" || s.rung === "not_screened") continue;
        expect(RUNGS.indexOf(s.rung), `${i.id} is above its own top rung`)
          .toBeLessThanOrEqual(RUNGS.indexOf(s.top_rung));
      }
    });

    it("is only called worth a closer look at the top of its own ladder", () => {
      for (const i of inds) {
        const s = i.headline.screen;
        if (s.worth_a_look) expect(s.rung, `${i.id}`).toBe(s.top_rung);
      }
    });

    it("says so on the figure itself when its source is late", () => {
      const sources: any[] = read("sources.json");
      const bad = new Set(sources.filter((s) => s.health !== "ok").map((s) => s.id));
      for (const i of inds) {
        const usesBad = (i.source_ids || []).some((x: string) => bad.has(x));
        if (!usesBad) continue;
        expect(i.headline.late, `${i.id} uses a late source but is not marked late`).toBe(true);
        expect(i.headline.late_note, `${i.id} late with no note`).toBeTruthy();
        // The note has to reach the sentence a reader actually sees, because
        // that sentence is what the brief and the archive carry.
        expect(i.headline.text).toContain(i.headline.late_note);
      }
    });
  });

  describe("every chain", () => {
    const t = read("transmission.json");
    const inds = new Map(((read("indicators.json").indicators ?? []) as any[]).map((i) => [i.id, i]));
    const order = (t.stages as any[]).map((s) => s.id);

    it("names stages the page knows, in the shared order", () => {
      expect(t.chains.length).toBeGreaterThan(0);
      for (const c of t.chains) {
        const ids = c.stages.map((s: any) => s.id);
        expect(ids.every((x: string) => order.includes(x)), `${c.id} stage ids`).toBe(true);
        expect(ids, `${c.id} stages out of order`)
          .toEqual([...ids].sort((a: string, b: string) => order.indexOf(a) - order.indexOf(b)));
        for (const s of c.stages) expect(STAGE_STATES, `${c.id}/${s.id}`).toContain(s.state);
      }
    });

    it("watches only figures the release actually publishes", () => {
      for (const c of t.chains)
        for (const s of c.stages)
          for (const w of s.watch) {
            if (w.state === "missing") continue;
            expect(inds.has(w.indicator), `${c.id}/${s.id}: no indicator ${w.indicator}`).toBe(true);
            if (w.item) {
              const items = (inds.get(w.indicator)!.items || []).map((x: any) => x.id);
              expect(items, `${c.id}/${s.id}: ${w.indicator} has no item ${w.item}`).toContain(w.item);
            }
          }
    });

    it("names what put it at the stage it claims", () => {
      for (const c of t.chains) {
        if (!c.stage_reached) continue;
        const s = c.stages.find((x: any) => x.id === c.stage_reached);
        expect(s, `${c.id} claims a stage it does not have`).toBeTruthy();
        expect(s.watch.some((w: any) => w.firing), `${c.id} claims ${c.stage_reached} with nothing firing`).toBe(true);
      }
    });

    it("never claims a stage whose earlier stages are not reached", () => {
      for (const c of t.chains) {
        if (!c.stage_reached) continue;
        const upto = c.stages.slice(0, c.stages.findIndex((x: any) => x.id === c.stage_reached));
        for (const s of upto)
          expect(["reached", "easing"], `${c.id}: ${s.id} is ${s.state} but ${c.stage_reached} is claimed`)
            .toContain(s.state);
      }
    });

    it("explains every stage it cannot watch", () => {
      for (const c of t.chains)
        for (const s of c.stages)
          if (s.state === "unwatched") expect(s.unwatched_why, `${c.id}/${s.id}`).toBeTruthy();
    });

    it("gives every chain a plain sentence and something that would change its mind", () => {
      for (const c of t.chains) {
        expect(c.text?.trim(), `${c.id} text`).toBeTruthy();
        expect(c.depends_on?.length, `${c.id} depends_on`).toBeGreaterThan(0);
        for (const d of c.depends_on) {
          expect(d.assumption?.trim(), `${c.id}/${d.indicator}`).toBeTruthy();
          expect(d.would_change?.trim(), `${c.id}/${d.indicator}`).toBeTruthy();
        }
      }
    });

    it("says in its own note that the levels are judgement and not a forecast", () => {
      expect(t.note).toMatch(/judgement/);
      expect(t.note).toMatch(/not a forecast/);
    });
  });

  describe("the situation summary", () => {
    const s = read("situation.json");

    it("publishes the counts the overview leads with", () => {
      expect(typeof s.counts.worth_a_look).toBe("number");
      expect(typeof s.counts.indicators).toBe("number");
      expect(s.counts.worth_a_look).toBeLessThanOrEqual(s.counts.indicators);
    });

    it("summarises the chains", () => {
      expect(s.transmission).toBeTruthy();
      expect(s.transmission.n_moving).toBeLessThanOrEqual(s.transmission.n_chains);
    });

    it("points every headline at a page that exists", () => {
      const ROUTES = [/^\/indicators(\/|$)/, /^\/threats(\/|$)/, /^\/timelines(\/|$)/, /^\/system(\?|$)/,
                      /^\/briefs(\/|$)/, /^\/about(#|$)/];
      for (const h of s.headline)
        expect(ROUTES.some((r) => r.test(h.link)), `headline link ${h.link}`).toBe(true);
    });
  });

  describe("the source table", () => {
    // About.tsx turns expected_frequency into English from a fixed map. A value the
    // map does not know used to reach the page raw: readers saw "Published
    // three_times_a_year". The map now has a fallback, but a missing entry still
    // reads worse than a written phrase, so every value in use must be named.
    const KNOWN = new Set(["continuous", "business_days", "monthly", "weekly", "daily",
                           "event_driven", "annual", "three_times_a_year", "quarterly", "biweekly"]);

    it("gives every source a frequency the site can say in words", () => {
      for (const src of read("sources.json") ?? [])
        expect(KNOWN.has(src.expected_frequency), `${src.id} frequency ${src.expected_frequency}`).toBe(true);
    });

    it("never leaves a published frequency empty", () => {
      for (const src of read("sources.json") ?? [])
        expect(src.expected_frequency, `${src.id}`).toBeTruthy();
    });
  });

  describe("an ongoing disruption", () => {
    it("is labelled, dated and carries its own live check", () => {
      for (const o of read("ongoing.json").items ?? []) {
        expect(o.evidence_class).toBe("author_judgement");
        expect(o.last_reviewed).toBeTruthy();
        expect(o.note).toContain("Written by the observatory team");
        expect(o.live?.text, `${o.id} live text`).toBeTruthy();
        // The sentence must not assume one unit, as it did when it was written
        // for ships and nothing else.
        if (o.live.state !== "unknown") expect(o.live.unit, `${o.id} live unit`).toBeTruthy();
      }
    });
  });
});
