"""One module per official source. Each exposes run(previous=None) -> extract dict."""
from . import cgc, comtrade, gcnews, gdacs, geomet, infohort, recalls, statcan

# Source ID -> (module, minimum hours between refreshes). Annual trade data
# does not need checking several times a day.
CONNECTORS = {
    "CA-01": (geomet, 0),
    "CA-03": (infohort, 0),
    "CA-04": (statcan, 0),
    "CA-05": (cgc, 0),
    "CA-06": (recalls, 0),
    "CA-07": (gcnews, 0),
    "GL-01": (comtrade, 24 * 14),
    "GL-02": (gdacs, 0),
}
