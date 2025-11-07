import { downloadFile } from "../utils/file";

function escapeXml(s: string) {
  return s.replace(
    /[<>&'"]/g,
    (c) =>
      ({
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        "'": "&apos;",
        '"': "&quot;",
      })[c] || c,
  );
}

export function exportGpx(routeName: string, waypoints: [number, number][]) {
  if (!waypoints || waypoints.length === 0) {
    alert("No waypoints to export.");
    return;
  }
  const now = new Date().toISOString();
  let gpx = `<?xml version="1.0" encoding="UTF-8" standalone="no" ?>
<gpx version="1.1" creator="bluECS" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata><time>${now}</time></metadata>
  <trk>
    <name>${escapeXml(routeName)}</name>
    <trkseg>
`;
  for (const [lon, lat] of waypoints) {
    gpx += `      <trkpt lat="${lat.toFixed(6)}" lon="${lon.toFixed(6)}"></trkpt>\n`;
  }
  gpx += `    </trkseg>
  </trk>
</gpx>`;
  downloadFile(
    `${(routeName || "route").replace(/[^a-zA-Z0-9]/g, "_")}.gpx`,
    gpx,
  );
}

export function exportRoute(route: {
  name: string;
  waypoints: [number, number][];
  waypointNames: string[];
}) {
  if (!route || route.waypoints.length === 0) {
    alert("No waypoints to export.");
    return;
  }
  const now = new Date().toISOString();
  function escapeXml(s: string) {
    return s.replace(
      /[<>&'"]/g,
      (c) =>
        ({
          "<": "&lt;",
          ">": "&gt;",
          "&": "&amp;",
          "'": "&apos;",
          '"': "&quot;",
        })[c] || c,
    );
  }
  let gpx = `<?xml version="1.0" encoding="UTF-8" standalone="no" ?>
<gpx version="1.1" creator="bluECS" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata><time>${now}</time></metadata>
  <rte>
    <name>${escapeXml(route.name)}</name>
`;
  for (let i = 0; i < route.waypoints.length; ++i) {
    const [lon, lat] = route.waypoints[i];
    const name = route.waypointNames[i] || `WP${i + 1}`;
    gpx += `    <rtept lat="${lat.toFixed(6)}" lon="${lon.toFixed(6)}"><name>${escapeXml(name)}</name></rtept>\n`;
  }
  gpx += `  </rte>
  <trk>
    <name>${escapeXml(route.name)}</name>
    <trkseg>
`;
  for (const p of route.waypoints) {
    const [lon, lat] = p;
    gpx += `      <trkpt lat="${lat.toFixed(6)}" lon="${lon.toFixed(6)}"></trkpt>\n`;
  }
  gpx += `    </trkseg>
  </trk>
</gpx>`;
  downloadFile(
    `${route.name.replace(/[^a-zA-Z0-9]/g, "_") || "route"}.gpx`,
    gpx,
    "application/gpx+xml",
  );
}
