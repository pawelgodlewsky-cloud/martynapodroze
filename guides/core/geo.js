export function distanceKm(a, b) {
  const rad = value => value * Math.PI / 180;
  const dLat = rad(b[0] - a[0]);
  const dLng = rad(b[1] - a[1]);
  const q = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(q), Math.sqrt(1 - q));
}

export const mapsUrl = coordinates => `https://www.google.com/maps/dir/?api=1&destination=${coordinates.join(",")}&travelmode=walking`;
export const routeUrl = coordinates => {
  const [origin, ...rest] = coordinates;
  const destination = rest.pop() || origin;
  const waypoints = rest.map(point => point.join(",")).join("|");
  return `https://www.google.com/maps/dir/?api=1&origin=${origin.join(",")}&destination=${destination.join(",")}&travelmode=walking${waypoints ? `&waypoints=${encodeURIComponent(waypoints)}` : ""}`;
};

