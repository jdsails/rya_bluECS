import * as maplibregl from "maplibre-gl";
import { fitMapToBounds } from "../map/bounds";
import { haversineNm } from "../utils/geo";
export function setActiveRoute(
  index: number,
  routes: any[],
  setActiveRouteIndex: (idx: number) => void,
  syncActiveRouteToEditor: (routes: any[]) => void,
  renderSavedRoutes: (routes: any[]) => void,
  renderProvidedRoutes: (routes: any[]) => void,
  updateRoutePanel: () => void,
  updateRouteSource: () => void,
  updateActiveRouteData: (waypoints: [number, number][]) => void,
  savedRoutes: any[],
  providedRoutes: any[],
  waypoints: [number, number][],
) {
  if (index < 0 || index >= routes.length) return;
  routes.forEach((r: any, i: number) => (r.active = i === index));
  setActiveRouteIndex(index);
  syncActiveRouteToEditor(routes);
  // render lists relevant to that routes array:
  if (routes === savedRoutes) renderSavedRoutes(routes);
  else if (routes === providedRoutes) renderProvidedRoutes(routes);
  updateRoutePanel();
  updateRouteSource();
  updateActiveRouteData(waypoints);
}

export function setSelectedRoute(
  index: number,
  routes: any[],
  setActiveRouteIndex: (idx: number) => void,
  syncActiveRouteToEditor: (routes: any[]) => void,
  renderSavedRoutes: (routes: any[]) => void,
  updateRoutePanel: () => void,
  updateRouteSource: () => void,
  updateActiveRouteData: (waypoints: [number, number][]) => void,
  waypoints: [number, number][],
) {
  if (index < 0 || index >= routes.length) return;
  routes.forEach((r, i) => (r.active = i === index));
  setActiveRouteIndex(index);
  syncActiveRouteToEditor(routes);
  renderSavedRoutes(routes);
  updateRoutePanel();
  updateRouteSource();
  updateActiveRouteData(waypoints);
}

export function syncActiveRouteToEditor(
  routes: any[],
  activeRouteIndex: number,
  setRouteName: (name: string) => void,
  setWaypoints: (wps: [number, number][]) => void,
  setWaypointNames: (names: string[]) => void,
  markers: any[],
  createMarkerAt: (
    i: number,
    coord: [number, number],
    name: string,
    insert: boolean,
  ) => void,
  updateRouteSource: () => void,
  updateActiveRouteData: (waypoints: [number, number][]) => void,
) {
  // remove old markers
  for (const m of markers) m.remove();
  markers.length = 0;

  if (activeRouteIndex >= 0 && routes && activeRouteIndex < routes.length) {
    const route = routes[activeRouteIndex];
    setRouteName(route.name || "");
    setWaypoints(route.waypoints.map((p: any) => [...p]));
    setWaypointNames((route.waypointNames || []).map((n: any) => n));
    for (let i = 0; i < route.waypoints.length; ++i)
      createMarkerAt(
        i,
        route.waypoints[i],
        route.waypointNames[i] || "",
        false,
      );
    updateRouteSource();
    updateActiveRouteData(route.waypoints);
  } else {
    setRouteName("");
    setWaypoints([]);
    setWaypointNames([]);
    markers.forEach((m) => m.remove());
    markers.length = 0;
  }
}

export function toggleRouteVisibility(
  index: number,
  routes: any[],
  ns: string,
  map: maplibregl.Map,
  addRouteLayers: (
    index: number,
    routes: any[],
    ns: string,
    map: maplibregl.Map,
    removeRouteLayers: (
      index: number,
      routes: any[],
      ns: string,
      map: maplibregl.Map,
    ) => void,
  ) => void,
  removeRouteLayers: (
    index: number,
    routes: any[],
    ns: string,
    map: maplibregl.Map,
  ) => void,
  fitMapToBounds: (
    map: maplibregl.Map,
    bounds: maplibregl.LngLatBoundsLike,
  ) => void,
  renderProvidedRoutes: () => void,
  renderSavedRoutes: () => void,
  providedRoutes: any[],
  savedRoutes: any[],
) {
  if (!map) return;
  if (!routes || index < 0 || index >= routes.length) return;
  const route = routes[index];
  route.visible = !route.visible;
  if (route.visible) addRouteLayers(index, routes, ns, map, removeRouteLayers);
  else removeRouteLayers(index, routes, ns, map);

  // optionally fit to bounds if route now visible
  if (route.visible && route.waypoints?.length > 0) {
    const bounds = new maplibregl.LngLatBounds();
    route.waypoints.forEach((p: [number, number]) => bounds.extend(p));
    fitMapToBounds(map, bounds);
  }

  // re-render only the list you updated to avoid reentrancy
  if (routes === providedRoutes) renderProvidedRoutes();
  else if (routes === savedRoutes) renderSavedRoutes();
}

