export function injectPanelCSS() {
  if (document.getElementById("route-panel-style")) return;
  const s = document.createElement("style");
  s.id = "route-panel-style";
  s.textContent = `
#route-panel { position: fixed; right: 0; top: 0; width: 350px; max-width: 95vw; height: 100%; background: #f7faff; border-left: 2px solid #b2cbe3; box-shadow: -3px 0 10px rgba(0,44,85,0.07); z-index: 11000; font-family: 'Segoe UI', Arial, sans-serif; color: #06365f; display:flex; flex-direction:column; transition: width .18s; }
#route-panel.collapsed { width: 0; !important; height:0 !important; }
#route-panel-header { display:flex; align-items:center; justify-content:space-between; padding:10px 10px 8px 15px; border-bottom:1px solid #d7e6f3; background:#e3f1ff; position:relative; }
#route-panel.collapsed #route-panel-title, #route-panel.collapsed #route-panel-body, #route-panel.collapsed #route-name-header, #route-panel.collapsed #route-toolbar { display:none; }
#route-panel-toggle { position:absolute; left:-50px; top:10px; }
#route-panel-body { padding:12px 15px; overflow-y:auto; flex:1 1 auto; }
.route-wp-table { border-collapse:collapse; width:100%; font-size:13px; margin-bottom:12px; }
.route-wp-table th, .route-wp-table td { border-bottom:1px solid #e6ecf5; padding:2px 5px; text-align:left; }
.route-wp-table th { background:#f2f7fb; font-weight:600; color:#074369; font-size:12px; }
.route-wp-table input[type="text"] { background:#f4faff; border:1px solid #c6d6e7; border-radius:3px; font-size:13px; padding:2px 4px; color:#044; }
.route-wp-table .wp-delete-btn { background:#f8d7da; color:#a33; border:none; border-radius:3px; font-size:13px; cursor:pointer; }
#route-total-length { font-size:15px; color:#074369; margin-top:10px; }
.route-item { flex-wrap: wrap; background:#eaf3fc; margin-bottom:7px; border-radius:6px; padding:7px 9px; cursor:pointer; border:1px solid #d7e6f3; display:flex; align-items:center; justify-content:space-between; position:relative; }
.route-item.active { background:#cfe2fa; border-color:#88b1e7; font-weight:600; }
.route-actions { display:flex; gap:6px; align-items:center; }
.route-item-details { width: 100%; clear: both; display: block; font-size:12px; margin-top:3px; color:#044; background:#f7fbff; border-radius:4px; padding:5px 7px 4px 25px; border-left:2px solid #b2cbe3; }
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
