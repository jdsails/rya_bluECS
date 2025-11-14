import { injectPanelCSS } from "../ui/panel";

export function setupRoutePanel(): HTMLElement {
  injectPanelCSS();
  let routePanel = document.getElementById("route-panel") as HTMLElement | null;
  if (!routePanel) {
    routePanel = document.createElement("div");
    routePanel.id = "route-panel";
    routePanel.innerHTML = `
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
    document.body.appendChild(routePanel);
  }
  return routePanel;
}