export function addRouteLayers(
  index: number,
  routes: any[],
  ns: string,
  map: maplibregl.Map,
  removeRouteLayers: (
    index: number,
    routes: any[],
    ns: string,
    map: maplibregl.Map,
  ) => void,
) {
  if (!map) return;
  if (!routes || index < 0 || index >= routes.length) return;
  const route = routes[index];

  // remove any existing layers/sources for that (index,ns)
  removeRouteLayers(index, routes, ns, map);

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
    map.addSource(sourceId, {
      type: "geojson",
      data: { type: "FeatureCollection", features },
    });
    map.addLayer({
      id: lineLayerId,
      type: "line",
      source: sourceId,
      paint: {
        "line-color": "#0077b6",
        "line-width": 3,
        "line-dasharray": [2, 2],
      },
    });
    map.addLayer({
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

export function removeRouteLayers(
  index: number,
  routes: any[],
  ns: string,
  map: maplibregl.Map,
) {
  if (!map) return;
  if (!routes || index < 0 || index >= routes.length) return;
  const route = routes[index];
  if (!route) return;
  try {
    // Use stored ids if present; fall back to namespaced ids
    const lineId = route.lineLayerId || `route-line-${ns}-${index}`;
    const pointId = route.pointLayerId || `route-points-${ns}-${index}`;
    const srcId = route.sourceId || `route-src-${ns}-${index}`;

    if (lineId && map.getLayer(lineId)) map.removeLayer(lineId);
    if (pointId && map.getLayer(pointId)) map.removeLayer(pointId);
    if (srcId && map.getSource(srcId)) map.removeSource(srcId);
  } catch (err) {
    console.warn("[routes] error removing layers", ns, index, err);
  }
  // clear stored ids
  route.lineLayerId = undefined;
  route.pointLayerId = undefined;
  route.sourceId = undefined;
}

export function deleteSavedRoute(
  index: number,
  routes: any[],
  ns: string,
  map: maplibregl.Map,
  removeRouteLayers: (
    index: number,
    routes: any[],
    ns: string,
    map: maplibregl.Map,
  ) => void,
  setActiveRouteIndex: (idx: number) => void,
  syncActiveRouteToEditor: (
    routes: any[],
    activeRouteIndex: number,
    ...args: any[]
  ) => void,
  renderSavedRoutes: (routes: any[]) => void,
  //renderProvidedRoutes: (routes: any[]) => void,
  updateRoutePanel: () => void,
  updateRouteSource: () => void,
  updateActiveRouteData: (waypoints: [number, number][]) => void,
  // savedRoutes: any[],
  waypoints: [number, number][],
  markers: any[],
  setRouteName: (name: string) => void,
  setWaypoints: (wps: [number, number][]) => void,
  setWaypointNames: (names: string[]) => void,
) {
  if (!map) return;
  removeRouteLayers(index, routes, "saved", map);
  routes.splice(index, 1);
  if (index === 0 && routes.length > 0) {
    setActiveRouteIndex(0);
    routes.forEach((r: any, i: number) => (r.active = i === 0));
    syncActiveRouteToEditor(
      routes,
      0,
      setRouteName,
      setWaypoints,
      setWaypointNames,
      markers,
      () => {},
      updateRouteSource,
      updateActiveRouteData,
    );
  } else if (routes.length === 0) {
    setActiveRouteIndex(-1);
    setRouteName("");
    setWaypoints([]);
    setWaypointNames([]);
    markers.forEach((m: any) => m.remove());
    markers.length = 0;
  }
  // rebuild visible route layers to keep source/layer ids consistent with index
  for (let i = 0; i <= routes.length; ++i)
    removeRouteLayers(i, routes, ns, map);
  for (let i = 0; i < routes.length; ++i)
    if (routes[i] && routes[i].visible)
      addRouteLayers(i, routes, ns, map, removeRouteLayers);
  renderSavedRoutes(routes);
  //renderProvidedRoutes();
  updateRoutePanel();
  updateRouteSource();
  updateActiveRouteData(waypoints);
}
export function finalizeCurrentRoute(
  routes: any[],
  activeRouteIndex: number,
  routeName: string,
  waypoints: [number, number][],
  waypointNames: string[],
  addRouteLayers: (
    index: number,
    routes: any[],
    ns: string,
    map: maplibregl.Map,
    removeRouteLayers: any,
  ) => void,
  map: maplibregl.Map,
  fitMapToBounds?: (
    map: maplibregl.Map,
    bounds: maplibregl.LngLatBounds,
  ) => void,
) {
  if (activeRouteIndex >= 0 && activeRouteIndex < routes.length) {
    const route = routes[activeRouteIndex];
    route.name = routeName;
    route.waypoints = waypoints.map((p) => [...p]);
    route.waypointNames = [...waypointNames];
    route.visible = true;
    route.active = true;

    // Add route layers
    addRouteLayers(activeRouteIndex, routes, "saved", map, () => {});

    // ✅ Compute and apply bounds if waypoints are valid
    if (fitMapToBounds && route.waypoints?.length > 0) {
      const bounds = new maplibregl.LngLatBounds();
      route.waypoints.forEach((p: [number, number]) => {
        if (
          Array.isArray(p) &&
          p.length === 2 &&
          typeof p[0] === "number" &&
          typeof p[1] === "number" &&
          !isNaN(p[0]) &&
          !isNaN(p[1])
        ) {
          bounds.extend(p);
        }
      });

      // Only fit if the bounds actually have area
      const ne = bounds.getNorthEast?.();
      const sw = bounds.getSouthWest?.();
      if (
        ne &&
        sw &&
        typeof ne.lng === "number" &&
        typeof sw.lng === "number"
      ) {
        fitMapToBounds(map, bounds);
      } else {
        console.warn(
          "[finalizeCurrentRoute] Invalid or empty bounds for route:",
          routeName,
        );
      }
    }
  }
}

export function routeTotalDistance(route: { waypoints: [number, number][] }) {
  let tot = 0;
  for (let i = 1; i < route.waypoints.length; ++i) {
    const prev = route.waypoints[i - 1];
    const curr = route.waypoints[i];
    if (prev && curr) tot += haversineNm(prev, curr);
  }
  return tot;
}
