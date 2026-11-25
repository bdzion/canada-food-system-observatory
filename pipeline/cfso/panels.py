"""Indicators added in release 2, built with one shared engine.

Each indicator is a "panel" of one or more lines (for example five cities'
diesel prices, or four sea lanes). For every line we compare the latest
reading with the same period in each of the past five years, using the same
rule as the rest of the site (outside the full range of those years = worth a
closer look). Prices in Canadian dollars are first converted to the latest
month's dollars with the Consumer Price Index; world prices are compared in
US dollars without that adjustment, and the text says so.

Every builder returns (indicator, series_payload) and never invents a value:
a line without enough past years is reported as such.
"""
from __future__ import annotations

from datetime import date, timedelta

from . import screening
from .core import config, median, pct_change, reference_state, rnd, words
from .indicators import compare_words, long_date, month_label

YEARS = 5


# ------------------------------------------------------------------ helpers

def _num(v: float | None, unit: str) -> str:
    if v is None:
        return "n/a"
    if unit in ("dollars", "CAD"):
        return f"${v:,.2f}"
    if unit == "cents per litre":
        return f"{v:,.1f}¢ a litre"
    if unit.startswith("US$"):
        return f"US${v:,.0f}" if v >= 100 else f"US${v:,.2f}"
    if unit == "percent":
        return f"{v:.1f}%"
    if unit == "index":
        return f"{v:,.1f}"
    if abs(v) >= 1e6:
        return f"{v / 1e6:,.1f} million"
    if abs(v) >= 1e4:
        return f"{v / 1e3:,.0f} thousand"
    return f"{v:,.1f}" if v != int(v) else f"{int(v):,}"


def _shift(t: str, freq: str, k: int) -> list[str]:
    """Dates that count as 'the same period, k years earlier'."""
    d = date.fromisoformat(t)
    # Readings keyed to a calendar month compare with the same month. Grain
    # stocks are surveyed three times a year on fixed dates, so they do too; a
    # 52-week shift would never land on a stored reading.
    if freq in ("monthly", "quarterly", "annual", "three_times_a_year"):
        return [d.replace(year=d.year - k).isoformat()]
    base = d - timedelta(days=364 * k)  # 52 weeks keeps the weekday
    return [(base + timedelta(days=o)).isoformat() for o in (0, -1, 1, -2, 2, -3, 3)]


def _ref(pmap: dict[str, float], t: str, freq: str, cpi: dict | None, target_month: str | None) -> list[float | None]:
    out = []
    for k in range(1, YEARS + 1):
        v = next((pmap[c] for c in _shift(t, freq, k) if pmap.get(c) is not None), None)
        if v is not None and cpi is not None:
            m = _shift(t, freq, k)[0][:7]
            if m in cpi and target_month in cpi:
                v = v * cpi[target_month] / cpi[m]
            else:
                v = None  # never mix dollars of different years
        out.append(v)
    return out


def _cpi(statcan: dict | None) -> dict[str, float] | None:
    if not statcan:
        return None
    return {p["t"][:7]: p["v"] for p in statcan["cpi"]["all_items"]["points"] if p["v"] is not None}


def _trend(pts: list[dict], lag: int) -> dict | None:
    vals = [p for p in pts if p["v"] is not None]
    if len(vals) <= lag:
        return None
    a, b = vals[-1 - lag]["v"], vals[-1]["v"]
    c = pct_change(b, a)
    if c is None:
        return None
    return {"pct": rnd(c, 1), "dir": "flat" if abs(c) < 2 else ("up" if c > 0 else "down"), "from": vals[-1 - lag]["t"]}


def _period(t: str, freq: str) -> str:
    if freq == "monthly":
        return month_label(t)
    if freq == "quarterly":
        d = date.fromisoformat(t)
        return f"the quarter starting {month_label(t)}" if d.month in (1, 4, 7, 10) else month_label(t)
    if freq == "annual":
        return t[:4]
    if freq == "three_times_a_year":
        # The reference date is the month; the reading is the stock at its end.
        return f"the end of {month_label(t)}"
    return long_date(t)


def line_item(line: dict, freq: str, unit: str, cpi: dict | None = None, lag: int = 3, display_from: str | None = None) -> tuple[dict, dict]:
    """Compare one line's latest value with the same period in past years.

    Returns (item for the indicator, line for the chart payload)."""
    pts = [p for p in line["points"] if p.get("t")]
    pmap = {p["t"]: p["v"] for p in pts}
    vals = [p for p in pts if p["v"] is not None]
    item = {"id": line["id"], "label": line["label"], "unit": unit}
    chart = {"id": line["id"], "label": line["label"]}
    if not vals:
        item.update(state="insufficient_data", text="No recent data.")
        chart["points"] = []
        return item, chart
    last = vals[-1]
    t, v = last["t"], last["v"]
    target = t[:7]
    if freq == "annual":
        st = {"state": "observed", "n_years": 0}
    else:
        st = reference_state(v, _ref(pmap, t, freq, cpi, target), config()["baseline"]["min_years"])
    yago = next((pmap[c] for c in _shift(t, freq, 1) if pmap.get(c) is not None), None)
    item.update(st)
    item.update({
        "t": t, "value": v, "period": _period(t, freq), "vs_year_ago_pct": rnd(pct_change(v, yago), 1),
        "trend": _trend(pts, lag), "spark": [rnd(p["v"], 3) for p in vals[-24:]],
        "inflation_adjusted": cpi is not None,
    })
    # Chart: the line itself, plus the range of the same period in the past years
    # (in that period's dollars when inflation-adjusted).
    shown = [p for p in pts if not display_from or p["t"] >= display_from]
    band = []
    if freq != "annual":
        for p in shown:
            ref = [x for x in _ref(pmap, p["t"], freq, cpi, p["t"][:7]) if x is not None]
            band.append({"t": p["t"], "lo": rnd(min(ref), 3) if len(ref) >= 3 else None,
                         "hi": rnd(max(ref), 3) if len(ref) >= 3 else None, "med": rnd(median(ref), 3) if len(ref) >= 3 else None})
    chart["points"] = [{"t": p["t"], "v": rnd(p["v"], 3)} for p in shown]
    chart["band"] = band
    return item, chart


