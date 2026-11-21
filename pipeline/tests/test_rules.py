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
    assert "Not enough comparable history" in compare_words(st)


def test_reference_state_flags_only_outside_full_range():
    assert reference_state(10, [8, 9, 12], 3)["state"] == "within_reference_range"
    st = reference_state(13, [8, 9, 12], 3)
    assert st["state"] == "outside_reference_range_review" and st["direction"] == "above"
    assert "not by itself a sign of crisis" in compare_words(st)


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
    assert "No Canadian connection established" in links[0]["phrase"]


def test_trade_link_is_only_L1_never_impact():
    links = link_events(_event("USA"), TRADE, None)
    assert links[0]["level"] == "L1"
    assert "specific impact unknown" in links[0]["phrase"]
    assert links[0]["commodities"][0]["large_country"] is True
