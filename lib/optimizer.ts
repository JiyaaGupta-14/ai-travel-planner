import { haversineDistance } from "./distance";

export interface OptimizerPlace {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  category?: string | null;
}

export interface DayPlan {
  dayNumber: number;
  stops: OptimizerPlace[];
  totalDistanceKm: number;
}

// Orders a single day's stops using nearest-neighbor greedy search
function orderStopsByProximity(places: OptimizerPlace[]): { ordered: OptimizerPlace[]; totalDistanceKm: number } {
  if (places.length === 0) return { ordered: [], totalDistanceKm: 0 };

  const remaining = [...places];
  const ordered: OptimizerPlace[] = [remaining.shift()!]; // start with first place
  let totalDistanceKm = 0;

  while (remaining.length > 0) {
    const last = ordered[ordered.length - 1];
    let nearestIdx = 0;
    let nearestDist = Infinity;

    remaining.forEach((place, idx) => {
      const dist = haversineDistance(last.latitude, last.longitude, place.latitude, place.longitude);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestIdx = idx;
      }
    });

    totalDistanceKm += nearestDist;
    ordered.push(remaining[nearestIdx]);
    remaining.splice(nearestIdx, 1);
  }

  return { ordered, totalDistanceKm };
}

// Splits places across days, then orders each day's stops
export function buildItinerary(places: OptimizerPlace[], numDays: number): DayPlan[] {
  const stopsPerDay = Math.ceil(places.length / numDays);
  const days: DayPlan[] = [];

  for (let d = 0; d < numDays; d++) {
    const dayPlaces = places.slice(d * stopsPerDay, (d + 1) * stopsPerDay);
    if (dayPlaces.length === 0) continue;

    const { ordered, totalDistanceKm } = orderStopsByProximity(dayPlaces);
    days.push({
      dayNumber: d + 1,
      stops: ordered,
      totalDistanceKm: Math.round(totalDistanceKm * 10) / 10,
    });
  }

  return days;
}