def _side(item: dict, up: str = "higher", down: str = "lower") -> str:
    return up if item.get("direction") == "above" else down


def _summary_state(items: list[dict], main: dict) -> dict:
    out = [i for i in items if i.get("state") == "outside_reference_range_review"]
    if main.get("state") in ("outside_reference_range_review", "within_reference_range", "insufficient_data"):
        state = "outside_reference_range_review" if out else main["state"]
    else:
        state = main.get("state", "observed")
    direction = main.get("direction")
    if state == "outside_reference_range_review" and main.get("state") != "outside_reference_range_review":
        direction = "some"  # the main series is normal but at least one other is not
    return {"state": state, "direction": direction, "n_outside": len(out), "n": len(items)}


def panel(ind: dict, lines: list[dict], *, freq: str, unit: str, main: str, cpi: dict | None = None,
          lag: int = 3, display_from: str | None = None, text, chart_opts: dict | None = None) -> tuple[dict, dict]:
    items, chart_lines = [], []
    for ln in lines:
        it, ch = line_item(ln, freq, ln.get("unit", unit), cpi, lag, display_from)
        # Both screens, per line, so a reader can see which of five cities or
        # four sea lanes is doing something and which is not.
        v, pace = screening.screen_series(ind["id"], ln["points"], freq, it)
        it["screen"] = v
        # A line marked `context` is there for comparison, not as part of what
        # the indicator measures, so it must not decide the indicator's verdict.
        it["context"] = bool(ln.get("context"))
        if pace:
            it["pace"] = pace
        items.append(it)
        chart_lines.append(ch)
    m = next(i for i in items if i["id"] == main)
    head = _summary_state(items, m)
    head.update({k: m.get(k) for k in ("value", "median", "min", "max", "vs_median_pct", "n_years", "trend", "spark", "vs_year_ago_pct")})
    head.update({"unit": unit, "observation_end": m.get("t"), "period_label": (lambda p: p[:1].upper() + p[1:])(m.get("period") or ""),
                 "main": main, "text": text(m, items)})
    # The indicator's rung covers every line in the panel, not only the main
    # one, because the headline state has always done the same: a panel where
    # one of five cities or fifteen foods is outside its range is not "clear".
    # The main series' pace travels with the headline: without it, anything
    # reading the headline alone cannot tell which way the reading is moving.
    if m.get("pace"):
        head["pace"] = m["pace"]
    subject = [i for i in items if not i.get("context")]
    agg = screening.aggregate_verdict(ind["id"], [{"level": i, "pace": i.get("pace", {})} for i in subject])
    agg["main_rung"] = m["screen"]["rung"]
    head["screen"] = agg
    # The headline sentence describes the main series. If the panel as a whole
    # reached a higher rung than the main series did, say so rather than leaving
    # the card's label and its sentence disagreeing.
    if screening.RUNGS.index(agg["rung"]) > screening.RUNGS.index(m["screen"]["rung"]) \
            if agg["rung"] in screening.RUNGS and m["screen"]["rung"] in screening.RUNGS else False:
        c = agg["counts"]
        extra = []
        if c["converging"]:
            extra.append(f"{words(c['converging'])} of the {words(c['n'])} set off both checks")
        elif c["pace"]:
            extra.append(f"{words(c['pace'])} of the {words(c['n'])} {'is' if c['pace'] == 1 else 'are'} moving unusually fast")
        if c["level"] and not c["converging"]:
            extra.append(f"{words(c['level'])} {'is' if c['level'] == 1 else 'are'} outside the range of past years")
        if extra:
            head["text"] = head["text"].rstrip() + " Across all the series in this group, " + " and ".join(extra) + "."
    ind = {**ind, "unit": unit, "frequency": freq, "chart": "lines", "headline": head, "items": items,
           "baseline_rule": ind.get("baseline_rule") or (
               f"Compared with the same {'week' if freq in ('weekly', 'daily') else ('quarter' if freq == 'quarterly' else 'month')} "
               f"in each of the past {YEARS} years (at least {config()['baseline']['min_years']} needed)"
               + (", in today's dollars." if cpi is not None else "."))}
    payload = {"id": ind["id"], "kind": "lines", "freq": freq, "unit": unit, "main": main, "lines": chart_lines,
               "units": {ln["id"]: ln.get("unit", unit) for ln in lines},
               "inflation_adjusted": cpi is not None, **(chart_opts or {})}
    return ind, payload


def _pts(points: list[dict]) -> list[dict]:
    return [{"t": p["t"][:10], "v": p["v"]} for p in points]


def _cmp(m: dict, what: str = "") -> str:
    return compare_words(m, what)


# ------------------------------------------------------------------ PortWatch

