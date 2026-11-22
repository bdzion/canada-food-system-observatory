/* Map of the latest Canadian Drought Monitor areas (Agriculture and Agri-Food Canada).
 * Drought categories are nested, so we draw D0 first and the worse ones on top. */
import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useData } from "../lib/data";
import { monthYear } from "../lib/format";

// One hue, light to dark: a sequential scale for an ordered measure.
const LEVEL: Record<string, [string, string]> = {
  D0: ["#f3d9a4", "Abnormally dry"], D1: ["#e8a85c", "Moderate drought"], D2: ["#c96f2d", "Severe drought"],
  D3: ["#94400f", "Extreme drought"], D4: ["#5a1f02", "Exceptional drought"],
};

export default function DroughtMap({ height = 380 }: { height?: number }) {
  const { data, error } = useData<any>("drought.geojson");
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  useEffect(() => {
    if (!el.current || !data || map.current) return;
    map.current = L.map(el.current, { scrollWheelZoom: false }).setView([53, -103], 4);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 8, attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors · Drought areas: Agriculture and Agri-Food Canada',
    }).addTo(map.current);
    const feats = [...data.features].sort((a: any, b: any) => a.properties.level.localeCompare(b.properties.level));
    for (const f of feats) {
      const [c, label] = LEVEL[f.properties.level] || ["#999", f.properties.level];
      L.geoJSON(f, { style: { color: c, weight: 0.5, fillColor: c, fillOpacity: 0.65 } }).bindTooltip(`${f.properties.level}: ${label}`).addTo(map.current);
    }
    return () => { map.current?.remove(); map.current = null; };
  }, [data]);
  if (error) return <p className="empty">The drought map could not be loaded.</p>;
  return (
    <div>
      <div className="scale" aria-label="Drought categories">
        {Object.entries(LEVEL).map(([k, [c, l]]) => <span key={k}><i style={{ background: c }} /> {k} {l}</span>)}
      </div>
      <div ref={el} className="map" style={{ height, marginTop: 8 }} role="region" aria-label="Map of drought areas. The shares by province are in the table above." />
      {data?.month && <p className="small muted" style={{ marginTop: 6 }}>Canadian Drought Monitor, conditions at the end of {monthYear(data.month + "-01")}. Shapes are simplified for the web; see <a href="https://agriculture.canada.ca/en/agricultural-production/weather/canadian-drought-monitor">Agriculture and Agri-Food Canada</a> for the official maps.</p>}
    </div>
  );
}
