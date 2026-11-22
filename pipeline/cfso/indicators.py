"""Turn source extracts into indicators.

Each builder returns (indicator, series_payload). An indicator carries its
definition, a plain-language headline, the comparison rule it used and its
limits. Nothing here invents a value: if a comparison cannot be made, the
state is "insufficient_data" and the text says so.
"""
from __future__ import annotations

from collections import defaultdict
from datetime import date, timedelta

from .core import config, median, pct_change, reference_state, rnd, words

PLACE = {"US": "the United States", "MX": "Mexico", "CR": "Costa Rica", "CA": "Canada", "ON": "Ontario", "QC": "Quebec", "BC": "British Columbia"}
MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August",
          "September", "October", "November", "December"]


def long_date(ds: str | None) -> str:
    if not ds:
        return "unknown date"
    d = date.fromisoformat(ds[:10])
    return f"{d.day} {MONTHS[d.month - 1]} {d.year}"


def month_label(ds: str) -> str:
    d = date.fromisoformat(ds[:10])
    return f"{MONTHS[d.month - 1]} {d.year}"


def fmt_num(v: float | None, nd: int = 0) -> str:
    if v is None:
        return "n/a"
    return f"{v:,.{nd}f}"


def compare_words(st: dict, what: str = "") -> str:
    """Plain sentence comparing one reading with the same time in past years."""
    n = st.get("n_years", 0)
    if st["state"] == "insufficient_data":
        return "We do not have enough past years of comparable data to say whether this is normal."
    pct = st.get("vs_median_pct")
    typical = ""
    if pct is not None and abs(pct) >= 1:
        typical = f" It is about {abs(pct):.0f}% {'above' if pct > 0 else 'below'} the typical level."
    if st["direction"] == "within":
        return f"That is normal for this time of year: it is within the range of the past {words(n)} years{what}.{typical}"
    side = "higher" if st["direction"] == "above" else "lower"
    return (f"That is {side} than at this time of year in any of the past {words(n)} years{what}.{typical} "
            "Worth watching. One unusual reading does not mean a crisis.")


# ------------------------------------------------------------------ grain (CGC)

def _crop_week_table(ext: dict, measure: str, rolling: int = 1) -> dict[str, dict[int, float]]:
    """{crop_year: {week: value}} with an optional trailing rolling sum."""
    out = {}
    for cy, weeks in ext["crop_years"].items():
        vals = {int(w): rec.get(measure) for w, rec in weeks.items()}
        if rolling > 1:
            rv = {}
            for w in vals:
                window = [vals.get(k) for k in range(w - rolling + 1, w + 1)]
                rv[w] = None if any(x is None for x in window) or w < rolling else round(sum(window), 1)
            vals = rv
        out[cy] = vals
    return out


