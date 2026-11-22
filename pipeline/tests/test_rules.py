"""Tests for the rules the site's honesty depends on."""
from datetime import date

from cfso.connectors.cgc import parse_crop_year
from cfso.connectors.recalls import hazard_group
from cfso.core import config, pct_change, reference_state
from cfso.exposure import link_events
from cfso.indicators import compare_words


def test_missing_is_not_zero():
    assert pct_change(None, 100) is None
    assert pct_change(100, None) is None


def test_zero_base_is_not_calculable():
    assert pct_change(5, 0) is None


def test_reference_state_needs_enough_years():
    st = reference_state(10, [9, 11], min_years=3)
    assert st["state"] == "insufficient_data"
    assert "do not have enough past years" in compare_words(st)


def test_reference_state_flags_only_outside_full_range():
    assert reference_state(10, [8, 9, 12], 3)["state"] == "within_reference_range"
    st = reference_state(13, [8, 9, 12], 3)
    assert st["state"] == "outside_reference_range_review" and st["direction"] == "above"
    assert "does not mean a crisis" in compare_words(st)


def test_reference_ignores_missing_years():
    st = reference_state(10, [None, 9, 11, None, 10], 3)
    assert st["n_years"] == 3


NEW = '''"Crop Year","Grain Week","Week Ending Date","worksheet","metric","period","grain","grade","Region","Ktonnes"
"2026-2027",1,"09/08/2026","Summary","Stocks","Current Week","Wheat",,"Primary Elevators",100
"2026-2027",1,"09/08/2026","Summary","Stocks","Current Week","Wheat",,"Vancouver",50
"2026-2027",1,"09/08/2026","Summary","Stocks","Crop Year","Wheat",,"Vancouver",999
"2026-2027",1,"09/08/2026","Terminal Exports","Exports","Current Week","Wheat","No.1 CW RS","Vancouver",20
'''
OLD = '''grain_week,crop_year,week_ending_date,worksheet,metric,period,grain,grade,region,Ktonnes
1,2021-2022,08/08/2021,Summary,Commercial Stocks,Current Week,Wheat,,Primary Elevators,80
'''


def test_cgc_parses_both_header_styles_and_skips_crop_year_totals():
    new = parse_crop_year(NEW)["1"]
    assert new["stocks_total"] == 150  # the "Crop Year" row is not added
    assert new["stocks_primary"] == 100 and new["stocks_ports"] == 50
    assert new["exports_week"] == 20
    assert "deliveries_week" not in new  # absent measure stays absent, not zero
    old = parse_crop_year(OLD)["1"]
    assert old["stocks_total"] == 80 and old["week_end"] == "2021-08-08"


def test_hazard_groups():
    g = config()["recalls"]["hazard_groups"]
    assert hazard_group("Milk", g) == "allergen"
    assert hazard_group("Listeria monocytogenes", g) == "microbial"
    assert hazard_group("Extraneous Material", g) == "physical"
    assert hazard_group("", g) == "unspecified"


def _event(iso3):
    return {"events": [{"id": "e1", "countries": [{"iso3": iso3, "name": iso3}]}]}


TRADE = {"commodities": {"0705": {"label": "Lettuce", "group": "produce", "year": 2025, "scenario": "",
                                  "partners": [{"iso3": "USA", "name": "USA", "share": 0.89}]}}}


def test_disaster_without_trade_link_is_L0():
    links = link_events(_event("VUT"), TRADE, None)
    assert links[0]["level"] == "L0"
    assert "No direct link found" in links[0]["phrase"]


def test_trade_link_is_only_L1_never_impact():
    links = link_events(_event("USA"), TRADE, None)
    assert links[0]["level"] == "L1"
    assert "do not yet know whether this disaster affects" in links[0]["phrase"]
    assert links[0]["commodities"][0]["large_country"] is True


TRADE_SMALL = {"commodities": {"0803": {"label": "Bananas", "group": "produce", "year": 2025, "scenario": "",
                                        "partners": [{"iso3": "CRI", "name": "Costa Rica", "share": 0.12}]}}}


def test_earthquakes_need_a_larger_supplier_share():
    quake = {"events": [{"id": "q", "event_type": "Earthquake", "countries": [{"iso3": "CRI", "name": "Costa Rica"}]}]}
    flood = {"events": [{"id": "f", "event_type": "Flood", "countries": [{"iso3": "CRI", "name": "Costa Rica"}]}]}
    assert link_events(quake, TRADE_SMALL, None)[0]["level"] == "L0"  # 12% < 20% for local hazards
    assert link_events(flood, TRADE_SMALL, None)[0]["level"] == "L1"  # 12% >= 5% otherwise


# ---------------------------------------------------------------- release 2 engine

from cfso.panels import line_item  # noqa: E402


def _monthly(vals: dict[str, float]):
    return {"id": "x", "label": "X", "points": [{"t": t, "v": v} for t, v in sorted(vals.items())]}


def test_same_month_comparison_and_missing_years():
    pts = {"2021-10-01": 10, "2022-10-01": 12, "2023-10-01": None, "2024-10-01": 11, "2025-10-01": 9, "2026-10-01": 20}
    item, chart = line_item(_monthly(pts), "monthly", "index")
    assert item["state"] == "outside_reference_range_review" and item["direction"] == "above"
    assert item["n_years"] == 4  # the missing 2023 value is not counted as zero
    assert item["vs_year_ago_pct"] == round(100 * (20 - 9) / 9, 1)


def test_inflation_adjustment_uses_both_months():
    pts = {f"{y}-10-01": 100 for y in range(2021, 2027)}
    cpi = {f"{y}-10": 100 + 10 * (y - 2021) for y in range(2021, 2027)}  # prices rose 50% overall
    item, _ = line_item(_monthly(pts), "monthly", "dollars", cpi=cpi)
    # Unchanged nominal price = cheaper than every past year in today's dollars.
    assert item["direction"] == "below"


def test_weekly_comparison_keeps_the_weekday():
    from datetime import date, timedelta
    end = date(2026, 11, 15)
    pts = [{"t": (end - timedelta(days=7 * k)).isoformat(), "v": 50.0} for k in range(0, 52 * 6)]
    pts[0]["v"] = 3.0  # latest week collapses
    item, _ = line_item({"id": "h", "label": "H", "points": sorted(pts, key=lambda p: p["t"])}, "weekly", "ships a day")
    assert item["state"] == "outside_reference_range_review" and item["direction"] == "below" and item["n_years"] == 5


def test_annual_series_has_no_unusual_test():
    item, chart = line_item(_monthly({"2022-01-01": 18, "2023-01-01": 22, "2024-01-01": 24}), "annual", "percent")
    assert item["state"] == "observed" and chart["band"] == []
