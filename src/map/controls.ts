import { haversineNm, formatLatLonForDisplay } from "../utils/geo";
import { getCssVar } from "../utils/helpers";
import * as maplibregl from "maplibre-gl";
import "@oicl/openbridge-webcomponents/src/palettes/variables.css";
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
    this.container.style.background = getCssVar("--obc-blue-000", "#f7faff");
    this.container.style.padding = "6px";
    this.container.style.borderRadius = "4px";
    this.container.style.display = "flex";
    this.container.style.alignItems = "center";
    this.container.style.position = "relative";

    // Main measure button
    const measureBtn = document.createElement("obc-icon-button");
    measureBtn.title = "Measure (NM)";
    measureBtn.innerHTML = `<obi-route-planning></obi-route-planning>`;
    measureBtn.onclick = () => this.toggle(measureBtn, toolbox);

    // Toolbox panel (clear + reverse)
    const toolbox = document.createElement("div");
    toolbox.className = "measure-toolbox";
    toolbox.style.display = "none";
    toolbox.style.position = "absolute";
    toolbox.style.left = "60px";
    toolbox.style.top = "3px";
    toolbox.style.transition = "opacity .2s";
    toolbox.style.opacity = "0";
    toolbox.style.zIndex = "2";
    toolbox.style.background = getCssVar("--obc-blue-000", "#f7faff");
    toolbox.style.borderRadius = "0px 4px 4px 0px";
    toolbox.style.boxShadow = "0 2px 8px rgba(0,0,0,0.07)";
    toolbox.style.padding = "3px 6px 3px 0px";

    // Clear button
    const clearBtn = document.createElement("obc-icon-button");
    clearBtn.title = "Clear";
    clearBtn.innerHTML = `<obi-cursor-delete-icon></obi-cursor-delete-icon>`;
    clearBtn.onclick = () => this.clear();

    // Reverse button
    const reverseBtn = document.createElement("obc-icon-button");
    reverseBtn.title = "Reverse";
    reverseBtn.innerHTML = `<obi-arrow-bidirectional-horizontal></obi-arrow-bidirectional-horizontal>`;
    reverseBtn.onclick = () => this.reverse();

    toolbox.appendChild(clearBtn);
    toolbox.appendChild(reverseBtn);

    this.container.appendChild(measureBtn);
    this.container.appendChild(toolbox);

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
        paint: {
          "line-color": getCssVar("--obc-blue-300", "#88b1e7"),
          "line-width": 2,
        },
      });
      map.addLayer({
        id: "measure-points",
        type: "circle",
        source: "measure",
        paint: {
          "circle-radius": 5,
          "circle-color": getCssVar("--obc-blue-200", "#88b1e7"),
        },
      });
    }
    return this.container;
  }

  onRemove() {}

  toggle(measureBtn: HTMLElement, toolbox: HTMLElement) {
    this.active = !this.active;
    if (this.active) {
      measureBtn.style.background = getCssVar("--obc-blue-200", "#eaf3fc");
      measureBtn.style.fontWeight = "700";
      toolbox.style.display = "flex";
      setTimeout(() => (toolbox.style.opacity = "1"), 10);
    } else {
      measureBtn.style.background = "";
      measureBtn.style.fontWeight = "400";
      toolbox.style.opacity = "0";
      setTimeout(() => (toolbox.style.display = "none"), 200);
      this.clear();
    }
  }

  clear() {
    this.pts = [];
    this._updateLayer();
    this._updatePopup(true);
  }

  reverse() {
    this.pts.reverse();
    this._updateLayer();
    this._updatePopup();
  }

  private _updateLayer() {
    if (!this.map) return;
    const features: any[] = [];
    // Points (only actual waypoints, not label points)
    for (const p of this.pts)
      features.push({
        type: "Feature",
        geometry: { type: "Point", coordinates: p },
        properties: { isWaypoint: true },
      });
    // Lines and segment labels
    if (this.pts.length >= 2) {
      features.push({
        type: "Feature",
        geometry: { type: "LineString", coordinates: this.pts },
        properties: {},
      });
      // Add segment labels (not waypoints)
      for (let i = 1; i < this.pts.length; i++) {
        const start = this.pts[i - 1];
        const end = this.pts[i];
        const dist = haversineNm(start, end).toFixed(2);
        const bearing = this._calculateBearing(start, end);
        const mid = [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2];
        features.push({
          type: "Feature",
          geometry: { type: "Point", coordinates: mid },
          properties: {
            label: `${dist} NM / ${bearing}`,
            isWaypoint: false,
          },
        });
      }
    }
    const src = this.map.getSource("measure") as
      | maplibregl.GeoJSONSource
      | undefined;
    if (src) src.setData({ type: "FeatureCollection", features });

    // Add label layer if not present
    if (this.map && !this.map.getLayer("measure-labels")) {
      this.map.addLayer({
        id: "measure-labels",
        type: "symbol",
        source: "measure",
        layout: {
          "text-field": ["get", "label"],
          "text-size": 12,
          "text-font": ["Open Sans Regular", "Arial Unicode MS Regular"],
          "text-offset": [0, 1.2],
        },
        paint: {
          "text-color": getCssVar("--obc-blue-400", "#074369"),
          "text-halo-color": "#fff",
          "text-halo-width": 1,
        },
        filter: ["has", "label"],
      });
    }

    // Update measure-points layer to only show waypoints
    if (this.map && this.map.getLayer("measure-points")) {
      this.map.setFilter("measure-points", ["==", ["get", "isWaypoint"], true]);
    }
  }

  private _calculateBearing(a: [number, number], b: [number, number]): string {
    const toRad = (d: number) => (d * Math.PI) / 180;
    const toDeg = (r: number) => (r * 180) / Math.PI;
    const lat1 = toRad(a[1]);
    const lat2 = toRad(b[1]);
    const dLon = toRad(b[0] - a[0]);
    const y = Math.sin(dLon) * Math.cos(lat2);
    const x =
      Math.cos(lat1) * Math.sin(lat2) -
      Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
    let brng = Math.atan2(y, x);
    brng = toDeg(brng);
    brng = (brng + 360) % 360;
    return `${brng.toFixed(0)}°`;
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
