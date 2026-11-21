"""Command-line entry point.

    python -m cfso.run --data ../data            # refresh every source that is due
    python -m cfso.run --data ../data --only CA-01,GL-02
    python -m cfso.run --data ../data --offline  # rebuild from stored extracts only
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from .build import run


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--data", required=True, type=Path, help="release directory (read previous, write new)")
    ap.add_argument("--only", help="comma-separated source IDs to refresh")
    ap.add_argument("--offline", action="store_true", help="do not contact any source")
    a = ap.parse_args(argv)
    only = set() if a.offline else (set(a.only.split(",")) if a.only else None)
    man = run(a.data, only)
    print(json.dumps({k: man[k] for k in ("release_id", "generated_at", "sources_ok", "sources_total")}))
    # A release with no working source at all is a failure worth surfacing in CI.
    return 0 if man["sources_ok"] > 0 else 1


if __name__ == "__main__":
    sys.exit(main())
