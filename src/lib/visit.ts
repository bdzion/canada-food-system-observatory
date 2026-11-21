/* "Since your last visit": remembers, in this browser only, which release and
 * which events you have already seen. Nothing leaves the browser. Storage can be
 * unavailable (private windows, embedded views), so every call is guarded. */
const KEY = "cfso.visit.v1";
interface Visit { release: string; at: string; seen: string[] }

function read(): Visit | null {
  try { const v = localStorage.getItem(KEY); return v ? JSON.parse(v) : null; } catch { return null; }
}
let previous: Visit | null | undefined;
export function lastVisit(): Visit | null {
  if (previous === undefined) previous = read();
  return previous;
}
export function remember(release: string, ids: string[]) {
  try { localStorage.setItem(KEY, JSON.stringify({ release, at: new Date().toISOString(), seen: ids.slice(0, 600) })); } catch { /* not available */ }
}
export function isNew(id: string): boolean {
  const v = lastVisit();
  return !!v && !v.seen.includes(id);
}
const GUESS = "cfso.guesses.v1";
export function saveGuess(k: string, v: string) {
  try { const g = JSON.parse(localStorage.getItem(GUESS) || "{}"); g[k] = v; localStorage.setItem(GUESS, JSON.stringify(g)); } catch { /* ignore */ }
}
export function getGuess(k: string): string | null {
  try { return JSON.parse(localStorage.getItem(GUESS) || "{}")[k] ?? null; } catch { return null; }
}