def grain_indicator(ext: dict, measure: str, *, ind_id: str, title: str, role: str, question: str,
                    definition: str, how: str, not_show: str, sentence: str, rolling: int = 1,
                    scenario: str = "rail", sub: dict[str, str] | None = None) -> tuple[dict, dict]:
    cfg = config()["baseline"]
    cur = ext["current_crop_year"]
    y0 = int(cur[:4])
    prior = [f"{y0 - k}-{y0 - k + 1}" for k in range(1, cfg["years"] + 1)]
    measures = {measure: title, **(sub or {})}
    tables = {m: _crop_week_table(ext, m, rolling) for m in measures}
    weeks_cur = ext["crop_years"][cur]
    latest_w = max((int(w) for w, r in weeks_cur.items() if tables[measure][cur].get(int(w)) is not None), default=None)
    series = []
    for m, label in measures.items():
        t = tables[m]
        rows = []
        for w in range(1, 53):
            ref = [t.get(cy, {}).get(w) for cy in prior]
            ref_v = [r for r in ref if r is not None]
            wk = weeks_cur.get(str(w), {})
            rows.append({
                "w": w,
                "t": wk.get("week_end"),
                "v": t[cur].get(w),
                "prev": t.get(prior[0], {}).get(w),
                "med": rnd(median(ref_v), 1),
                "lo": rnd(min(ref_v), 1) if ref_v else None,
                "hi": rnd(max(ref_v), 1) if ref_v else None,
                "n": len(ref_v),
            })
        series.append({"id": m, "label": label, "rows": rows})
    headline = {"state": "insufficient_data", "text": "No data yet for this crop year."}
    if latest_w:
        v = tables[measure][cur][latest_w]
        ref = [tables[measure].get(cy, {}).get(latest_w) for cy in prior]
        st = reference_state(v, ref, cfg["min_years"])
        prev = tables[measure].get(prior[0], {}).get(latest_w)
        wend = weeks_cur[str(latest_w)]["week_end"]
        span = f"the four weeks to {long_date(wend)}" if rolling == 4 else (f"the {rolling} weeks to {long_date(wend)}" if rolling > 1 else f"the week ending {long_date(wend)}")
        headline = {
            **st,
            "value": v, "unit": "thousand tonnes",
            "period_label": (f"Four weeks to {long_date(wend)}" if rolling > 1 else f"Week ending {long_date(wend)}"),
            "observation_end": wend,
            "prev_year_value": prev,
            "vs_prev_year_pct": rnd(pct_change(v, prev), 1),
            "text": sentence.format(v=fmt_num(v / 1000, 2), span=span) + " " + compare_words(st),
        }
    ind = {
        "id": ind_id, "title": title, "role": role, "question": question, "unit": "thousand tonnes",
        "source_ids": ["CA-05"], "frequency": "weekly", "definition": definition, "how_calculated": how,
        "does_not_show": not_show, "scenario": scenario, "chart": "cropweek", "headline": headline,
        "baseline_rule": f"Compared with the same week in each of the past {cfg['years']} crop years (at least {cfg['min_years']} needed). A crop year runs from August to July.",
    }
    return ind, {"id": ind_id, "kind": "cropweek", "crop_year": cur, "prior_crop_years": prior,
                 "unit": "thousand tonnes", "series": series}


# ------------------------------------------------------------------ produce (InfoHort)

def _cpi_monthly(statcan: dict | None) -> dict[str, float]:
    if not statcan:
        return {}
    pts = statcan["cpi"]["all_items"]["points"]
    return {p["t"][:7]: p["v"] for p in pts if p["v"] is not None}


def _deflator(cpi: dict[str, float], iso_year: int, iso_week: int, ref_month: str) -> float | None:
    """Ratio that converts a price from that week into reference-month dollars."""
    d = date.fromisocalendar(iso_year, iso_week, 4)
    m = f"{d.year}-{d.month:02d}"
    if m not in cpi or ref_month not in cpi:
        return None
    return cpi[ref_month] / cpi[m]