def _rolling_daily(days: dict[str, list], idx: int, window: int = 28, step: int = 7) -> list[dict]:
    """Average per day over a trailing window, sampled every `step` days back from the latest day."""
    ds = sorted(days)
    if not ds:
        return []
    end = date.fromisoformat(ds[-1])
    start = date.fromisoformat(ds[0])
    out = []
    t = end
    while t - timedelta(days=window - 1) >= start:
        vals = [days.get((t - timedelta(days=o)).isoformat()) for o in range(window)]
        vals = [x[idx] for x in vals if x is not None and x[idx] is not None]
        out.append({"t": t.isoformat(), "v": round(sum(vals) / len(vals), 2) if len(vals) >= window * 0.8 else None})
        t -= timedelta(days=step)
    out.reverse()
    # Every day in the last year is needed for exact same-week comparisons, so add
    # daily-resolution points for comparison dates (52-week shifts land on sampled days).
    return out


def chokepoints_indicator(ext: dict) -> tuple[dict, dict]:
    cps = ext["chokepoints"]
    lines = [{"id": pid, "label": c["name"], "points": _rolling_daily(c["days"], 0)} for pid, c in cps.items()]

    def text(m, items):
        s = (f"Ships through the Strait of Hormuz averaged {m['value']:.0f} a day over the four weeks to {long_date(m['t'])}. "
             if m.get("value") is not None else "No recent count for the Strait of Hormuz. ")
        if m.get("median"):
            s += f"In the same weeks of the past {words(m['n_years'])} years the typical figure was about {m['median']:.0f} a day. "
        if m.get("state") == "outside_reference_range_review":
            s += (f"That is {'below' if m['direction'] == 'below' else 'above'} the range of every one of those years"
                  + (f", about {abs(m['vs_median_pct']):.0f}% {'below' if m['vs_median_pct'] < 0 else 'above'} the typical level." if m.get("vs_median_pct") is not None else "."))
        else:
            s += _cmp(m)
        others = [i for i in items if i["id"] != m["id"] and i.get("state") == "outside_reference_range_review"]
        if others:
            s += " Also unusual: " + ", ".join(f"{i['label']} ({'more' if i['direction'] == 'above' else 'fewer'} ships than usual)" for i in others) + "."
        return s

    ind = {
        "id": "sea_lanes", "title": "Ships through key sea lanes", "role": "flow",
        "question": "Are ships getting through the narrow sea lanes that carry fuel and fertilizer?",
        "source_ids": ["GL-03"],
        "definition": ("Ships passing through four narrow sea lanes each day: the Strait of Hormuz, the Suez Canal, the Bab el-Mandeb "
                       "Strait at the mouth of the Red Sea, and the Panama Canal. The International Monetary Fund's PortWatch "
                       "estimates the counts from ships' tracking signals."),
        "how_calculated": ("We take the average number of ships a day over the latest four weeks and compare it with the same four "
                           "weeks in each of the past five years."),
        "does_not_show": ("What the ships carry, or whether cargo found another route. Counts are estimates from tracking "
                          "signals, which some ships switch off. Recent weeks can be revised."),
        "scenario": "phosphate",
    }
    return panel(ind, lines, freq="weekly", unit="ships a day", main="chokepoint6", lag=4,
                 display_from=(date.fromisoformat(ext["observation_end"]) - timedelta(days=365 * 3)).isoformat(),
                 text=text, chart_opts={"pick": True, "y_label": "ships a day (four-week average)",
                                        "marks": [{"t": "2026-02-28", "label": "Hormuz closed, 28 Feb 2026"}]})


def ports_indicator(ext: dict) -> tuple[dict, dict]:
    ports = ext["ports"]
    lines = [{"id": pid, "label": p["name"], "points": _rolling_daily(p["days"], 2)} for pid, p in ports.items()]

    def text(m, items):
        s = (f"Ships loaded an estimated {_num(m['value'] * 7, 'tonnes')} tonnes a week at the Port of Vancouver "
             f"in the four weeks to {long_date(m['t'])}. ") if m.get("value") is not None else "No recent estimate for Vancouver. "
        s += _cmp(m)
        others = [i for i in items if i["id"] != m["id"] and i.get("state") == "outside_reference_range_review"]
        if others:
            s += " Elsewhere, unusual: " + ", ".join(f"{i['label']} ({_side(i, 'more', 'less')} than usual)" for i in others) + "."
        return s

    ind = {
        "id": "ports", "title": "Cargo loaded at Canadian ports", "role": "flow",
        "question": "Are Canada's main ports loading cargo at a normal pace?",
        "source_ids": ["GL-03"],
        "definition": ("Estimated tonnes of cargo loaded onto ships each day at Vancouver, Prince Rupert, Montreal, Halifax and "
                       "Thunder Bay. PortWatch estimates the tonnage from ships' tracking signals and how low they sit in the water."),
        "how_calculated": "We average the latest four weeks and compare that with the same four weeks in each of the past five years.",
        "does_not_show": ("What the cargo is. Vancouver and Prince Rupert load grain, potash, coal and containers together. "
                          "Thunder Bay closes for winter. Use the grain-shipments indicator for grain."),
        "scenario": "rail",
    }
    return panel(ind, lines, freq="weekly", unit="tonnes a day", main="port1350", lag=4,
                 display_from=(date.fromisoformat(ext["observation_end"]) - timedelta(days=365 * 3)).isoformat(),
                 text=text, chart_opts={"pick": True, "y_label": "tonnes loaded a day (four-week average)"})


# ------------------------------------------------------------------ World Bank

