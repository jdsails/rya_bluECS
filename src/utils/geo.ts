export function haversineNm(a: [number, number], b: [number, number]) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 3440.065; // nautical miles
  const dLat = toRad(b[1] - a[1]);
  const dLon = toRad(b[0] - a[0]);
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const aa =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
  return R * c;
}

export function formatLatLonForDisplay(lat: number, lon: number) {
  const fmt = (deg: number, isLat = true) => {
    const hemi = isLat ? (deg >= 0 ? "N" : "S") : deg >= 0 ? "E" : "W";
    const absDeg = Math.abs(deg);
    const d = Math.floor(absDeg);
    const m = (absDeg - d) * 60;
    return `${d.toString().padStart(isLat ? 2 : 3, "0")}°${m
      .toFixed(2)
      .padStart(5, "0")}'${hemi}`;
  };
  return `${fmt(lat, true)} ${fmt(lon, false)}`;
}