def produce_indicator(ext: dict, statcan: dict | None) -> tuple[dict, dict]:
    cfg = config()["baseline"]
    cpi = _cpi_monthly(statcan)
    ref_month = max(cpi) if cpi else None
    items, payload = [], []
    counts = defaultdict(int)
    for sid, s in ext["series"].items():
        pts = s["points"]
        if not pts:
            items.append({"id": sid, "label": s["label"], "state": "insufficient_data", "text": "No recent prices."})
            continue
        last = date.fromisoformat(pts[-1]["t"])
        ly, lw, _ = last.isocalendar()
        week_pts = [p for p in pts if date.fromisoformat(p["t"]).isocalendar()[:2] == (ly, lw)]
        cur = sum(p["mid"] for p in week_pts) / len(week_pts)
        four = [p for p in pts if last - timedelta(days=34) <= date.fromisoformat(p["t"]) <= last - timedelta(days=28)]
        ago4 = four[-1]["mid"] if four else None
        hist = ext.get("history_weekly", {}).get(sid, {})
        ref, ref_years = [], []
        for k in range(1, cfg["years"] + 1):
            y = ly - k
            v = hist.get(str(y), {}).get(str(lw))
            if v is None:
                continue
            f = _deflator(cpi, y, lw, ref_month) if ref_month else None
            if f is None:
                continue  # without a deflator the comparison would mix dollars of different years
            ref.append(round(v * f, 2))
            ref_years.append(y)
        st = reference_state(cur, ref, cfg["min_years"])
        counts[st["state"] + ("_" + st.get("direction", "") if st["state"].startswith("outside") else "")] += 1
        rng = f"${pts[-1]['lo']:.2f}" if pts[-1]["lo"] == pts[-1]["hi"] else f"${pts[-1]['lo']:.2f}–${pts[-1]['hi']:.2f}"
        items.append({
            "id": sid, "label": s["label"], "short": f"{s['commodity'].lower()} from {PLACE.get(s['province'] if s['country'] == 'CA' and s['province'] else s['country'], s['country'])}",
            "package": s["package"], "origin": s["country"], "link": s.get("link") or None,
            "latest_date": pts[-1]["t"], "latest_range": rng, "week_mean": round(cur, 2),
            "vs_4wk_pct": rnd(pct_change(pts[-1]["mid"], ago4), 1),
            **st, "ref_years": ref_years,
            "text": f"{rng} per {s['package']} on {long_date(pts[-1]['t'])}. " + compare_words(st, ", after allowing for inflation"),
        })
        # Seasonal reference band for the chart: per ISO week, in reference-month dollars.
        band = []
        for w in range(1, 54):
            vals = []
            for k in range(1, cfg["years"] + 1):
                y = ly - k
                v = hist.get(str(y), {}).get(str(w))
                f = _deflator(cpi, y, w, ref_month) if (v is not None and ref_month) else None
                if v is not None and f is not None:
                    vals.append(v * f)
            band.append({"w": w, "med": rnd(median(vals), 2), "lo": rnd(min(vals), 2) if vals else None,
                         "hi": rnd(max(vals), 2) if vals else None, "n": len(vals)})
        payload.append({"id": sid, "label": s["label"], "package": s["package"], "origin": s["country"],
                        "points": [{"t": p["t"], "lo": p["lo"], "hi": p["hi"], "mid": p["mid"]} for p in pts],
                        "band": band})
    above = counts.get("outside_reference_range_review_above", 0)
    below = counts.get("outside_reference_range_review_below", 0)
    within = counts.get("within_reference_range", 0)
    short = counts.get("insufficient_data", 0)
    n = len(items)
    obs_end = ext["observation_end"]
    def are(k: int) -> str:
        return "is" if k == 1 else "are"
    text = (f"We follow {n} fresh fruits and vegetables at the Toronto wholesale market. In the latest week, "
            f"{words(above)} cost more and {words(below)} cost less than at this time of year in any recent year, after allowing for inflation. "
            f"{words(within, True)} {are(within)} in {'its' if within == 1 else 'their'} normal range")
    text += f", and for {words(short)} we do not have enough past data." if short else "."
    state = "outside_reference_range_review" if above + below else ("within_reference_range" if within else "insufficient_data")
    ind = {
        "id": "produce_prices", "title": "Fresh fruit and vegetable prices", "role": "market",
        "question": "Are fresh fruit and vegetable prices unusual for this time of year?",
        "unit": "Canadian dollars per box or bag", "source_ids": ["CA-03", "CA-04"], "frequency": "business days",
        "definition": ("Daily wholesale prices at the Toronto wholesale market for 12 fruits and vegetables, from Agriculture and Agri-Food Canada. "
                       "Each product is always the same variety, grade, origin and box size, so its price can be compared over time."),
        "how_calculated": (f"For each product we take the average price in the latest week and compare it with the same week in up to {cfg['years']} past years. "
                           f"Past prices are first converted to {month_label(ref_month + '-01') if ref_month else 'today'}'s dollars using the Consumer Price Index, "
                           "so inflation alone does not make today's prices look high. A product is flagged only if this week's price is above or below every past year."),
        "does_not_show": ("What shoppers pay in stores, prices in other cities, or why a price changed. Weather where the food is grown, "
                          "the exchange rate, quality and the timing of harvests all move wholesale prices."),
        "scenario": "", "chart": "produce",
        "headline": {"state": state, "above": above, "below": below, "within": within, "insufficient": short, "n": n,
                     "observation_end": obs_end, "period_label": f"Latest prices {long_date(obs_end)}", "text": text},
        "items": items,
        "baseline_rule": f"Compared with the same week in up to {cfg['years']} past years, in today's dollars (at least {cfg['min_years']} years needed).",
    }
    return ind, {"id": "produce_prices", "kind": "produce", "ref_month": ref_month, "series": payload}


