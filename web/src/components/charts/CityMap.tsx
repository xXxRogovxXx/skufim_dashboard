import { useRef, useState } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  ZoomableGroup,
} from "react-simple-maps";
import geoData from "world-atlas/countries-110m.json";
import { compactNumber } from "./common";
import type { CityPoint } from "../../lib/data";

interface Props {
  points: CityPoint[];
  metric: "starts" | "streams";
  height?: number;
}

interface Hover {
  x: number;
  y: number;
  name: string;
  value: number;
}

export default function CityMap({ points, metric, height = 460 }: Props) {
  const [hover, setHover] = useState<Hover | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Координаты курсора относительно контейнера карты (родитель имеет
  // backdrop-filter, из-за чего position:fixed привязался бы к карточке).
  const relPos = (e: { clientX: number; clientY: number }) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    return {
      x: e.clientX - (rect?.left ?? 0),
      y: e.clientY - (rect?.top ?? 0),
    };
  };

  const rows = points
    .map((p) => ({ ...p, value: p[metric] }))
    .filter((p) => p.value > 0)
    .sort((a, b) => b.value - a.value);

  const maxVal = Math.max(...rows.map((r) => r.value), 1);
  const R_MAX = 30;
  const R_MIN = 3;
  const radius = (v: number) => R_MIN + Math.sqrt(v / maxVal) * (R_MAX - R_MIN);

  return (
    <div ref={wrapRef} className="city-map" style={{ position: "relative", width: "100%", height }}>
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{ center: [60, 56], scale: 300 }}
        style={{ width: "100%", height: "100%" }}
      >
        <ZoomableGroup center={[60, 56]} zoom={1} minZoom={1} maxZoom={8}>
          <Geographies geography={geoData}>
            {({ geographies }) =>
              geographies.map((geo) => (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill="rgba(128,128,128,0.10)"
                  stroke="rgba(128,128,128,0.30)"
                  strokeWidth={0.4}
                  style={{
                    default: { outline: "none" },
                    hover: { outline: "none", fill: "rgba(128,128,128,0.20)" },
                    pressed: { outline: "none" },
                  }}
                />
              ))
            }
          </Geographies>

          {rows.map((p) => (
            <Marker key={p.name} coordinates={[p.lon, p.lat]}>
              <circle
                r={radius(p.value)}
                fill="rgba(124,58,237,0.42)"
                stroke="#A78BFA"
                strokeWidth={0.8}
                style={{ cursor: "pointer" }}
                onMouseEnter={(e) => {
                  const { x, y } = relPos(e);
                  setHover({ x, y, name: p.name, value: p.value });
                }}
                onMouseMove={(e) => {
                  const { x, y } = relPos(e);
                  setHover((h) => (h ? { ...h, x, y } : h));
                }}
                onMouseLeave={() => setHover(null)}
              />
            </Marker>
          ))}
        </ZoomableGroup>
      </ComposableMap>

      {hover && (
        <div
          className="map-tooltip"
          style={{ left: hover.x, top: hover.y }}
        >
          <div className="map-tooltip__name">{hover.name}</div>
          <div className="map-tooltip__val">
            {compactNumber(hover.value)}{" "}
            {metric === "starts" ? "стартов" : "стримов"}
          </div>
        </div>
      )}

      <div className="map-hint">🖱 колесо — зум, перетаскивание — сдвиг</div>
    </div>
  );
}