def world_fertilizer_indicator(ext: dict) -> tuple[dict, dict]:
    p = ext["prices"]
    lines = [{"id": "fertilizers", "label": "World fertilizer price index", "unit": "index", "points": _pts(ext["indices"]["fertilizers"]["points"])}]
    lines += [{"id": k, "label": p[k]["label"], "unit": "US$ per tonne", "points": _pts(p[k]["points"])} for k in ("dap", "urea", "potash", "phosphate_rock") if k in p]

    def text(m, items):
        by = {i["id"]: i for i in items}
        s = f"In {month_label(m['t'])}, the World Bank's fertilizer price index stood at {m['value']:.0f} (2010 = 100)"
        if m.get("vs_year_ago_pct") is not None:
            s += f", {abs(m['vs_year_ago_pct']):.0f}% {'higher' if m['vs_year_ago_pct'] > 0 else 'lower'} than a year earlier"
        s += ". "
        parts = [f"{by[k]['label'].split(' (')[0]} {_num(by[k]['value'], 'US$')} a tonne" for k in ("dap", "urea") if k in by and by[k].get("value")]
        if parts:
            s += "Prices: " + "; ".join(parts) + ". "
        s += _cmp(m, ", in US dollars without adjusting for inflation")
        return s

    ind = {
        "id": "world_fertilizer", "title": "World fertilizer prices", "role": "market",
        "question": "Is fertilizer getting more expensive on world markets?",
        "source_ids": ["GL-04"],
        "definition": ("Monthly world prices for phosphate fertilizer (DAP), nitrogen fertilizer (urea), potash and phosphate rock, "
                       "and the World Bank's index of fertilizer prices, from the World Bank's monthly commodity price data."),
        "how_calculated": "We compare the latest month with the same month in each of the past five years, in US dollars.",
        "does_not_show": ("What Canadian farmers pay. That depends on the exchange rate, freight, and when farmers bought. "
                          "See the farm input price index for prices paid in Canada."),
        "scenario": "phosphate",
    }
    return panel(ind, lines, freq="monthly", unit="index", main="fertilizers", display_from="2019-01-01", text=text,
                 chart_opts={"pick": True, "marks": [{"t": "2022-02-01", "label": "Russia invades Ukraine"}, {"t": "2026-03-01", "label": "Hormuz closed"}]})


def world_food_energy_indicator(ext: dict) -> tuple[dict, dict]:
    p, ix = ext["prices"], ext["indices"]
    lines = [{"id": "food", "label": "World food price index", "unit": "index", "points": _pts(ix["food"]["points"])},
             {"id": "energy", "label": "World energy price index", "unit": "index", "points": _pts(ix["energy"]["points"])}]
    lines += [{"id": k, "label": p[k]["label"], "unit": p[k]["unit"], "points": _pts(p[k]["points"])} for k in ("crude", "wheat", "maize") if k in p]

    def text(m, items):
        by = {i["id"]: i for i in items}
        s = f"In {month_label(m['t'])}, the World Bank's food price index stood at {m['value']:.0f} (2010 = 100)"
        if m.get("vs_year_ago_pct") is not None:
            s += f", {abs(m['vs_year_ago_pct']):.0f}% {'higher' if m['vs_year_ago_pct'] > 0 else 'lower'} than a year earlier"
        s += ". "
        e = by.get("energy")
        if e and e.get("vs_year_ago_pct") is not None:
            s += f"Energy prices were {abs(e['vs_year_ago_pct']):.0f}% {'higher' if e['vs_year_ago_pct'] > 0 else 'lower'} than a year earlier. "
        s += _cmp(m, ", in US dollars without adjusting for inflation")
        return s

    ind = {
        "id": "world_prices", "title": "World food and energy prices", "role": "market",
        "question": "Are world prices for food and fuel unusually high?",
        "source_ids": ["GL-04"],
        "definition": ("The World Bank's monthly indices of world food and energy prices, with crude oil, wheat and maize prices. "
                       "Canada sells wheat at world prices and buys fuel and much of its food at world prices."),
        "how_calculated": "We compare the latest month with the same month in each of the past five years, in US dollars.",
        "does_not_show": ("Prices in Canadian stores, which follow world prices with a lag of months and also reflect wages, "
                          "transport, the exchange rate and competition."),
        "scenario": "",
    }
    return panel(ind, lines, freq="monthly", unit="index", main="food", display_from="2019-01-01", text=text,
                 chart_opts={"pick": True, "marks": [{"t": "2022-02-01", "label": "Russia invades Ukraine"}, {"t": "2026-03-01", "label": "Hormuz closed"}]})


# ------------------------------------------------------------------ Statistics Canada (CA-08)

def _avg_line(series: dict, keys: list[str], label: str, lid: str) -> dict:
    by = {}
    for k in keys:
        for p in series[k]["points"]:
            if p["v"] is not None:
                by.setdefault(p["t"][:10], []).append(p["v"])
    return {"id": lid, "label": label, "points": [{"t": t, "v": round(sum(v) / len(v), 2)} for t, v in sorted(by.items()) if len(v) == len(keys)]}


def diesel_indicator(ext: dict, statcan: dict | None) -> tuple[dict, dict]:
    s = ext["groups"]["diesel"]["series"]
    lines = [_avg_line(s, list(s), "Average of five cities", "avg")]
    lines += [{"id": k, "label": v["label"], "points": _pts(v["points"])} for k, v in s.items()]

    def text(m, items):
        out = (f"Diesel at self-serve pumps averaged {m['value']:.1f} cents a litre across five cities in {month_label(m['t'])}"
               + (f", {abs(m['vs_year_ago_pct']):.0f}% {'more' if m['vs_year_ago_pct'] > 0 else 'less'} than a year earlier. " if m.get("vs_year_ago_pct") is not None else ". "))
        return out + _cmp(m, ", after allowing for inflation")

    ind = {
        "id": "diesel", "title": "Diesel prices", "role": "market",
        "question": "Is diesel, which runs tractors, trucks and trains, unusually expensive?",
        "source_ids": ["CA-08", "CA-04"],
        "definition": ("Average retail price of diesel at self-serve stations in Montréal, Toronto, Regina, Calgary and Vancouver, "
                       "from Statistics Canada. Statistics Canada does not publish a national average for diesel."),
        "how_calculated": "We average the five cities and compare the latest month with the same month in each of the past five years, in today's dollars.",
        "does_not_show": "Farm fuel, which is often bought in bulk and taxed differently, or the price paid by large trucking firms on contract.",
        "scenario": "rail",
    }
    return panel(ind, lines, freq="monthly", unit="cents per litre", main="avg", cpi=_cpi(statcan), display_from="2019-01-01", text=text,
                 chart_opts={"pick": True})