# ------------------------------------------------------------------ affordability (StatCan)

def _yoy(points: list[dict]) -> dict[str, float]:
    by = {p["t"][:7]: p["v"] for p in points}
    out = {}
    for m, v in by.items():
        y, mm = m.split("-")
        prev = by.get(f"{int(y) - 1}-{mm}")
        c = pct_change(v, prev)
        if c is not None:
            out[m] = round(c, 1)
    return out


def affordability_indicator(ext: dict) -> tuple[dict, dict]:
    food = _yoy(ext["cpi"]["food_stores"]["points"])
    allc = _yoy(ext["cpi"]["all_items"]["points"])
    wage = _yoy(ext["wages"]["hourly"]["points"])
    months = sorted(set(food) | set(wage))
    rows = [{"t": m + "-01", "food": food.get(m), "all": allc.get(m), "wage": wage.get(m),
             "gap": rnd(food[m] - wage[m], 1) if m in food and m in wage else None} for m in months]
    common = [r for r in rows if r["gap"] is not None]
    headline = {"state": "insufficient_data", "text": "Prices and wages do not yet share a common month of data."}
    if common:
        r = common[-1]
        faster = r["gap"] > 0
        streak = 0
        for x in reversed(common):
            if (x["gap"] > 0) == faster:
                streak += 1
            else:
                break
        headline = {
            "state": "observed", "value": r["gap"], "unit": "percentage points",
            "food_yoy": r["food"], "wage_yoy": r["wage"], "all_yoy": r["all"],
            "observation_end": r["t"], "period_label": month_label(r["t"]), "streak_months": streak,
            "direction": "food_faster" if faster else "wages_faster",
            "text": (f"In {month_label(r['t'])}, grocery prices were {abs(r['food']):.1f}% {'higher' if r['food'] >= 0 else 'lower'} than a year earlier, "
                     f"and average hourly wages were {abs(r['wage']):.1f}% {'higher' if r['wage'] >= 0 else 'lower'}. "
                     + (f"Grocery prices have risen faster than wages for {words(streak)} month{'s' if streak != 1 else ''} in a row."
                        if faster else f"Wages have risen faster than grocery prices for {words(streak)} month{'s' if streak != 1 else ''} in a row.")),
        }
    ind = {
        "id": "food_affordability", "title": "Grocery prices compared with wages", "role": "access",
        "question": "Are grocery prices rising faster than what people earn?",
        "unit": "percentage points", "source_ids": ["CA-04"], "frequency": "monthly",
        "definition": ("How much grocery prices changed over 12 months (Statistics Canada's Consumer Price Index for food bought in stores), "
                       "set against how much the average hourly wage changed over the same 12 months (Statistics Canada's Labour Force Survey)."),
        "how_calculated": "For each month we compare prices and wages with the same month a year earlier. The gap is the difference between the two changes, in percentage points.",
        "does_not_show": ("Who is struggling. National averages hide people without wages, such as pensioners and people on income support, "
                          "differences between regions, and households that spend a larger share of their income on food."),
        "scenario": "", "chart": "affordability", "headline": headline,
        "baseline_rule": "Compared with the same month one year earlier.",
    }
    return ind, {"id": "food_affordability", "kind": "monthly", "rows": rows[-72:]}


# ------------------------------------------------------------------ recalls (CFIA)

