/* Choosing a location, with no database or network, so it can be tested. */

export type Spot = { id: string; lat: number; lng: number };

/** Straight-line distance in km between two points on the earth. */
export function kmBetween(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const r = Math.PI / 180;
  const dLat = (b.lat - a.lat) * r;
  const dLng = (b.lng - a.lng) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/** Roads in Nairobi run about a third longer than the straight line. */
export const ROAD_FACTOR = 1.35;

/** Estimated road distance, to one decimal, for the fare rule when the rider service can't quote. */
export function roadKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  return Math.round(kmBetween(a, b) * ROAD_FACTOR * 10) / 10;
}

/** The location nearest a drop-off; ties go to the first in the list (the lowest sort). */
export function nearest<T extends Spot>(locations: T[], to: { lat: number; lng: number }): T | null {
  let best: T | null = null;
  let bestKm = Infinity;
  for (const l of locations) {
    const d = kmBetween(l, to);
    if (d < bestKm) {
      best = l;
      bestKm = d;
    }
  }
  return best;
}