def farm_inputs_indicator(ext: dict) -> tuple[dict, dict]:
    s = ext["groups"]["farm_inputs"]["series"]
    lines = [{"id": k, "label": v["label"], "points": _pts(v["points"])} for k, v in s.items()]

    def text(m, items):
        by = {i["id"]: i for i in items}
        f = by.get("fertilizer", {})
        s_ = f"In {_period(m['t'], 'quarterly')}, the prices Canadian farmers paid for all inputs stood at {m['value']:.0f} on Statistics Canada's index (2020 = 100)"
        if m.get("vs_year_ago_pct") is not None:
            s_ += f", {abs(m['vs_year_ago_pct']):.0f}% {'higher' if m['vs_year_ago_pct'] > 0 else 'lower'} than a year earlier"
        s_ += ". "
        if f.get("vs_year_ago_pct") is not None:
            s_ += f"Fertilizer alone was {abs(f['vs_year_ago_pct']):.0f}% {'higher' if f['vs_year_ago_pct'] > 0 else 'lower'}. "
        return s_ + _cmp(m)

    ind = {
        "id": "farm_inputs", "title": "What farmers pay for inputs", "role": "buffer",
        "question": "Are the costs of growing food rising?",
        "source_ids": ["CA-08"],
        "definition": "Statistics Canada's farm input price index: what Canadian farmers pay for fertilizer, fuel, seed, feed and other inputs. Published every three months.",
        "how_calculated": "We compare the latest quarter with the same quarter in each of the past five years. The index is not adjusted for inflation.",
        "does_not_show": "Farm incomes or crop prices. Higher costs squeeze farmers most when crop prices are falling at the same time.",
        "scenario": "phosphate",
    }
    return panel(ind, lines, freq="quarterly", unit="index", main="total", lag=1, display_from="2019-01-01", text=text,
                 chart_opts={"pick": False, "y_label": "index (2020 = 100)"})


def retail_indicator(ext: dict, statcan: dict | None) -> tuple[dict, dict]:
    s = ext["groups"]["retail"]["series"]
    lines = [{"id": k, "label": v["label"], "points": _pts(v["points"])} for k, v in s.items()]
    cpi = _cpi(statcan)

    def text(m, items):
        up = [i for i in items if i.get("direction") == "above"]
        dn = [i for i in items if i.get("direction") == "below"]
        last = max((i["t"] for i in items if i.get("t")), default=None)
        s_ = (f"We follow {len(items)} everyday foods in Canadian stores. In {month_label(last)}, "
              f"{words(len(up))} cost more and {words(len(dn))} cost less than in the same month of any of the past five years, after allowing for inflation.")
        if up:
            s_ += " Higher than usual: " + ", ".join(i["label"].split(",")[0].lower() for i in up[:6]) + "."
        return s_

    ind = {
        "id": "store_prices", "title": "Store prices for everyday foods", "role": "access",
        "question": "Are everyday foods unusually expensive in stores?",
        "source_ids": ["CA-08", "CA-04"],
        "definition": "Average monthly shelf prices across Canada for 15 everyday foods, from Statistics Canada's retail price survey.",
        "how_calculated": "For each food we compare the latest month with the same month in each of the past five years, in today's dollars.",
        "does_not_show": "Sale prices, store brands versus name brands, or prices in remote and northern communities, which are often far higher.",
        "scenario": "",
    }
    return panel(ind, lines, freq="monthly", unit="dollars", main="milk", cpi=cpi, display_from="2020-01-01", text=text,
                 chart_opts={"multiples": True})


def rail_indicator(ext: dict) -> tuple[dict, dict]:
    s = ext["groups"]["rail"]["series"]
    grain = _avg_line(s, ["wheat", "grains", "canola"], "Grain and canola", "grain")
    grain["points"] = [{"t": p["t"], "v": round(p["v"] * 3)} for p in grain["points"]]  # sum of three, not average
    lines = [grain] + [{"id": k, "label": s[k]["label"], "points": _pts(s[k]["points"])} for k in ("potash", "fertilizers", "total")]

    def text(m, items):
        return (f"Railways carried {_num(m['value'], 'tonnes')} tonnes of wheat, other grains and canola in {month_label(m['t'])}. "
                + _cmp(m))

    ind = {
        "id": "rail_freight", "title": "Grain and fertilizer moved by rail", "role": "flow",
        "question": "Are trains moving grain and fertilizer at a normal pace?",
        "source_ids": ["CA-08"],
        "definition": "Tonnes of grain, canola, potash and other fertilizer loaded onto Canadian railways each month, from Statistics Canada.",
        "how_calculated": "We compare the latest month with the same month in each of the past five years.",
        "does_not_show": "Delays within a month, or grain and fertilizer moved by truck. Figures arrive about two months after the month ends.",
        "scenario": "rail",
    }
    return panel(ind, lines, freq="monthly", unit="tonnes", main="grain", lag=3, display_from="2019-01-01", text=text,
                 chart_opts={"pick": True})


