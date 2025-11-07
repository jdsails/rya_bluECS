import "@maplibre/maplibre-gl-inspect/dist/maplibre-gl-inspect.css";
import "maplibre-gl/dist/maplibre-gl.css";
import { NavigationControl, FullscreenControl, Popup } from "maplibre-gl";
import MaplibreInspect from "@maplibre/maplibre-gl-inspect";
import "@oicl/openbridge-webcomponents/dist";
import "@oicl/openbridge-webcomponents/src/palettes/variables.css";
import { initMap } from "./map/setup";
import { CursorCoordControl, MeasureControl } from "./map/controls";
import { BOUNDS } from "./map/bounds";
import { RouteDrawControl } from "./route/manager_simplified";
import "./ui/openbridge";
import { keepPanelVisibleInFullscreen, injectControlStyle } from "./ui/panel";

/* --- PMTiles / style / map setup --- */
const tileset = import.meta.env.VITE_TILESET;
const tilesUrl =
  import.meta.env.VITE_TILES_URL && import.meta.env.VITE_TILES_URL.trim() !== ""
    ? import.meta.env.VITE_TILES_URL
    : new URL("charts/", window.location.href).toString();

initMap("map", tilesUrl, tileset).then((map) => {
  /* Place navigation & fullscreen top-left */
  map.addControl(
    new NavigationControl({ showZoom: true, showCompass: true }),
    "top-left",
  );
  map.addControl(new FullscreenControl(), "top-left");

  map.setCenter([-6.0, 46.0575]);
  map.setMaxBounds(BOUNDS);

  /* --- add controls after map idle (safe for MaplibreInspect / tiles) --- */
  map.on("load", () => {
    // add controls that are safe on load
    map.addControl(new CursorCoordControl(), "bottom-left");
    map.addControl(new MeasureControl(), "bottom-left");
    map.addControl(new RouteDrawControl(), "top-right");

    // wait for 'idle' event (style and initial tiles finished) before adding MaplibreInspect
    map.once("idle", () => {
      try {
        // create the inspect control first so we can defensively wrap its internal method
        const inspect = new MaplibreInspect({ popup: new Popup({}) });

        // Defensive wrapper for MaplibreInspect._setSourcesFromMap which assumes map.style.sourceCaches
        // This prevents intermittent errors where the style or sourceCaches are not yet available
        // during certain tile events. We wrap the instance method rather than patching the library
        // globally.
        try {
          const orig = (inspect as any)._setSourcesFromMap;
          (inspect as any)._setSourcesFromMap = function (...args: any[]) {
            try {
              if (
                !this._map ||
                !this._map.style ||
                !this._map.style.sourceCaches
              )
                return;
            } catch (e) {
              // if anything unexpected occurs, bail out gracefully
              return;
            }
            if (typeof orig === "function") return orig.apply(this, args);
          };
        } catch (e) {
          // if wrapping fails, continue — we'll still try to add the control
          console.warn("[map] failed to wrap MaplibreInspect internals:", e);
        }

        map.addControl(inspect, "top-left");
        console.debug("[map] MaplibreInspect added after idle (wrapped).");
      } catch (err) {
        console.warn("[map] failed to add MaplibreInspect:", err);
      }

      // --- Keep route panel visible in fullscreen ---
      keepPanelVisibleInFullscreen();
    });
  });
  // small style tag for control aesthetics
  injectControlStyle();
});
