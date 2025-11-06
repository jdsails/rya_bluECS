export function injectPanelCSS() {
  if (document.getElementById("route-panel-style")) return;
  const s = document.createElement("style");
  s.id = "route-panel-style";
  s.textContent = `
#route-panel { position: fixed; right: 0; top: 0; width: 350px; max-width: 95vw; height: 100%; background: #f7faff; border-left: 2px solid #b2cbe3; box-shadow: -3px 0 10px rgba(0,44,85,0.07); z-index: 11000; font-family: 'Segoe UI', Arial, sans-serif; color: #06365f; display:flex; flex-direction:column; transition: width .18s; }
#route-panel.collapsed { width: 48px !important; overflow: hidden; height:48px !important; }
#route-panel-header { display:flex; align-items:center; justify-content:space-between; padding:10px 10px 8px 15px; border-bottom:1px solid #d7e6f3; background:#e3f1ff; position:relative; }
#route-panel.collapsed #route-panel-title, #route-panel.collapsed #route-panel-body, #route-panel.collapsed #route-name-header, #route-panel.collapsed #route-toolbar { display:none; }
#route-panel-toggle { background:#d7e6f3; border:none; border-radius:5px; font-size:16px; width:28px; height:28px; cursor:pointer; color:#06365f; font-weight:700; position:absolute; right:10px; top:10px; }
#route-panel-body { padding:12px 15px; overflow-y:auto; flex:1 1 auto; }
.route-wp-table { border-collapse:collapse; width:100%; font-size:13px; margin-bottom:12px; }
  /* ...rest of your panel CSS... */
  `;
  document.head.appendChild(s);
}

export function keepPanelVisibleInFullscreen() {
  document.addEventListener("fullscreenchange", () => {
    const mapContainer = document.getElementById("map");
    const panel = document.getElementById("route-panel");
    if (!mapContainer || !panel) return;

    if (document.fullscreenElement === mapContainer) {
      mapContainer.appendChild(panel);
      panel.style.position = "absolute";
      panel.style.right = "0";
      panel.style.top = "0";
      panel.style.zIndex = "11000";
    } else {
      document.body.appendChild(panel);
      panel.style.position = "fixed";
      panel.style.right = "0";
      panel.style.top = "0";
    }
  });
}

export function injectControlStyle() {
  const styleTag = document.createElement("style");
  styleTag.textContent = `
  .maplibregl-ctrl { margin: 6px; z-index: 10 !important; position: relative !important; }
  .maplibregl-ctrl button { background-color: white; border: 1px solid #ccc; border-radius: 4px; cursor:pointer; }
  .maplibregl-ctrl button:hover { background-color: #eee; }
  .cursor-coord-control { min-width: 170px; text-align: left; }
  #measure-popup { z-index: 9999; }
  `;
  document.head.appendChild(styleTag);
}
