import * as maplibregl from "maplibre-gl";
import { haversineNm, formatLatLonForDisplay } from "../utils/geo";
import { injectPanelCSS } from "../ui/panel";
import { getCssVar } from "../utils/helpers";
import { exportRoute, exportGpx } from "../route/gpx";
import { fitMapToBounds } from "../map/bounds";
/* --- Route draw & manager control --- */
export class RouteDrawControl implements maplibregl.IControl {
  private container!: HTMLElement;
  private map?: maplibregl.Map;
  private drawing = false;

  // editor
  private waypoints: [number, number][] = [];
  private waypointNames: string[] = [];
  private markers: maplibregl.Marker[] = [];
  private routePanel!: HTMLElement;
  private routeName: string = "Route 1";
  private collapsed = false;

  // saved routes
  private savedRoutes: {
    name: string;
    waypoints: [number, number][];
    waypointNames: string[];
    visible: boolean;
    active: boolean;
    sourceId?: string;
    lineLayerId?: string;
    pointLayerId?: string;
  }[] = [];
  private activeRouteIndex = -1;
  private providedRoutes: {
    name: string;
    waypoints: [number, number][];
    waypointNames: string[];
    visible: boolean;
    selected: boolean;
    sourceId?: string;
    lineLayerId?: string;
    pointLayerId?: string;
  }[] = [];
  onAdd(map: maplibregl.Map) {
    this.map = map;
    this.container = document.createElement("div");
    injectPanelCSS();
    this.routePanel = document.getElementById("route-panel") as HTMLElement;

    // Create the route panel if it doesn't exist, and set up the structure for active, working, and provided routes.
    if (!this.routePanel) {
      this.routePanel = document.createElement("div");
      this.routePanel.id = "route-panel";
      this.routePanel.innerHTML = `
        <div id="route-panel-header">
          <span id="route-panel-title">Route Manager</span>
          <obc-icon-button id="route-panel-toggle" title="Collapse"><obi-chevron-double-right-google></obi-chevron-double-right-google></obc-icon-button>
        </div>
        <div id="route-toolbar" style="padding:10px 15px 0 15px; display:flex; gap:6px; align-items:center;">
          <obc-icon-button id="route-toolbar-start" title="Start New Route"><obi-navigation-route></obi-navigation-route></obc-icon-button>
          <obc-icon-button id="route-toolbar-stop" title="End Route" disabled><obi-generic-line-end-point></obi-generic-line-end-point></obc-icon-button>
          <obc-icon-button id="route-toolbar-export" title="Export GPX"><obi-route-export-iec></obi-route-export-iec></obc-icon-button>
        </div>
        <div id="route-panel-body">
          <div id="active-route-edit"></div>
          <div id="working-routes-section" style="display:none;">
            <h3>Working Routes</h3>
            <div id="working-routes-list"></div>
          </div>
          <div id="provided-routes-section" style="display:none;">
            <label for="provided-routes-list">Provided Routes</label>
            <div id="provided-routes-list"></div>
          </div>
        </div>
      `;
      document.body.appendChild(this.routePanel);
    }

    // Always update the lists, not replace the panel.
    const activeRouteEdit = this.routePanel.querySelector(
      "#active-route-edit",
    ) as HTMLElement;

    // Render the active route section if there is an active route.
    if (this.activeRouteIndex >= 0 && this.savedRoutes[this.activeRouteIndex]) {
      activeRouteEdit.innerHTML = `
        <div style="margin-bottom:10px;">
          <obc-input id="route-name-input" value="${this.routeName}" style="width:90%;margin-top:3px;" label="Route Name:"></obc-input>
        </div>
        <div id="route-waypoint-list"></div>
        <div id="route-total-length" style="margin-top:12px;font-weight:600;"></div>
        <div id="route-save-btn">Save</div>
      `;
    } else {
      activeRouteEdit.innerHTML = `<div style="color:#888;font-style:italic;">No active route</div>`;
    }

    // toggle
    const toggleBtn = this.routePanel.querySelector(
      "#route-panel-toggle",
    ) as HTMLButtonElement;
    toggleBtn.onclick = () => {
      this.collapsed = !this.collapsed;
      if (this.collapsed) {
        this.routePanel.classList.add("collapsed");
        toggleBtn.innerHTML = "<obi-route></obi-route>";
        toggleBtn.title = "Expand";
      } else {
        this.routePanel.classList.remove("collapsed");
        toggleBtn.innerHTML =
          "<obi-chevron-double-right-google></obi-chevron-double-right-google>";
        toggleBtn.title = "Collapse";
      }
    };

    // name input
    const nameInput = this.routePanel.querySelector(
      "#route-name-input",
    ) as HTMLElement;
    if (nameInput) {
      nameInput.addEventListener("input", () => {
        this.routeName = (nameInput as any).value;
        this._updateRoutePanel();
      });
    }

    // toolbar
    const startBtn = this.routePanel.querySelector(
      "#route-toolbar-start",
    ) as HTMLButtonElement;
    const stopBtn = this.routePanel.querySelector(
      "#route-toolbar-stop",
    ) as HTMLButtonElement;
    const exportBtn = this.routePanel.querySelector(
      "#route-toolbar-export",
    ) as HTMLButtonElement;

    startBtn.onclick = () => {
      this.drawing = true;
      startBtn.disabled = true;
      stopBtn.disabled = false;
      activeRouteEdit.innerHTML = `<div style="margin-bottom:10px;" >
      <label for="obc-input">Active Route:</label>
        <obc-input id="route-name-input" value="${this.routeName}" style="width:90%;margin-top:3px;" label="Route Name:"> </obc-input>
          </div>
          <div id="route-waypoint-list"> </div>
            <div id="route-total-length" style="margin-top:12px;font-weight:600;"> </div>
        <div id="route-save-btn"> </div>`;

      // clear editor state
      for (const m of this.markers) m.remove();
      this.markers = [];
      this.waypoints = [];
      this.waypointNames = [];

      // create new empty saved route and set active
      this.routeName = `Route ${this.savedRoutes.length + 1}`;
      this.savedRoutes.push({
        name: this.routeName,
        waypoints: [],
        waypointNames: [],
        visible: true,
        active: true,
      });
      this.activeRouteIndex = this.savedRoutes.length - 1;
      this.savedRoutes.forEach(
        (r, i) => (r.active = i === this.activeRouteIndex),
      );
      // no route layers created yet — _updateRouteSource updates editor only
      this._syncActiveRouteToEditor(this.savedRoutes);
      this._renderSavedRoutes();
      this._renderProvidedRoutes();
      this._updateRoutePanel();
      this._updateRouteSource();
      this.updateActiveRouteData(this.waypoints);
    };

    stopBtn.onclick = () => {
      this.drawing = false;
      startBtn.disabled = false;
      stopBtn.disabled = true;
      //if (this.activeRouteIndex >= 0 && this.savedRoutes[this.activeRouteIndex]) {
      //  this.savedRoutes[this.activeRouteIndex].active = false;
      //}
      this.activeRouteIndex = -1;
      this._finalizeCurrentRoute(this.savedRoutes);
      this._renderSavedRoutes();
      this._renderProvidedRoutes();
      this._updateRoutePanel();
      // this.updateActiveRouteData(this.waypoints);
    };

    exportBtn.onclick = () => {
      if (
        this.activeRouteIndex >= 0 &&
        this.activeRouteIndex < this.savedRoutes.length
      ) {
        // Use the modular exportSavedRoute function
        exportRoute(this.savedRoutes[this.activeRouteIndex]);
      } else {
        // fallback to editor export
        exportGpx(this.routeName, this.waypoints);
      }
    };

    map.on("click", (e) => {
      if (!this.drawing) return;
      const p: [number, number] = [e.lngLat.lng, e.lngLat.lat];
      this.addWaypoint(p);
    });

    // create editor source/layers if needed
    if (!map.getSource("route")) {
      map.addSource("route", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "route-line",
        type: "line",
        source: "route",
        paint: {
          "line-color": getCssVar("--obc-blue-200", "#88b1e7"),
          "line-width": 4,
        },
      });
      map.addLayer({
        id: "route-waypoints",
        type: "circle",
        source: "route",
        paint: {
          "circle-radius": 8,
          "circle-color": getCssVar("--obc-blue-100", "#cfe2fa"),
          "circle-stroke-color": "#fff",
          "circle-stroke-width": 2,
        },
      });
    }

