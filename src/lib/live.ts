/* Live check against ECCC GeoMet from the visitor's browser (the API allows it).
 * If it fails, pages fall back to the pipeline snapshot and say so. */
export interface LiveAlerts { at: string; count: number; warnings: number; geo: any; byProvince: Record<string, number> }

export async function liveWeather(signal?: AbortSignal): Promise<LiveAlerts> {
  const r = await fetch("https://api.weather.gc.ca/collections/weather-alerts/items?f=json&limit=2000&lang=en", { signal });
  if (!r.ok) throw new Error("GeoMet HTTP " + r.status);
  const j = await r.json();
  const now = Date.now();
  const feats = (j.features || []).filter((f: any) => !f.properties?.expiration_datetime || +new Date(f.properties.expiration_datetime) > now);
  const groups = new Map<string, any>();
  for (const f of feats) {
    const p = f.properties;
    const k = `${p.alert_name_en}|${p.province}|${p.publication_datetime}`;
    if (!groups.has(k)) groups.set(k, p);
  }
  const byProvince: Record<string, number> = {};
  let warnings = 0;
  groups.forEach((p) => { byProvince[p.province] = (byProvince[p.province] || 0) + 1; if (p.alert_type === "warning") warnings++; });
  return {
    at: new Date().toISOString(), count: groups.size, warnings, byProvince,
    geo: { type: "FeatureCollection", features: feats.map((f: any) => ({ type: "Feature", geometry: f.geometry, properties: { type: f.properties.alert_name_en, province: f.properties.province, alert_type: f.properties.alert_type, area: f.properties.feature_name_en } })) },
  };
}
