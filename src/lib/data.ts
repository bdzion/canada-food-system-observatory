/* Loads the processed JSON release from this site (same origin). Nothing here
 * calls a provider directly except live.ts, which says so on screen. */
import { useEffect, useState } from "react";
import { SCHEMA } from "./types";

export const DATA = `${import.meta.env.BASE_URL}data/`;
const cache = new Map<string, Promise<any>>();

export function load<T = any>(path: string): Promise<T> {
  if (!cache.has(path)) {
    cache.set(path, fetch(DATA + path, { cache: "no-cache" }).then(async (r) => {
      if (!r.ok) throw new Error(`${path}: HTTP ${r.status}`);
      const j = await r.json();
      if (j && typeof j === "object" && "schema_version" in j && j.schema_version !== SCHEMA)
        throw new Error(`${path} uses data schema ${j.schema_version}; this page expects ${SCHEMA}. Reload the page.`);
      return j;
    }).catch((e) => { cache.delete(path); throw e; }));
  }
  return cache.get(path)!;
}

export function useData<T = any>(path: string | null): { data: T | null; error: string | null } {
  const [state, set] = useState<{ data: T | null; error: string | null }>({ data: null, error: null });
  useEffect(() => {
    if (!path) return;
    let live = true;
    set({ data: null, error: null });
    load<T>(path).then((d) => live && set({ data: d, error: null }), (e) => live && set({ data: null, error: String(e.message || e) }));
    return () => { live = false; };
  }, [path]);
  return state;
}
