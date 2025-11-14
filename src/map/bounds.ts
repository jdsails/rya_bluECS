// import maplibregl from "maplibre-gl";
import { LngLatBoundsLike, Map } from "maplibre-gl";

import * as maplibregl from "maplibre-gl";

/**
 * Smoothly zooms/centers the map to given bounds.
 * Falls back to easeTo() if bounds are degenerate or invalid.
 */
export function fitMapToBounds(
  map: maplibregl.Map,
  boundsLike: maplibregl.LngLatBoundsLike,
  options: {
    padding?: number;
    maxZoom?: number;
    duration?: number;
  } = {},
) {
  const { padding = 40, maxZoom = 13, duration = 1000 } = options;

  try {
    const b = maplibregl.LngLatBounds.convert(boundsLike);
    const ne = b.getNorthEast?.();
    const sw = b.getSouthWest?.();

    // Defensive: if invalid or zero-area, fall back to easing to center
    if (
      !ne ||
      !sw ||
      typeof ne.lng !== "number" ||
      typeof sw.lng !== "number" ||
      ne.lng === sw.lng ||
      ne.lat === sw.lat
    ) {
      const center = b.getCenter ? b.getCenter() : { lng: 0, lat: 0 };
      map.easeTo({ center, zoom: maxZoom, duration });
      return;
    }

    map.fitBounds(b, { padding, maxZoom, duration });
  } catch (err) {
    console.warn("[fitMapToBounds] invalid bounds provided:", boundsLike, err);
  }
}

/* --- Bounds --- */
export const BBOX_W = -6.416667;
export const BBOX_S = 45.615;
export const BBOX_E = -5.583333;
export const BBOX_N = 46.5;
export const BOUNDS = [BBOX_W, BBOX_S, BBOX_E, BBOX_N] as [
  number,
  number,
  number,
  number,
];