def recalls_indicator(ext: dict, today: date) -> tuple[dict, dict]:
    cfg = config()
    win = cfg["recalls"]["window_days"]
    daily = {date.fromisoformat(k): v for k, v in ext["daily_counts"].items()}
    end = date.fromisoformat(ext["observation_end"])

    def count(e: date) -> int:
        return sum(v for d, v in daily.items() if e - timedelta(days=win - 1) <= d <= e)

    cur = count(end)
    ref = []
    for k in range(1, cfg["baseline"]["years"] + 1):
        try:
            e = end.replace(year=end.year - k)
        except ValueError:
            e = end.replace(year=end.year - k, day=28)
        ref.append(count(e))
    st = reference_state(cur, ref, cfg["baseline"]["min_years"])
    recent = [r for r in ext["recent"] if date.fromisoformat(r["date"]) > end - timedelta(days=win)]
    by_h = defaultdict(int)
    for r in recent:
        by_h[r["hazard"]] += 1
    # Weekly counts for the last two years, for the chart.
    weeks = []
    start = end - timedelta(days=7 * 103)
    for i in range(104):
        a = start + timedelta(days=7 * i)
        weeks.append({"t": (a + timedelta(days=6)).isoformat(),
                      "v": sum(v for d, v in daily.items() if a <= d <= a + timedelta(days=6))})
    headline = {
        **st, "value": cur, "unit": "recalls",
        "observation_end": end.isoformat(), "period_label": f"{win} days to {long_date(end.isoformat())}",
        "by_hazard": dict(sorted(by_h.items(), key=lambda x: -x[1])),
        "text": f"The Canadian Food Inspection Agency issued {cur} food recall notice{'s' if cur != 1 else ''} in the {win} days to {long_date(end.isoformat())}. " + compare_words(st),
    }
    ind = {
        "id": "food_recalls", "title": "Food recalls", "role": "signal",
        "question": "Is the Canadian Food Inspection Agency recalling more food than usual?",
        "unit": "recall notices", "source_ids": ["CA-06"], "frequency": "daily",
        "definition": "Food recall and safety notices from the Canadian Food Inspection Agency, published on the Government of Canada's recalls website.",
        "how_calculated": f"We count notices in the latest {win} days and compare the count with the same {win} days in each of the past {cfg['baseline']['years']} years.",
        "does_not_show": ("How much food was affected. Most recalls cover one brand or one batch and do not affect supply. "
                          "The data give the date a notice was last updated, not first issued, so counts are approximate."),
        "scenario": "", "chart": "weekly_counts", "headline": headline,
        "baseline_rule": f"Compared with the same {win} days in each of the past {cfg['baseline']['years']} years.",
    }
    return ind, {"id": "food_recalls", "kind": "weekly_counts", "unit": "notices per week", "rows": weeks}


# ------------------------------------------------------------------ weather alerts (ECCC)

def weather_indicator(ext: dict) -> tuple[dict, dict]:
    alerts = ext["alerts"]
    farm = [a for a in alerts if a["farm_relevant"]]
    by_prov = defaultdict(int)
    by_type = defaultdict(int)
    for a in alerts:
        by_prov[a["province"] or "?"] += 1
        by_type[a["type"]] += 1
    warn = [a for a in alerts if a.get("alert_type") == "warning"]
    np_ = len(by_prov)
    text = (f"{words(len(alerts), True)} weather alert{'s' if len(alerts) != 1 else ''} {'was' if len(alerts) == 1 else 'were'} in effect in {words(np_)} "
            f"province{'s' if np_ != 1 else ''} or territor{'ies' if np_ != 1 else 'y'} when we last checked, "
            f"including {words(len(warn))} warning{'s' if len(warn) != 1 else ''}.")
    if not alerts:
        text = "No weather alerts were in effect when we last checked."
    ind = {
        "id": "weather_alerts", "title": "Weather warnings", "role": "signal",
        "question": "Which weather warnings are in effect, and where?",
        "unit": "alerts", "source_ids": ["CA-01"], "frequency": "continuous",
        "definition": ("Warnings, watches, advisories and special statements from Environment and Climate Change Canada. "
                       "Alerts of the same type issued at the same time in one province count once."),
        "how_calculated": "We count alerts that have not yet expired. The map on the overview page also checks Environment and Climate Change Canada's service directly each time you open it.",
        "does_not_show": "Whether farms, livestock or transport are actually affected. Alert areas are forecast regions, not farmland.",
        "scenario": "drought", "chart": "alerts",
        "headline": {"state": "official_notice_active" if alerts else "none_active", "value": len(alerts), "warnings": len(warn),
                     "farm_relevant": len(farm), "by_province": dict(by_prov), "by_type": dict(by_type),
                     "observation_end": ext["retrieved_at"], "period_label": f"When checked on {long_date(ext['retrieved_at'])}",
                     "text": text},
    }
    return ind, {"id": "weather_alerts", "kind": "alerts"}