    // context menu on editor line (marker elements also get contextmenu)
    map.on("contextmenu", "route-line", (e) => {
      e.preventDefault();
      this._showContextMenu("line", e);
    });

    map.on("contextmenu", "route-waypoints", (e) => {
      e.preventDefault();
      this._showContextMenu("waypoint", e);
    });

    // load saved routes (provided)
    this._loadProvidedRoutes();
    this._updateRoutePanel();

    return this.container;
  }

  // central marker creation used by both sync and editor insertion
  private _createMarkerAt(
    idx: number,
    coord: [number, number],
    name = "",
    insert = false,
  ) {
    if (!this.map) return;
    const el = document.createElement("div");
    el.style.cssText =
      "width:15px;height:15px;background:#0077b6;border-radius:50%;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.18);cursor:pointer;transition:box-shadow .12s;";
    if (name) el.setAttribute("title", name);
    const marker = new maplibregl.Marker({ element: el, draggable: true })
      .setLngLat(coord)
      .addTo(this.map);

    el.addEventListener("mouseenter", () => {
      el.style.boxShadow = "0 0 8px rgba(0,68,119,0.6)";
      this.map!.getCanvas().style.cursor = "move";
    });
    el.addEventListener("mouseleave", () => {
      el.style.boxShadow = "0 1px 4px rgba(0,0,0,0.18)";
      this.map!.getCanvas().style.cursor = "";
    });

    marker.on("drag", () => {
      const newPos = marker.getLngLat();
      const index = this.markers.indexOf(marker);
      if (index !== -1) {
        this.waypoints[index] = [newPos.lng, newPos.lat];
        if (
          this.activeRouteIndex >= 0 &&
          this.activeRouteIndex < this.savedRoutes.length
        ) {
          this.savedRoutes[this.activeRouteIndex].waypoints[index] = [
            newPos.lng,
            newPos.lat,
          ];
        }
        // update editor source and panel live
        this._updateRouteSource();
        this.updateActiveRouteData(this.waypoints);
        this._updateRoutePanel();
        this._finalizeCurrentRoute(this.savedRoutes);
      }
    });

    // right click / long press handled via DOM contextmenu
    el.addEventListener("contextmenu", (evt) => {
      evt.preventDefault();
      evt.stopPropagation();
      const synthetic = {
        lngLat: marker.getLngLat(),
        originalEvent: evt,
      } as unknown as maplibregl.MapMouseEvent;
      this._showContextMenu("waypoint", synthetic);
    });

    if (insert) this.markers.splice(idx, 0, marker);
    else this.markers[idx] = marker;
  }

  addWaypoint(coord: [number, number]) {
    if (!this.map) return;
    // ensure an active route exists
    if (
      this.activeRouteIndex < 0 ||
      this.activeRouteIndex >= this.savedRoutes.length
    ) {
      // create new saved route and become active
      this.routeName = `Route ${this.savedRoutes.length + 1}`;
      this.savedRoutes.push({
        name: this.routeName,
        waypoints: [],
        waypointNames: [],
        visible: true,
        active: true,
      });
      this.activeRouteIndex = this.savedRoutes.length - 1;
      this.savedRoutes.forEach(
        (r, i) => (r.active = i === this.activeRouteIndex),
      );
    }

    // push and make marker
    this.waypoints.push(coord);
    this.waypointNames.push("");
    const idx = this.waypoints.length - 1;
    this._createMarkerAt(idx, coord, "", false);

    // reflect into saved route being edited
    if (
      this.activeRouteIndex >= 0 &&
      this.activeRouteIndex < this.savedRoutes.length
    ) {
      const r = this.savedRoutes[this.activeRouteIndex];
      r.waypoints = this.waypoints.map((p) => [...p]);
      r.waypointNames = [...this.waypointNames];
    }

    this._updateRouteSource();
    this.updateActiveRouteData(this.waypoints);
    this._updateRoutePanel();
  }

  private _addWaypointAtNearestSegment(coord: [number, number]) {
    if (!this.map) return;
    if (this.waypoints.length < 2) {
      this.addWaypoint(coord);
      return;
    }
    let minDist = Infinity;
    let insertIndex = 0;
    for (let i = 0; i < this.waypoints.length - 1; i++) {
      const dist = this._pointToSegmentDistance(
        coord,
        this.waypoints[i],
        this.waypoints[i + 1],
      );
      if (dist < minDist) {
        minDist = dist;
        insertIndex = i + 1;
      }
    }
    this.waypoints.splice(insertIndex, 0, coord);
    this.waypointNames.splice(insertIndex, 0, "");
    this._createMarkerAt(insertIndex, coord, "", true);

    if (
      this.activeRouteIndex >= 0 &&
      this.activeRouteIndex < this.savedRoutes.length
    ) {
      this.savedRoutes[this.activeRouteIndex].waypoints = this.waypoints.map(
        (p) => [...p],
      );
      this.savedRoutes[this.activeRouteIndex].waypointNames = [
        ...this.waypointNames,
      ];
    }

    this._updateRouteSource();
    this.updateActiveRouteData(this.waypoints);
    this._updateRoutePanel();
  }

  private _updateRouteSource() {
    if (!this.map) return;
    const features: any[] = [];
    if (this.waypoints.length >= 2) {
      features.push({
        type: "Feature",
        geometry: { type: "LineString", coordinates: this.waypoints },
        properties: {},
      });
    }
    for (let i = 0; i < this.waypoints.length; ++i) {
      features.push({
        type: "Feature",
        geometry: { type: "Point", coordinates: this.waypoints[i] },
        properties: { name: this.waypointNames[i] || "" },
      });
    }
    const src = this.map.getSource("route") as
      | maplibregl.GeoJSONSource
      | undefined;
    if (src) src.setData({ type: "FeatureCollection", features });
    // update titles on markers
    for (let i = 0; i < this.markers.length; ++i) {
      const el = this.markers[i]?.getElement();
      if (el) el.setAttribute("title", this.waypointNames[i] || "");
    }
  }
  updateActiveRouteData(updatedCoords: [number, number][]) {
    // keep the rest of the app's structures happy:
    if (
      this.activeRouteIndex >= 0 &&
      this.activeRouteIndex < this.savedRoutes.length
    ) {
      // update savedRoutes active route if present
      const route = this.savedRoutes[this.activeRouteIndex];
      if (route) route.waypoints = updatedCoords.map((p) => [...p]);
    }
    // refresh editor source(s)
    if (typeof (this as any)._updateRouteSources === "function") {
      (this as any)._updateRouteSources();
    } else if (typeof this._updateRouteSource === "function") {
      this._updateRouteSource();
    }
  }
  private _updateRoutePanel() {
    if (!this.routePanel) return;
    const nameInput = this.routePanel.querySelector(
      "#route-name-input",
    ) as HTMLElement;
    if (nameInput) {
      nameInput.addEventListener("blur", () => {
        this.routeName = (nameInput as any).value;
        if (
          this.activeRouteIndex >= 0 &&
          this.activeRouteIndex < this.savedRoutes.length
        ) {
          this.savedRoutes[this.activeRouteIndex].name = this.routeName;
          this._renderSavedRoutes();
        }
      });
    }

    // if (document.activeElement !== nameInput) nameInput.value = this.routeName;

    const listDiv = this.routePanel.querySelector(
      "#route-waypoint-list",
    ) as HTMLElement;
    if (!listDiv) return;
    if (this.waypoints.length === 0) {
      listDiv.innerHTML = `<div style="color:#888;font-style:italic;">No waypoints</div>`;
    } else {
      let html = `<table class="route-wp-table"><thead><tr><th>#</th><th>Name</th><th>Lat/Lon</th><th>Bearing</th><th>Dist</th><th></th></tr></thead><tbody>`;
      let total = 0;
      for (let i = 0; i < this.waypoints.length; ++i) {
        const [lon, lat] = this.waypoints[i];
        const name = this.waypointNames[i] || "";
        let bearing = "";
        let dist = "";
        if (i > 0) {
          bearing = this._calculateBearing(
            this.waypoints[i - 1],
            this.waypoints[i],
          );
          const d = haversineNm(this.waypoints[i - 1], this.waypoints[i]);
          dist = d.toFixed(2);
          total += d;
        }
        html += `<tr>
          <td>${i + 1}</td>
          <td><obc-input class="wp-name-input" value="${name}" data-idx="${i}" style="width:80px;"></obc-input></td>
          <td style="font-family:monospace;font-size:12px;">${formatLatLonForDisplay(lat, lon)}</td>
          <td style="text-align:center;">${bearing}</td>
          <td style="text-align:right;">${dist ? dist + " NM" : ""}</td>
          <td><button class="wp-delete-btn" title="Delete" data-idx="${i}" style="padding:2px 6px;">✖</button></td>
        </tr>`;
      }
      html += "</tbody></table>";
      listDiv.innerHTML = html;

      listDiv.querySelectorAll(".wp-name-input").forEach((input) => {
        input.addEventListener("input", (e) => {
          const idx = parseInt((e.target as HTMLElement).dataset.idx!);
          // For obc-input, get value from the element itself
          this.waypointNames[idx] = (e.target as any).value;
          if (
            this.activeRouteIndex >= 0 &&
            this.activeRouteIndex < this.savedRoutes.length
          ) {
            this.savedRoutes[this.activeRouteIndex].waypointNames[idx] =
              this.waypointNames[idx];
          }
          this._updateRouteSource();
          this.updateActiveRouteData(this.waypoints);
        });
      });
      listDiv.querySelectorAll(".wp-delete-btn").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          const idx = parseInt((e.target as HTMLElement).dataset.idx!);
          this._deleteWaypoint(idx);
        });
      });
    }

    const totDiv = this.routePanel.querySelector(
      "#route-total-length",
    ) as HTMLElement;
    let tot = 0;
    for (let i = 1; i < this.waypoints.length; ++i)
      tot += haversineNm(this.waypoints[i - 1], this.waypoints[i]);
    totDiv.textContent = `Total: ${tot.toFixed(2)} NM`;

    this._renderSavedRoutes();
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

  private _deleteWaypoint(idx: number) {
    if (idx < 0 || idx >= this.waypoints.length) return;
    this.markers[idx]?.remove();
    this.markers.splice(idx, 1);
    this.waypoints.splice(idx, 1);
    this.waypointNames.splice(idx, 1);
    if (
      this.activeRouteIndex >= 0 &&
      this.activeRouteIndex < this.savedRoutes.length
    ) {
      const r = this.savedRoutes[this.activeRouteIndex];
      r.waypoints = this.waypoints.map((p) => [...p]);
      r.waypointNames = [...this.waypointNames];
    }
    this._updateRouteSource();
    this.updateActiveRouteData(this.waypoints);
    this._updateRoutePanel();
    this._finalizeCurrentRoute(this.savedRoutes);
  }

  onRemove() {
    if (this.routePanel) this.routePanel.remove();
    if (!this.map) return;
    for (let i = 0; i < this.savedRoutes.length; ++i)
      this._removeRouteLayers(i, this.savedRoutes);
  }

  private _showContextMenu(
    type: "line" | "waypoint",
    e: maplibregl.MapMouseEvent,
  ) {
    if (!this.map) return;
    const existing = document.getElementById("route-context-menu");
    if (existing) existing.remove();
    const menu = document.createElement("div");
    menu.id = "route-context-menu";
    menu.style.position = "absolute";
    menu.style.background = "#fff";
    menu.style.border = "1px solid #a4b5c2";
    menu.style.borderRadius = "6px";
    menu.style.padding = "4px 0";
    menu.style.fontFamily = "inherit";
    menu.style.fontSize = "15px";
    menu.style.boxShadow = "0 2px 8px rgba(0,0,0,0.14)";
    menu.style.zIndex = "10000";

    const rect = this.map.getContainer().getBoundingClientRect();
    const left = (e.originalEvent as MouseEvent).clientX - rect.left;
    const top = (e.originalEvent as MouseEvent).clientY - rect.top;
    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;

    const createMenuItem = (
      iconTag: string,
      label: string,
      onClick: () => void,
    ) => {
      const item = document.createElement("div");
      item.style.display = "flex";
      item.style.alignItems = "center";
      item.style.gap = "8px";
      item.style.padding = "7px 18px";
      item.style.cursor = "pointer";
      item.style.userSelect = "none";
      item.addEventListener(
        "mouseenter",
        () => (item.style.background = "#e0efff"),
      );
      item.addEventListener(
        "mouseleave",
        () => (item.style.background = "transparent"),
      );
      item.addEventListener("click", () => {
        onClick();
        menu.remove();
      });

      // Create the icon button
      const iconBtn = document.createElement("obc-icon-button");
      iconBtn.innerHTML = `<${iconTag} size="small"></${iconTag}>`;
      iconBtn.style.pointerEvents = "none"; // prevent double click
      iconBtn.style.marginRight = "0px";
      iconBtn.style.width = "auto";
      iconBtn.style.height = "auto";
      iconBtn.style.display = "flex";
      iconBtn.style.alignItems = "center";
      iconBtn.style.justifyContent = "center";

      // Label span
      const labelSpan = document.createElement("span");
      labelSpan.textContent = label;
      labelSpan.className = "context-menu-label";
      labelSpan.style.paddingLeft = "6px";

      item.style.padding = "4px 12px";
      item.appendChild(iconBtn);
      item.appendChild(labelSpan);

      return item;
    };

    if (type === "line") {
      menu.appendChild(
        createMenuItem("obi-waypoint-add-iec", "Add Waypoint", () => {
          const coord: [number, number] = [e.lngLat.lng, e.lngLat.lat];
          this._addWaypointAtNearestSegment(coord);
        }),
      );
    } else {
      const clickCoord: [number, number] = [e.lngLat.lng, e.lngLat.lat];
      let nearestIndex = -1;
      let minDist = Infinity;
      for (let i = 0; i < this.waypoints.length; i++) {
        const wp = this.waypoints[i];
        const dist = Math.hypot(wp[0] - clickCoord[0], wp[1] - clickCoord[1]);
        if (dist < minDist) {
          minDist = dist;
          nearestIndex = i;
        }
      }
      if (nearestIndex === -1) return;
      menu.appendChild(
        createMenuItem("obi-waypoint-edit-iec", "Name Waypoint", () => {
          const currentName = this.waypointNames[nearestIndex] || "";
          const newName = prompt("Enter waypoint name:", currentName);
          if (newName !== null) {
            this.waypointNames[nearestIndex] = newName;
            const marker = this.markers[nearestIndex];
            if (marker) marker.getElement().setAttribute("title", newName);
            if (
              this.activeRouteIndex >= 0 &&
              this.activeRouteIndex < this.savedRoutes.length
            ) {
              this.savedRoutes[this.activeRouteIndex].waypointNames[
                nearestIndex
              ] = newName;
            }
            this._updateRouteSource();
            this.updateActiveRouteData(this.waypoints);
            this._updateRoutePanel();
          }
        }),
      );
      menu.appendChild(
        createMenuItem("obi-waypoint-delete-iec", "Delete Waypoint", () => {
          this._deleteWaypoint(nearestIndex);
        }),
      );
    }

    // Responsive: hide label on small screens
    const styleTag = document.createElement("style");
    styleTag.textContent = `
      @media (max-width: 600px) {
        .context-menu-label { display: none; }
      }
      @media (min-width: 601px) {
        .context-menu-label { display: inline; }
      }
    `;
    menu.appendChild(styleTag);

    this.map.getContainer().appendChild(menu);
    const onClickOutside = (ev: MouseEvent) => {
      if (!menu.contains(ev.target as Node)) {
        menu.remove();
        document.removeEventListener("click", onClickOutside);
      }
    };
    document.addEventListener("click", onClickOutside);
  }

  private _pointToSegmentDistance(
    p: [number, number],
    v: [number, number],
    w: [number, number],
  ) {
    const [px, py] = p;
    const [vx, vy] = v;
    const [wx, wy] = w;
    const l2 = (wx - vx) ** 2 + (wy - vy) ** 2;
    if (l2 === 0) return Math.hypot(px - vx, py - vy);
    let t = ((px - vx) * (wx - vx) + (py - vy) * (wy - vy)) / l2;
    t = Math.max(0, Math.min(1, t));
    const projx = vx + t * (wx - vx);
    const projy = vy + t * (wy - vy);
    return Math.hypot(px - projx, py - projy);
  }

  // more robust provided route loader with logs — expects /routes/index.json or route1.gpx etc.
  private async _loadProvidedRoutes() {
    const providedDiv = this.routePanel?.querySelector(
      "#provided-routes-section",
    ) as HTMLElement;
    if (!this.map) return;
    console.debug("[routes] loading provided routes...");
    const routePath = import.meta.env.VITE_ROUTE_PATH;
    let gpxFiles: string[] = [];
    try {
      const indexResp = await fetch(`${routePath}/index.json`);
      if (indexResp.ok) {
        gpxFiles = await indexResp.json();
        console.debug("[routes] index.json found:", gpxFiles);
      }
    } catch (err) {
      console.debug(
        "[routes] no index.json or fetch failed, falling back to enumeration",
      );
    }

    if (gpxFiles.length === 0) {
      // try common names route1..route10
      for (let i = 1; i <= 10; i++) {
        try {
          const u = `${routePath}/route${i}.gpx`;
          const r = await fetch(u, { method: "HEAD" });
          if (r.ok) {
            gpxFiles.push(`route${i}.gpx`);
          }
        } catch {
          /* ignore */
        }
      }
    }

    if (gpxFiles.length === 0)
      console.debug("[routes] no provided GPX files discovered in ", routePath);

    for (const fname of gpxFiles) {
      try {
        const resp = await fetch(`${routePath}/${fname}`);
        if (!resp.ok) {
          console.warn(`[routes] failed to fetch ${fname}: ${resp.status}`);
          continue;
        }
        const xml = await resp.text();
        const parsed = this._parseGpxToWaypoints(xml);
        if (parsed.waypoints.length > 0) {
          this.providedRoutes.push({
            name: parsed.name || fname.replace(/\.gpx$/i, ""),
            waypoints: parsed.waypoints,
            waypointNames: parsed.waypointNames,
            visible: false,
            active: false,
            provided: true,
          });
          console.debug(
            `[routes] loaded ${fname} (${parsed.waypoints.length} wpts) `,
          );
          providedDiv.style.display = "block";
        }
      } catch (err) {
        console.warn(`[routes] error reading ${fname}`, err);
      }
    }
    this._renderProvidedRoutes();
  }

  private _parseGpxToWaypoints(xml: string): {
    name: string;
    waypoints: [number, number][];
    waypointNames: string[];
  } {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, "application/xml");
    let name = "";
    let waypoints: [number, number][] = [];
    let waypointNames: string[] = [];
    const rtepts = Array.from(doc.getElementsByTagName("rtept"));
    if (rtepts.length > 0) {
      waypoints = rtepts.map((el) => [
        parseFloat(el.getAttribute("lon") || "0"),
        parseFloat(el.getAttribute("lat") || "0"),
      ]);
      waypointNames = rtepts.map((el) => {
        const n = el.getElementsByTagName("name");
        return n.length > 0 ? n[0].textContent || "" : "";
      });
    } else {
      const trkpts = Array.from(doc.getElementsByTagName("trkpt"));
      waypoints = trkpts.map((el) => [
        parseFloat(el.getAttribute("lon") || "0"),
        parseFloat(el.getAttribute("lat") || "0"),
      ]);
      waypointNames = trkpts.map(() => "");
    }
    const nameElem = doc.querySelector("rte > name, trk > name, gpx > name");
    if (nameElem && nameElem.textContent) name = nameElem.textContent;
    return { name, waypoints, waypointNames };
  }

  private _renderSavedRoutes() {
    const listDiv = this.routePanel?.querySelector(
      "#working-routes-list",
    ) as HTMLElement;
    const workingDiv = this.routePanel?.querySelector(
      "#working-routes-section",
    ) as HTMLElement;
    if (!listDiv) return;
    listDiv.innerHTML = "";
    if (this.savedRoutes.length === 0) {
      listDiv.innerHTML = `<div style="color:#888;font-style:italic;">No working routes</div>`;
      return;
    } else {
      workingDiv.style.display = "block";
    }
    this.savedRoutes.forEach((route, idx) => {
      const div = document.createElement("div");
      div.className = "route-item" + (route.active ? " active" : "");

      // Visibility toggle button (OpenBridge)
      const visibleBtn = document.createElement("obc-icon-button");
      visibleBtn.title = route.visible ? "Hide on Chart" : "Show on Chart";
      visibleBtn.innerHTML = route.visible
        ? `<obi-checkbox-checked-filled size="small"></obi-checkbox-checked-filled>`
        : `<obi-checkbox-uncheck-google size="small"></obi-checkbox-uncheck-google>`;
      visibleBtn.onclick = (ev) => {
        ev.stopPropagation();
        this._toggleRouteVisibility(idx, this.savedRoutes, "saved");
        // Update icon and title after toggling
        const isVisible = this.savedRoutes[idx].visible;
        visibleBtn.innerHTML = isVisible
          ? `<obi-checkbox-checked-filled size="small"></obi-checkbox-checked-filled>`
          : `<obi-checkbox-uncheck-google size="small"></obi-checkbox-uncheck-google>`;
        visibleBtn.title = isVisible ? "Hide on Chart" : "Show on Chart";
      };

      // Route name span
      const nameSpan = document.createElement("span");
      nameSpan.textContent = route.name;
      nameSpan.style.flex = "1";
      nameSpan.style.userSelect = "none";
      nameSpan.style.marginLeft = "5px";
      nameSpan.style.fontWeight = route.active ? "700" : "500";

      let expanded = !!route.active;
      const detailsDiv = document.createElement("div");
      detailsDiv.className = "route-item-details";
      detailsDiv.style.display = expanded ? "block" : "none";
      detailsDiv.innerHTML = `Waypoints: ${route.waypoints.length}<br>Total: ${this._routeTotalDistance(route).toFixed(2)} NM`;

      nameSpan.onclick = (ev) => {
        ev.stopPropagation();
        expanded = !expanded;
        detailsDiv.style.display = expanded ? "block" : "none";
        this._setActiveRoute(idx, this.savedRoutes);
      };

      // Actions
      const actions = document.createElement("span");
      actions.className = "route-actions";

      // Export button (OpenBridge)
      const exportBtn = document.createElement("obc-icon-button");
      exportBtn.id = `route-export-${route.name.replace(/[^a-zA-Z0-9]/g, "_")}`;
      exportBtn.title = `Export Route ${route.name}`;
      exportBtn.innerHTML = `<obi-route-export-iec></obi-route-export-iec>`;
      exportBtn.onclick = (ev) => {
        ev.stopPropagation();
        exportRoute(route);
      };

      // Delete button (OpenBridge)

      const delBtn = document.createElement("obc-icon-button");
      delBtn.id = `route-delete-${route.name.replace(/[^a-zA-Z0-9]/g, "_")}`;
      delBtn.title = `Delete Route ${route.name}`;
      delBtn.innerHTML = `<obi-delete-google></obi-delete-google>`;
      delBtn.onclick = (ev) => {
        ev.stopPropagation();
        this._deleteSavedRoute(idx, this.savedRoutes);
      };
      actions.appendChild(delBtn);

      actions.appendChild(exportBtn);

      div.appendChild(visibleBtn);
      div.appendChild(nameSpan);
      div.appendChild(actions);
      div.appendChild(detailsDiv);

      div.onclick = () => {
        expanded = !expanded;
        detailsDiv.style.display = expanded ? "block" : "none";
        this._setActiveRoute(idx, this.savedRoutes);
      };

      listDiv.appendChild(div);
    });

    // Dynamic name updating on blur
    const nameInput = this.routePanel.querySelector(
      "#route-name-input",
    ) as HTMLElement;
    if (nameInput) {
      nameInput.addEventListener("blur", () => {
        // For obc-input, get value from the element itself
        this.routeName = (nameInput as any).value;
        if (
          this.activeRouteIndex >= 0 &&
          this.activeRouteIndex < this.savedRoutes.length
        ) {
          this.savedRoutes[this.activeRouteIndex].name = this.routeName;
          this._renderSavedRoutes();
        }
      });
    }
  }
  private _renderProvidedRoutes() {
    const listDiv = this.routePanel?.querySelector(
      "#provided-routes-list",
    ) as HTMLElement;
    if (!listDiv) return;
    listDiv.innerHTML = "";
    if (this.providedRoutes.length === 0) {
      listDiv.innerHTML = `<div style="color:#888;font-style:italic;">Error loading provided routes.</div>`;
      return;
    }
    this.providedRoutes.forEach((route, idx) => {
      const div = document.createElement("div");
      div.className = "route-item";

      // Visibility toggle button (OpenBridge)
      const visibleBtn = document.createElement("obc-icon-button");
      visibleBtn.title = route.visible ? "Hide on Chart" : "Show on Chart";
      visibleBtn.innerHTML = route.visible
        ? `<obi-checkbox-checked-filled size="small"></obi-checkbox-checked-filled>`
        : `<obi-checkbox-uncheck-google size="small"></obi-checkbox-uncheck-google>`;
      visibleBtn.onclick = (ev) => {
        ev.stopPropagation();
        this._toggleRouteVisibility(idx, this.providedRoutes, "provided");
        // Update icon and title after toggling
        const isVisible = route.visible;
        visibleBtn.innerHTML = isVisible
          ? `<obi-checkbox-checked-filled size="small"></obi-checkbox-checked-filled>`
          : `<obi-checkbox-uncheck-google size="small"></obi-checkbox-uncheck-google>`;
        visibleBtn.title = isVisible ? "Hide on Chart" : "Show on Chart";
      };

      // Route name span
      const nameSpan = document.createElement("span");
      nameSpan.textContent = route.name + " (copy - rename)";
      nameSpan.style.flex = "1";
      nameSpan.style.userSelect = "none";
      nameSpan.style.marginLeft = "5px";
      nameSpan.style.fontWeight = "500";

      let expanded = !!route.selected;
      const detailsDiv = document.createElement("div");
      detailsDiv.className = "route-item-details";
      detailsDiv.style.display = expanded ? "block" : "none";
      detailsDiv.innerHTML = `Waypoints: ${route.waypoints.length}<br>Total: ${this._routeTotalDistance(route).toFixed(2)} NM`;

      nameSpan.onclick = (ev) => {
        ev.stopPropagation();
        expanded = !expanded;
        detailsDiv.style.display = expanded ? "block" : "none";
        this._setSelectedRoute(idx, this.providedRoutes);
      };

      // Actions
      const actions = document.createElement("span");
      actions.className = "route-actions";
      // Load / Copy to Working button
      const loadBtn = document.createElement("obc-icon-button");
      loadBtn.title = `Load ${route.name} to Working Routes`;
      loadBtn.innerHTML = `<obi-load-iec></obi-load-iec>`;
      loadBtn.onclick = (ev) => {
        ev.stopPropagation();
        this._copyProvidedRouteToWorking(idx, route);
      };
      actions.appendChild(loadBtn);
      // Export button (OpenBridge)
      const exportBtn = document.createElement("obc-icon-button");
      exportBtn.id = `route-export-${route.name.replace(/[^a-zA-Z0-9]/g, "_")}`;
      exportBtn.title = `Export Route ${route.name}`;
      exportBtn.innerHTML = `<obi-route-export-iec></obi-route-export-iec>`;
      exportBtn.onclick = (ev) => {
        ev.stopPropagation();
        exportRoute(route);
      };

      actions.appendChild(exportBtn);

      div.appendChild(visibleBtn);
      div.appendChild(nameSpan);
      div.appendChild(actions);
      div.appendChild(detailsDiv);

      div.onclick = () => {
        expanded = !expanded;
        detailsDiv.style.display = expanded ? "block" : "none";
        this._setActiveRoute(idx, this.providedRoutes);
      };
      listDiv.appendChild(div);
    });
  }
  private _setActiveRoute(index: number, routes: any[]) {
    if (index < 0 || index >= routes.length) return;
    routes.forEach((r: any, i: number) => (r.active = i === index));
    this.activeRouteIndex = index;
    this._syncActiveRouteToEditor(routes);
    // render lists relevant to that routes array:
    if (routes === this.savedRoutes) this._renderSavedRoutes();
    else if (routes === this.providedRoutes) this._renderProvidedRoutes();
    this._updateRoutePanel();
    this._updateRouteSource();
    this.updateActiveRouteData(this.waypoints);
  }
  private _setSelectedRoute(index: number, routes: any[]) {
    if (index < 0 || index >= routes.length) return;
    routes.forEach((r, i) => (r.active = i === index));
    this.activeRouteIndex = index;
    this._syncActiveRouteToEditor(routes);
    this._renderSavedRoutes();
    this._updateRoutePanel();
    this._updateRouteSource();
    this.updateActiveRouteData(this.waypoints);
  }
  private _syncActiveRouteToEditor(routes: any[]) {
    // remove old markers
    for (const m of this.markers) m.remove();
    this.markers = [];

    if (
      this.activeRouteIndex >= 0 &&
      routes &&
      this.activeRouteIndex < routes.length
    ) {
      const route = routes[this.activeRouteIndex];
      this.routeName = route.name || "";
      this.waypoints = route.waypoints.map((p: any) => [...p]);
      this.waypointNames = (route.waypointNames || []).map((n: any) => n);
      for (let i = 0; i < this.waypoints.length; ++i)
        this._createMarkerAt(
          i,
          this.waypoints[i],
          this.waypointNames[i] || "",
          false,
        );
      this._updateRouteSource();
      this.updateActiveRouteData(this.waypoints);
    } else {
      this.routeName = "";
      this.waypoints = [];
      this.waypointNames = [];
      this.markers.forEach((m) => m.remove());
      this.markers = [];
    }
  }

  private _toggleRouteVisibility(index: number, routes: any[], ns = "saved") {
    if (!this.map) return;
    if (!routes || index < 0 || index >= routes.length) return;
    const route = routes[index];
    route.visible = !route.visible;
    if (route.visible) this._addRouteLayers(index, routes, ns);
    else this._removeRouteLayers(index, routes, ns);

    // optionally fit to bounds if route now visible
    if (route.visible && route.waypoints?.length > 0) {
      const bounds = new maplibregl.LngLatBounds();
      route.waypoints.forEach((p: [number, number]) => bounds.extend(p));
      fitMapToBounds(this.map!, bounds);
    }

    // re-render only the list you updated to avoid reentrancy
    if (routes === this.providedRoutes) this._renderProvidedRoutes();
    else if (routes === this.savedRoutes) this._renderSavedRoutes();
  }
  // use this version of _addRouteLayers
  private _addRouteLayers(index: number, routes: any[], ns = "saved") {
    if (!this.map) return;
    if (!routes || index < 0 || index >= routes.length) return;
    const route = routes[index];

    // remove any existing layers/sources for that (index,ns)
    this._removeRouteLayers(index, routes, ns);

    const sourceId = `route-src-${ns}-${index}`;
    const lineLayerId = `route-line-${ns}-${index}`;
    const pointLayerId = `route-points-${ns}-${index}`;

    const features: any[] = [];
    if (route.waypoints?.length >= 2)
      features.push({
        type: "Feature",
        geometry: { type: "LineString", coordinates: route.waypoints },
        properties: {},
      });
    for (let i = 0; i < (route.waypoints?.length || 0); ++i)
      features.push({
        type: "Feature",
        geometry: { type: "Point", coordinates: route.waypoints[i] },
        properties: { name: route.waypointNames?.[i] || "" },
      });

    try {
      this.map.addSource(sourceId, {
        type: "geojson",
        data: { type: "FeatureCollection", features },
      });
      this.map.addLayer({
        id: lineLayerId,
        type: "line",
        source: sourceId,
        paint: {
          "line-color": "#0077b6",
          "line-width": 3,
          "line-dasharray": [2, 2],
        },
      });
      this.map.addLayer({
        id: pointLayerId,
        type: "circle",
        source: sourceId,
        paint: {
          "circle-radius": 6,
          "circle-color": "#2a7ecf",
          "circle-stroke-color": "#fff",
          "circle-stroke-width": 2,
        },
      });
      route.sourceId = sourceId;
      route.lineLayerId = lineLayerId;
      route.pointLayerId = pointLayerId;
    } catch (err) {
      console.warn("[routes] failed to add route layers", ns, index, err);
    }
  }

  // use this version of _removeRouteLayers
  private _removeRouteLayers(index: number, routes: any[], ns = "saved") {
    if (!this.map) return;
    if (!routes || index < 0 || index >= routes.length) return;
    const route = routes[index];
    if (!route) return;
    try {
      // Use stored ids if present; fall back to namespaced ids
      const lineId = route.lineLayerId || `route-line-${ns}-${index}`;
      const pointId = route.pointLayerId || `route-points-${ns}-${index}`;
      const srcId = route.sourceId || `route-src-${ns}-${index}`;

      if (lineId && this.map.getLayer(lineId)) this.map.removeLayer(lineId);
      if (pointId && this.map.getLayer(pointId)) this.map.removeLayer(pointId);
      if (srcId && this.map.getSource(srcId)) this.map.removeSource(srcId);
    } catch (err) {
      console.warn("[routes] error removing layers", ns, index, err);
    }
    // clear stored ids
    route.lineLayerId = undefined;
    route.pointLayerId = undefined;
    route.sourceId = undefined;
  }
  private _deleteSavedRoute(index: number, routes: any[]) {
    if (!this.map) return;
    this._removeRouteLayers(index, routes);
    routes.splice(index, 1);
    if (this.activeRouteIndex === index) {
      if (routes.length > 0) {
        this.activeRouteIndex = 0;
        routes.forEach((r, i) => (r.active = i === 0));
        this._syncActiveRouteToEditor(routes);
      } else {
        this.activeRouteIndex = -1;
        this.waypoints = [];
        this.waypointNames = [];
        this.markers.forEach((m) => m.remove());
        this.markers = [];
        this.routeName = "";
      }
    } else if (this.activeRouteIndex > index) {
      this.activeRouteIndex--;
    }
    // rebuild visible route layers to keep source/layer ids consistent with index
    for (let i = 0; i <= routes.length; ++i) this._removeRouteLayers(i, routes);
    for (let i = 0; i < this.savedRoutes.length; ++i)
      if (routes[i].visible) this._addRouteLayers(i, routes);
    this._renderSavedRoutes();
    this._renderProvidedRoutes();
    this._updateRoutePanel();
    this._updateRouteSource();
    this.updateActiveRouteData(this.waypoints);
  }
  private _finalizeCurrentRoute(routes: any[]) {
    if (
      this.activeRouteIndex >= 0 &&
      this.activeRouteIndex < this.savedRoutes.length
    ) {
      routes[this.activeRouteIndex].name = this.routeName;
      routes[this.activeRouteIndex].waypoints = this.waypoints.map((p) => [
        ...p,
      ]);
      routes[this.activeRouteIndex].waypointNames = [...this.waypointNames];
      routes[this.activeRouteIndex].visible = true;
      routes[this.activeRouteIndex].active = true;
      // add route layers for the saved route
      this._addRouteLayers(this.activeRouteIndex, this.savedRoutes);
    }
  }

  private _routeTotalDistance(route: { waypoints: [number, number][] }) {
    let tot = 0;
    for (let i = 1; i < route.waypoints.length; ++i)
      tot += haversineNm(route.waypoints[i - 1], route.waypoints[i]);
    return tot;
  }
  private _copyProvidedRouteToWorking(idx: number, route: any) {
    if (!this.map) return;
    const newRoute = {
      ...route,
      name: `${route.name} (copy - edit)`,
      provided: false,
      active: true,
      visible: true,
      waypoints: route.waypoints.map((p: [number, number]) => [...p]),
      waypointNames: [...route.waypointNames],
    };

    // Deactivate all other working routes
    this.savedRoutes.forEach((r) => (r.active = false));

    // Add the new working route
    this.savedRoutes.push(newRoute);
    this.activeRouteIndex = this.savedRoutes.length - 1;

    // Sync state and redraw
    this._syncActiveRouteToEditor(this.savedRoutes);
    this.updateActiveRouteData(this.waypoints);
    this._setActiveRoute(idx, this.savedRoutes);
    this._renderSavedRoutes();
    this._updateRoutePanel();
    this._updateRouteSource();

    // Fit map to the route bounds
    if (newRoute.waypoints.length > 0) {
      const bounds = new maplibregl.LngLatBounds();
      newRoute.waypoints.forEach((p: [number, number]) => bounds.extend(p));
      fitMapToBounds(this.map, bounds);
    }
  }

  /**
   * Save the current editor state to the saved route at the given index.
   * Used for saving edits to a working route.
   */
  private _saveEditedRoute(index: number) {
    if (!this.map) return;
    const route = this.savedRoutes[index];
    if (!route) return;

    // Update the route with current editor state
    route.name = this.routeName;
    route.waypoints = this.waypoints.map((p) => [...p]);
    route.waypointNames = [...this.waypointNames];
    route.active = false;

    // Redraw and refresh the panel
    this._finalizeCurrentRoute(this.savedRoutes);
    this._renderSavedRoutes();
    this._updateRoutePanel();

    console.debug(
      `[routes] saved edited route: ${route.name} (${route.waypoints.length} wpts)`,
    );
  }
}
