/* Map of official weather alerts (ECCC) and, optionally, global hazard points (GDACS).
 * Basemap: OpenStreetMap tiles, credited on the map. */
import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const TYPE_COLOUR: Record<string, string> = { warning: "#b3261e", watch: "#b45f06", advisory: "#8a6a00", statement: "#6b4fa0" };

export default function AlertMap({ geo, points, world = false, height = 380 }: {
  geo?: any; points?: { lat: number; lon: number; title: string; level?: string; url?: string; link?: string }[]; world?: boolean; height?: number;
}) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  useEffect(() => {
    if (!el.current || map.current) return;
    map.current = L.map(el.current, { scrollWheelZoom: false, worldCopyJump: true, attributionControl: true });
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 8, attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map.current);
    layer.current = L.layerGroup().addTo(map.current);
    return () => { map.current?.remove(); map.current = null; };
  }, []);
  useEffect(() => {
    const m = map.current, g = layer.current;
    if (!m || !g) return;
    g.clearLayers();
    if (world) m.setView([20, 10], 2); else m.setView([58, -96], 3);
    if (geo?.features?.length) {
      L.geoJSON(geo, {
        style: (f: any) => ({ color: TYPE_COLOUR[f.properties.alert_type] || "#6b4fa0", weight: 1, fillOpacity: 0.25 }),
        onEachFeature: (f: any, lyr) => lyr.bindTooltip(`<b>${f.properties.type}</b><br>${f.properties.area || f.properties.province || ""}`),
      }).addTo(g);
    }
    for (const p of points || []) {
      const c = L.circleMarker([p.lat, p.lon], { radius: 7, color: p.level === "Red" ? "#b3261e" : "#b45f06", weight: 2, fillOpacity: 0.55 });
      c.bindPopup(`<b>${p.title}</b>${p.link ? `<br>${p.link}` : ""}${p.url ? `<br><a href="${p.url}" target="_blank" rel="noopener">GDACS report</a>` : ""}`);
      c.addTo(g);
    }
  }, [geo, points, world]);
  return <div ref={el} className="map" style={{ height }} role="region" aria-label="Map of alerts. The same information is listed below the map." />;
}
