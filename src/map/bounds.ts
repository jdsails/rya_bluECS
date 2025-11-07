import maplibregl from "maplibre-gl";
import { LngLatBoundsLike, Map } from "maplibre-gl";

/**
 * Smoothly zooms/centers the map to given bounds.
 * Falls back to easeTo() if bounds are degenerate (single point).
 */
export function fitMapToBounds(
  map: Map,
  bounds: LngLatBoundsLike,
  options: {
    padding?: number;
    maxZoom?: number;
    duration?: number;
  } = {},
) {
  const { padding = 40, maxZoom = 13, duration = 1000 } = options;

  // Defensive: if it's a single coordinate pair, easeTo() instead.
  const b = maplibregl.LngLatBounds.convert(bounds);
  if (b.getNorthEast().equals(b.getSouthWest())) {
    map.easeTo({ center: b.getCenter(), zoom: maxZoom, duration });
  } else {
    map.fitBounds(b, { padding, maxZoom, duration });
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
