import { haversineNm, formatLatLonForDisplay } from "../utils/geo";
import * as maplibregl from "maplibre-gl";
/* --- Cursor control --- */
export class CursorCoordControl implements maplibregl.IControl {
  private container!: HTMLElement;
  onAdd(map: maplibregl.Map) {
    this.container = document.createElement("div");
    this.container.className = "maplibregl-ctrl cursor-coord-control";
    this.container.style.cssText =
      "background: rgba(255,255,255,0.9); padding:6px; font-family:monospace; font-size:12px; border-radius:4px;";
    map.on("mousemove", (e) => {
      this.container.textContent = formatLatLonForDisplay(
        e.lngLat.lat,
        e.lngLat.lng,
      );
    });
    return this.container;
  }
  onRemove() {
    this.container.remove();
  }
}

/* --- Measure control --- */
export class MeasureControl implements maplibregl.IControl {
  private container!: HTMLElement;
  private active = false;
  private pts: [number, number][] = [];
  private map?: maplibregl.Map;

  onAdd(map: maplibregl.Map) {
    this.map = map;
    this.container = document.createElement("div");
    this.container.className = "maplibregl-ctrl measure-control";
    this.container.style.cssText =
      "background: rgba(255,255,255,0.9); padding:6px; border-radius:4px;";
    const btn = document.createElement("button");
    btn.textContent = "Measure (NM)";
    btn.title = "Click to toggle measure mode. Click map to add points.";
    btn.style.cursor = "pointer";
    btn.onclick = () => this.toggle();
    const clear = document.createElement("button");
    clear.textContent = "Clear";
    clear.style.marginLeft = "6px";
    clear.onclick = () => this.clear();
    this.container.appendChild(btn);
    this.container.appendChild(clear);

    map.on("click", (e) => {
      if (!this.active) return;
      const coord: [number, number] = [e.lngLat.lng, e.lngLat.lat];
      this.pts.push(coord);
      this._updateLayer();
      this._updatePopup();
    });

    if (!map.getSource("measure")) {
      map.addSource("measure", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "measure-line",
        type: "line",
        source: "measure",
        paint: { "line-color": "#FF0000", "line-width": 2 },
      });
      map.addLayer({
        id: "measure-points",
        type: "circle",
        source: "measure",
        paint: { "circle-radius": 5, "circle-color": "#FF0000" },
      });
    }
    return this.container;
  }

  onRemove() {}

  toggle() {
    this.active = !this.active;
    (this.container.querySelector("button") as HTMLElement).style.fontWeight =
      this.active ? "700" : "400";
  }

  clear() {
    this.pts = [];
    this._updateLayer();
    this._updatePopup(true);
  }

  private _updateLayer() {
    if (!this.map) return;
    const features: any[] = [];
    for (const p of this.pts)
      features.push({
        type: "Feature",
        geometry: { type: "Point", coordinates: p },
        properties: {},
      });
    if (this.pts.length >= 2)
      features.push({
        type: "Feature",
        geometry: { type: "LineString", coordinates: this.pts },
        properties: {},
      });
    const src = this.map.getSource("measure") as
      | maplibregl.GeoJSONSource
      | undefined;
    if (src) src.setData({ type: "FeatureCollection", features });
  }

  private _updatePopup(clear = false) {
    let existing = document.getElementById("measure-popup");
    if (clear && existing) existing.remove();
    if (clear) return;
    const total = this.pts.reduce(
      (acc, _p, i, arr) =>
        i === 0 ? 0 : acc + haversineNm(arr[i - 1], arr[i]),
      0,
    );
    if (!existing) {
      existing = document.createElement("div");
      existing.id = "measure-popup";
      existing.style.cssText =
        "position:absolute; left:202px; bottom:10px; background:rgba(255,255,255,0.95); padding:6px; border-radius:4px; font:12px/20px monospace;";
      document.body.appendChild(existing);
    }
    existing.textContent = `Measure: ${total.toFixed(2)} NM (${this.pts.length} points)`;
  }
}