def stoppages_indicator(ext: dict) -> tuple[dict, dict]:
    s = ext["groups"]["stoppages"]["series"]
    lines = [{"id": k, "label": s[k]["label"], "points": _pts(s[k]["points"])} for k in ("all", "transport", "manufacturing")]

    def text(m, items):
        t = next((i for i in items if i["id"] == "transport"), {})
        out = f"There were {_num(m['value'], 'n')} strikes and lockouts under way in Canada in {month_label(m['t'])}"
        if t.get("value") is not None:
            out += f", {words(int(t['value']))} of them in transportation"
        return out + ". " + _cmp(m)

    ind = {
        "id": "work_stoppages", "title": "Strikes and lockouts", "role": "signal",
        "question": "Are strikes or lockouts likely to stop food or farm inputs from moving?",
        "source_ids": ["CA-08"],
        "definition": "The number of strikes and lockouts under way each month, from Employment and Social Development Canada's records as published by Statistics Canada.",
        "how_calculated": "We compare the latest month with the same month in each of the past five years.",
        "does_not_show": ("Which employers are involved. A single stoppage at a railway or port can matter more than dozens elsewhere. "
                          "Figures arrive about three months late; watch the news notices for current disputes."),
        "scenario": "rail",
    }
    return panel(ind, lines, freq="monthly", unit="work stoppages", main="all", display_from="2019-01-01", text=text,
                 chart_opts={"pick": True})


def provinces_indicator(ext: dict, statcan: dict | None) -> tuple[dict, dict]:
    s = ext["groups"]["provinces_food_cpi"]["series"]
    rows = []
    for k, v in s.items():
        pts = {p["t"][:7]: p["v"] for p in v["points"] if p["v"] is not None}
        last = max(pts)
        y, m = last.split("-")
        prev = pts.get(f"{int(y) - 1}-{m}")
        rows.append({"id": k, "label": v["label"], "t": last + "-01", "yoy": rnd(pct_change(pts[last], prev), 1)})
    nat = None
    if statcan:
        fp = {p["t"][:7]: p["v"] for p in statcan["cpi"]["food_stores"]["points"] if p["v"] is not None}
        last = max(fp)
        y, m = last.split("-")
        nat = rnd(pct_change(fp[last], fp.get(f"{int(y) - 1}-{m}")), 1)
    rows = [r for r in rows if r["yoy"] is not None]
    rows.sort(key=lambda r: -r["yoy"])
    hi, lo = rows[0], rows[-1]
    t = rows[0]["t"]
    text = (f"In {month_label(t)}, grocery prices were up most in {hi['label']} ({hi['yoy']:+.1f}% on a year earlier) "
            f"and least in {lo['label']} ({lo['yoy']:+.1f}%)" + (f". The national figure was {nat:+.1f}%." if nat is not None else "."))
    ind = {
        "id": "provincial_prices", "title": "Grocery price rises by province", "role": "access",
        "question": "Are grocery prices rising faster in some provinces than others?",
        "unit": "percent change", "source_ids": ["CA-08", "CA-04"], "frequency": "monthly",
        "definition": "The 12-month change in the Consumer Price Index for food bought in stores, for each province, from Statistics Canada.",
        "how_calculated": "For each province we compare the latest month with the same month a year earlier.",
        "does_not_show": "Price levels (a smaller rise can still leave prices higher), or the territories, which Statistics Canada publishes for capital cities only.",
        "scenario": "", "chart": "bars",
        "headline": {"state": "observed", "observation_end": t, "period_label": month_label(t), "value": nat, "unit": "percent", "text": text,
                     "screen": screening.verdict("provincial_prices", {}, {}),
                     "spread": rnd(hi["yoy"] - lo["yoy"], 1)},
        "baseline_rule": "Compared with the same month one year earlier.",
    }
    return ind, {"id": "provincial_prices", "kind": "bars", "unit": "% change from a year earlier", "rows": rows,
                 "ref": {"v": nat, "label": "Canada"} if nat is not None else None}


def food_insecurity_indicator(ext: dict) -> tuple[dict, dict]:
    s = ext["groups"]["food_insecurity"]["series"]
    lines = [{"id": k, "label": s[k]["label"], "unit": "percent", "points": _pts(s[k]["points"])} for k in ("any", "mod_sev", "children")]

    def text(m, items):
        by = {i["id"]: i for i in items}
        c = by.get("children", {})
        first = next((p for p in lines[0]["points"] if p["v"] is not None), None)
        out = f"In {m['t'][:4]}, {m['value']:.1f}% of people in the ten provinces lived in a household that struggled to afford food"
        if first and first["t"][:4] != m["t"][:4]:
            out += f", up from {first['v']:.1f}% in {first['t'][:4]}" if m["value"] > first["v"] else f", compared with {first['v']:.1f}% in {first['t'][:4]}"
        out += "."
        if c.get("value") is not None:
            out += f" Among children it was {c['value']:.1f}%."
        return out + " This survey is published once a year, more than a year after the fact."

    ind = {
        "id": "food_insecurity", "title": "People who struggle to afford food", "role": "access",
        "question": "How many people live in households that cannot reliably afford enough food?",
        "source_ids": ["CA-08"],
        "definition": ("The share of people living in households that reported food insecurity (worry about running out of food, eating less, "
                       "or going without because of money) in Statistics Canada's Canadian Income Survey."),
        "how_calculated": "We show the published shares for each survey year. There is no 'unusual' test: the series is too short and annual.",
        "does_not_show": "This year's situation, the territories, or people living on reserves, in institutions or without housing.",
        "scenario": "",
        "baseline_rule": "Shown as published, year by year.",
    }
    return panel(ind, lines, freq="annual", unit="percent", main="any", lag=1, text=text, chart_opts={"y_label": "% of people"})


