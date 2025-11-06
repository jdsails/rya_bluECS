import maplibregl from "maplibre-gl";
import { Protocol, PMTiles } from "pmtiles";
import createStyle from "@enc-tiles/styles";
import { addProtocol } from "maplibre-gl";
export function initMap(
  containerId: string,
  tilesUrl: string,
  pmtilesFile: string,
) {
  const protocol = new Protocol({ metadata: true });
  addProtocol("pmtiles", protocol.tile);

  const url = new URL(pmtilesFile, tilesUrl).toString();
  const pmtiles = new PMTiles(url);
  protocol.add(pmtiles);

  return pmtiles.getHeader().then((header) => {
    const style = createStyle({
      sprite: `${window.location.origin}/sprites`,
      source: {
        type: "vector",
        url: `pmtiles://${url}`,
      },
    });

    const map = new maplibregl.Map({
      container: containerId,
      hash: true,
      zoom: header.maxZoom,
      center: [header.centerLon, header.centerLat],
      style,
    });

    return map;
  });
}
