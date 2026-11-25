#!/usr/bin/env python3
"""Check every page of the built site in a headless browser.

For each page, at a wide (1280 px) and a narrow (390 px) viewport, this script
records:
  - console errors and page exceptions;
  - horizontal overflow (the page being wider than the window);
  - failed network requests;
  - accessibility violations found by axe-core (WCAG 2.1 A and AA rules);
and saves a screenshot of the wide view to docs/screenshots/.

Usage:
    npm run build
    python3 scripts/check-pages.py                 # serves dist/ itself
    python3 scripts/check-pages.py --base http://localhost:4173/canada-food-system-observatory/

Exit code is 1 if any page has a console error, horizontal overflow or a
serious or critical accessibility violation.
"""
from __future__ import annotations

import argparse
import asyncio
import functools
import http.server
import json
import socketserver
import sys
import threading
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BASE_PATH = "/canada-food-system-observatory/"
AXE = ROOT / "node_modules" / "axe-core" / "axe.min.js"

# Every page a reader can reach, with the file name used for its screenshot.
PAGES: list[tuple[str, str]] = [
    ("", "01-overview"),
    ("#/system", "02-system"),
    ("#/indicators", "03-indicators"),
    ("#/indicators/grain_stocks", "04-indicator-grain-stocks"),
    ("#/indicators/produce_prices", "05-indicator-produce-prices"),
    ("#/indicators/sea_lanes", "06-indicator-sea-lanes"),
    ("#/indicators/prairie_drought", "07-indicator-prairie-drought"),
    ("#/threats", "08-threats"),
    ("#/threats/rail", "09-threat-rail"),
    ("#/threats/phosphate", "10-threat-phosphate"),
    ("#/threats/drought", "11-threat-drought"),
    ("#/threats/ongoing", "12-threats-ongoing"),
    ("#/threats/warnings", "13-threats-warnings"),
    ("#/threats/abroad", "14-threats-abroad"),
    ("#/timelines", "15-timelines"),
    ("#/timelines/bad-year", "16-bad-year"),
    ("#/timelines/game", "17-game"),
    ("#/briefs", "18-briefs"),
    ("#/about", "19-about"),
]

VIEWPORTS = [(1280, 900, "wide"), (390, 844, "narrow")]

# Rules that fire on third-party map tiles or on decorative SVG we label in text.
AXE_IGNORE: set[str] = set()


def serve(directory: Path, port: int) -> socketserver.TCPServer:
    """Serve `directory` so that BASE_PATH maps onto it, like GitHub Pages does."""

    class Handler(http.server.SimpleHTTPRequestHandler):
        def translate_path(self, path: str) -> str:
            if path.startswith(BASE_PATH):
                path = "/" + path[len(BASE_PATH):]
            return super().translate_path(path)

        def log_message(self, *a):  # keep the output readable
            pass

    socketserver.TCPServer.allow_reuse_address = True
    httpd = socketserver.TCPServer(("127.0.0.1", port), functools.partial(Handler, directory=str(directory)))
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd


async def check(base: str, shots: Path, only: str | None) -> int:
    from playwright.async_api import async_playwright

    axe_js = AXE.read_text(encoding="utf-8") if AXE.exists() else None
    if axe_js is None:
        print("note: node_modules/axe-core not found; skipping the accessibility checks\n")
    shots.mkdir(parents=True, exist_ok=True)
    pages = [p for p in PAGES if not only or only in p[0] or only in p[1]]
    failures = 0

    async with async_playwright() as p:
        browser = await p.chromium.launch(channel="chrome", args=["--no-sandbox"])
        for route, name in pages:
            for w, h, label in VIEWPORTS:
                ctx = await browser.new_context(viewport={"width": w, "height": h},
                                                device_scale_factor=1, reduced_motion="reduce")
                page = await ctx.new_page()
                errors: list[str] = []
                page.on("console", lambda m: errors.append(f"console.{m.type}: {m.text}") if m.type == "error" else None)
                page.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))
                page.on("requestfailed", lambda r: errors.append(f"request failed: {r.url} ({r.failure})")
                        if "data:" not in r.url else None)
                url = base + route
                try:
                    await page.goto(url, wait_until="load", timeout=45000)
                    # The pages fetch their JSON after load; give the fetches time to land.
                    await page.wait_for_timeout(2500)
                    try:
                        await page.wait_for_function("!document.body.innerText.includes('Loading…')", timeout=8000)
                    except Exception:
                        errors.append("still showing 'Loading…' after 8 s")
                except Exception as e:  # a page that will not load at all
                    errors.append(f"navigation: {type(e).__name__}: {e}")

                overflow = await page.evaluate(
                    """() => {
                        const d = document.documentElement;
                        const over = d.scrollWidth - d.clientWidth;
                        if (over <= 1) return null;
                        // Name the widest offending elements so the fix is obvious.
                        const wide = [...document.querySelectorAll('body *')]
                          .filter(el => el.getBoundingClientRect().right > d.clientWidth + 1)
                          .slice(0, 6)
                          .map(el => el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.split(/\\s+/).join('.') : ''));
                        return { over, wide };
                    }"""
                )
                if overflow:
                    errors.append(f"horizontal overflow of {overflow['over']} px; widest: {', '.join(overflow['wide'])}")

                axe_bad: list[dict] = []
                if axe_js:
                    await page.add_script_tag(content=axe_js)
                    res = await page.evaluate(
                        """async () => await window.axe.run(document, {
                             runOnly: { type: 'tag', values: ['wcag2a','wcag2aa','wcag21a','wcag21aa'] }
                           })"""
                    )
                    for v in res["violations"]:
                        if v["id"] in AXE_IGNORE:
                            continue
                        axe_bad.append({"id": v["id"], "impact": v["impact"], "help": v["help"],
                                        "n": len(v["nodes"]),
                                        "targets": [n["target"][0] for n in v["nodes"][:4]]})

                serious = [v for v in axe_bad if v["impact"] in ("serious", "critical")]
                bad = bool(errors) or bool(serious)
                failures += bool(bad)
                flag = "FAIL" if bad else ("warn" if axe_bad else "ok  ")
                print(f"{flag} {label:6} {route or '(overview)'}")
                for e in errors:
                    print(f"       ! {e}")
                for v in axe_bad:
                    print(f"       {'!' if v['impact'] in ('serious', 'critical') else '-'} axe {v['id']} "
                          f"({v['impact']}, {v['n']}): {v['help']} :: {'; '.join(v['targets'])}")

                if label == "wide":
                    await page.screenshot(path=str(shots / f"{name}.png"), full_page=True)
                await ctx.close()
        await browser.close()
    print(f"\n{len(pages)} pages x {len(VIEWPORTS)} viewports; {failures} failing checks")
    return 1 if failures else 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--base", help="base URL of a site already being served")
    ap.add_argument("--dist", type=Path, default=ROOT / "dist", help="built site to serve (default dist/)")
    ap.add_argument("--port", type=int, default=4199)
    ap.add_argument("--shots", type=Path, default=ROOT / "docs" / "screenshots")
    ap.add_argument("--only", help="check only routes or names containing this text")
    a = ap.parse_args()
    httpd = None
    base = a.base
    if not base:
        if not (a.dist / "index.html").exists():
            print(f"no built site at {a.dist}; run `npm run build` first", file=sys.stderr)
            return 2
        httpd = serve(a.dist, a.port)
        base = f"http://127.0.0.1:{a.port}{BASE_PATH}"
    print(f"checking {base}\n")
    try:
        return asyncio.run(check(base, a.shots, a.only))
    finally:
        if httpd:
            httpd.shutdown()


if __name__ == "__main__":
    sys.exit(main())