def exchange_indicator(ext: dict) -> tuple[dict, dict]:
    s = ext["series"]
    lines = [{"id": k, "label": v["label"], "unit": v["unit"], "points": [{"t": p["t"], "v": p["v"]} for p in v["monthly"]]} for k, v in s.items()]

    def text(m, items):
        from .core import utc_now
        so_far = "so far in" if m["t"][:7] == utc_now().strftime("%Y-%m") else "in"
        out = f"One US dollar cost {_num(m['value'], 'CAD')} Canadian on average {so_far} {month_label(m['t'])}"
        if m.get("vs_year_ago_pct") is not None:
            out += f", {abs(m['vs_year_ago_pct']):.1f}% {'more' if m['vs_year_ago_pct'] > 0 else 'less'} than a year earlier"
        out += ". A weaker Canadian dollar makes imported food and farm inputs dearer. "
        return out + _cmp(m)

    ind = {
        "id": "exchange_rate", "title": "The Canadian dollar", "role": "market",
        "question": "Is a weak Canadian dollar making imported food dearer?",
        "source_ids": ["CA-10"],
        "definition": ("How many Canadian dollars one US dollar and one Mexican peso cost, as a monthly average of the Bank of Canada's daily rates. "
                       "Most imported fruit and vegetables come from the United States and Mexico, and fertilizer and fuel are priced in US dollars."),
        "how_calculated": "We compare the latest month's average with the same month in each of the past five years. A higher number means a weaker Canadian dollar.",
        "does_not_show": "How quickly importers pass on changes, which can take months, or the effect of hedging contracts.",
        "scenario": "",
    }
    return panel(ind, lines, freq="monthly", unit="CAD", main="FXUSDCAD", display_from="2019-01-01", text=text,
                 chart_opts={"pick": True})


# ------------------------------------------------------------------ buffers (release 3)

def farm_grain_stocks_indicator(ext: dict) -> tuple[dict, dict]:
    """Grain stocks including the share held on farms (StatCan 32-10-0013).

    The Grain Commission figures cover licensed commercial elevators and port
    terminals only, which is a small part of the total for most of the year.
    This is the only reading the site has of the whole buffer.
    """
    s = ext["series"]
    # on_farms and commercial add up to total, so they are shown as a breakdown
    # rather than counted again in the verdict. Canola is its own buffer.
    order = [("total", False), ("on_farms", True), ("commercial", True), ("canola", False)]
    lines = [{"id": k, "label": s[k]["label"], "unit": "thousand tonnes", "points": _pts(s[k]["points"]), "context": ctx}
             for k, ctx in order if k in s]

    def text(m, items):
        by = {i["id"]: i for i in items}
        farm, comm = by.get("on_farms", {}), by.get("commercial", {})
        out = (f"At the end of {month_label(m['t'])}, Canada held {_num(m['value'] * 1000, 'tonnes')} tonnes of wheat "
               "in total, counting grain on farms as well as in elevators and at ports. ")
        if farm.get("value") is not None and m.get("value"):
            share = 100 * farm["value"] / m["value"]
            out += f"About {share:.0f}% of it was still on farms. "
        if comm.get("value") is not None:
            out += f"Elevators and port terminals held {_num(comm['value'] * 1000, 'tonnes')} tonnes. "
        return out + _cmp(m)

    ind = {
        "id": "farm_grain_stocks", "title": "All grain in the country, farms included", "role": "buffer",
        "question": "How much grain does Canada actually hold, counting what is still on farms?",
        "source_ids": ["CA-11"],
        "definition": ("Wheat and canola held in Canada at the end of each stocks period, from Statistics Canada's survey of "
                       "grain supply and disposition. Unlike the weekly Grain Commission figures, this counts grain still "
                       "stored on farms, which is usually most of it."),
        "how_calculated": ("We show the published totals and compare each one with the same stocks date in earlier years. "
                           "Stocks are measured three times a year, at 31 December, 31 March and 31 July."),
        "does_not_show": ("A developing disruption. Three readings a year, published about ten weeks later, can show how big "
                          "the buffer is but not that it is being used up. Grain in transit is counted in neither place. "
                          "Read it alongside the weekly Grain Commission figures, which are timelier but narrower."),
        "scenario": "rail",
    }
    return panel(ind, lines, freq="three_times_a_year", unit="thousand tonnes", main="total", lag=1, text=text,
                 chart_opts={"pick": True, "y_label": "thousand tonnes held"})


