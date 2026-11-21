/* Minimal hash router: GitHub Pages serves one file, so routes live after "#". */
import { useEffect, useState } from "react";

export function parse(): { path: string[]; query: URLSearchParams } {
  const h = location.hash.replace(/^#\/?/, "");
  const [p, q] = h.split("?");
  return { path: p.split("/").filter(Boolean).map(decodeURIComponent), query: new URLSearchParams(q || "") };
}
export function useRoute() {
  const [r, set] = useState(parse());
  useEffect(() => {
    const on = () => { set(parse()); const main = document.getElementById("main"); if (main && !location.hash.includes("#sec-")) window.scrollTo({ top: 0 }); };
    addEventListener("hashchange", on);
    return () => removeEventListener("hashchange", on);
  }, []);
  return r;
}
export const href = (p: string) => "#" + (p.startsWith("/") ? p : "/" + p);