def food_mfg_indicator(ext: dict) -> tuple[dict, dict]:
    """Food manufacturing inventories (StatCan 16-10-0047).

    The processing link had no buffer reading at all: only food recalls, which
    is a safety signal. This is how much stock processors hold against what
    they are shipping.
    """
    s = ext["series"]
    # all_mfg is every industry together, shown only so a reader can see whether
    # food is unusual or manufacturing as a whole is. It is context, so it does
    # not count toward this indicator's verdict.
    order = [("inv_to_sales", False), ("finished_to_sales", False), ("all_mfg", True)]
    lines = [{"id": k, "label": s[k]["label"], "unit": "ratio", "points": _pts(s[k]["points"]), "context": ctx}
             for k, ctx in order if k in s]

    def text(m, items):
        by = {i["id"]: i for i in items}
        fin, allm = by.get("finished_to_sales", {}), by.get("all_mfg", {})
        out = (f"In {month_label(m['t'])}, food processors held about ${m['value']:.2f} of stock for every dollar of food "
               "they shipped that month. ")
        if fin.get("value") is not None:
            out += f"Of that, ${fin['value']:.2f} was finished food ready to ship. "
        if allm.get("value") is not None:
            out += f"Across all manufacturing the figure was ${allm['value']:.2f}. "
        return out + _cmp(m)

    ind = {
        "id": "food_mfg_inventory", "title": "Stock held by food processors", "role": "buffer",
        "question": "How much food stock do processors hold against what they are shipping?",
        "source_ids": ["CA-12"],
        "definition": ("The value of stock held by Canadian food manufacturers at the end of each month, divided by the value "
                       "of what they shipped that month, from Statistics Canada's monthly survey of manufacturing. A higher "
                       "figure means more stock sitting between farms and shops."),
        "how_calculated": ("We use the figures that are not adjusted for the season, and compare each month with the same "
                           "month in each of the past five years, because stock levels follow the calendar."),
        "does_not_show": ("Days of supply. These are dollars, not tonnes, so the figure also moves when prices move. It covers "
                          "the whole country and the whole industry, so it says nothing about one plant, one product or one "
                          "region, and a disruption lasting a week may not show up in a month-end figure at all."),
        "scenario": "cyber",
    }
    return panel(ind, lines, freq="monthly", unit="ratio", main="inv_to_sales", display_from="2019-01-01", text=text,
                 chart_opts={"pick": True, "y_label": "stock held per dollar shipped"})


# ------------------------------------------------------------------ drought

def prairie_drought_indicator(ext: dict) -> tuple[dict, dict]:
    months = ext["months"]
    lines = []
    for z, label in ext["zones"].items():
        lines.append({"id": z, "label": label, "unit": "percent",
                      "points": [{"t": m + "-01", "v": months[m].get(z, {}).get("D1")} for m in sorted(months)]})

    def text(m, items):
        worst = max((i for i in items if i.get("value") is not None), key=lambda i: i["value"], default=None)
        parts = [f"{i['value']:.0f}% of southern {i['label'].split(' (')[0]}" for i in items if i.get("value") is not None]
        out = f"At the end of {month_label(m['t'])}, " + (", ".join(parts[:-1]) + " and " + parts[-1] if len(parts) > 1 else "".join(parts))
        out += f" {'were' if len(parts) > 1 else 'was'} in moderate drought or worse. "
        if worst is not None and worst.get("state") != "insufficient_data":
            c = _cmp(worst)
            out += f"In {worst['label'].split(' (')[0]}, the province with the most drought, " + c[0].lower() + c[1:]
        else:
            out += "The monitor's online maps start in 2023, so we cannot yet say whether this is unusual."
        return out

    ind = {
        "id": "prairie_drought", "title": "Drought on the Prairies", "role": "buffer",
        "question": "How much Prairie farmland is in drought?",
        "source_ids": ["CA-09"],
        "definition": ("The share of the farming south of Alberta, Saskatchewan and Manitoba in moderate drought or worse (categories D1 to D4) "
                       "on Agriculture and Agri-Food Canada's Canadian Drought Monitor, published monthly."),
        "how_calculated": ("We overlay the monitor's drought areas on three boxes covering each province south of 54° north, and measure the "
                           "share of each box in drought using an equal-area map projection. We compare it with the same month in earlier years."),
        "does_not_show": ("Crop yields. Drought late in the season matters less than drought at seeding or flowering. The boxes include "
                          "some forest, lakes and towns, so the shares are approximate."),
        "scenario": "drought",
    }
    return panel(ind, lines, freq="monthly", unit="percent", main="SK", lag=1, text=text,
                 chart_opts={"y_label": "% of area in moderate drought or worse"})


def us_drought_indicator(ext: dict) -> tuple[dict, dict]:
    lines = [{"id": k, "label": v["label"], "unit": "percent",
              "points": [{"t": w["t"], "v": w["d1"]} for w in v["weeks"]]} for k, v in ext["states"].items()]

    def text(m, items):
        out = f"In the week of {long_date(m['t'])}, "
        out += "; ".join(f"{i['value']:.0f}% of {i['label']}" for i in items if i.get("value") is not None)
        out += " was in moderate drought or worse. "
        flagged = [i for i in items if i.get("state") == "outside_reference_range_review"]
        if flagged:
            out += "Unusual for the time of year: " + ", ".join(f"{i['label']} ({'more' if i['direction'] == 'above' else 'less'} drought than in any of the past five years)" for i in flagged) + "."
        else:
            out += "All four states are within their range for this time of year over the past five years."
        return out

    st = config()["us_growing"]["states"]
    ind = {
        "id": "us_drought", "title": "Drought where imported produce grows", "role": "signal",
        "question": "Is drought hitting the US states that grow much of Canada's imported fruit and vegetables?",
        "source_ids": ["GL-05"],
        "definition": ("The share of California, Arizona, Florida and Washington in moderate drought or worse, from the weekly US Drought Monitor. "
                       + " ".join(f"{v['label']}: {v['why']}." for v in st.values())),
        "how_calculated": "We compare the latest week with the same week in each of the past five years.",
        "does_not_show": "Whether irrigated farms have enough water, which depends on reservoirs and water rights more than on rainfall.",
        "scenario": "drought",
    }
    return panel(ind, lines, freq="weekly", unit="percent", main="CA", lag=4,
                 display_from=(date.fromisoformat(ext["observation_end"]) - timedelta(days=365 * 4)).isoformat(),
                 text=text, chart_opts={"pick": True, "y_label": "% of state in moderate drought or worse"})
