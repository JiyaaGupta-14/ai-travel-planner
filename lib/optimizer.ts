import { haversineDistance } from "./distance";

export interface NamedDistrict {
  name: string;
  centerLat: number;
  centerLon: number;
  radiusKm: number;
}

export interface OptimizerPlace {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  category?: "museum" | "viewpoint" | "park" | "landmark" | "dining" | "shopping" | string | null;
  visitDurationMin?: number;
  priceTier?: 1 | 2 | 3 | 4;
}

export interface RouteLeg {
  fromName: string;
  toName: string;
  distanceKm: number;
  travelTimeMin: number;
}

export interface DayPlan {
  dayNumber: number;
  stops: OptimizerPlace[];
  legs: RouteLeg[];
  totalDistanceKm: number;
  totalDurationMin: number;
  estimatedDayCostUsd: number;
}

export interface TripConstraints {
  numDays: number;
  totalBudgetUsd: number;
  targetActiveHoursPerDay?: number; // Defaults to 5.5 hours
  maxMuseumsPerDay?: number; // Defaults to 1
  namedDistricts?: NamedDistrict[];
}

const MERGE_THRESHOLD_KM = 0.25;
const AVG_WALKING_SPEED_KMH = 4.0;
const MEAL_DURATION_MIN = 60;
const BALANCE_PENALTY_KM_PER_EXCESS_STOP = 0.4;

const MIN_DAY_DURATION_MIN = 120; // At least 2 hours of active time per day
const MAX_DAY_DURATION_MIN = 330; // At most 5.5 hours of active time per day

function isMuseumCategory(place: OptimizerPlace): boolean {
  const category = place.category?.toLowerCase() || "";
  return category.includes("museum") || category.includes("art") || category.includes("gallery");
}

function inferVisitDuration(place: OptimizerPlace): number {
  if (place.visitDurationMin) return place.visitDurationMin;
  const category = place.category?.toLowerCase() || "";
  if (isMuseumCategory(place)) return 120;
  if (category.includes("park") || category.includes("garden")) return 60;
  if (category.includes("viewpoint") || category.includes("tower")) return 45;
  if (category.includes("dining") || category.includes("restaurant")) return 75;
  if (category.includes("landmark") || category.includes("fountain")) return 25;
  return 45;
}

function inferPlaceCost(place: OptimizerPlace, dailyBudgetUsd: number): number {
  if (place.priceTier) {
    const tierMultiplier = [0, 0.1, 0.25, 0.5, 0.8];
    return Math.round(dailyBudgetUsd * tierMultiplier[place.priceTier]);
  }
  return Math.round(dailyBudgetUsd * 0.15);
}

function findDistrict(place: OptimizerPlace, districts: NamedDistrict[]): string | null {
  for (const d of districts) {
    const dist = haversineDistance(place.latitude, place.longitude, d.centerLat, d.centerLon);
    if (dist <= d.radiusKm) return d.name;
  }
  return null;
}

function mergeNearDuplicatesAndDistricts(
  places: OptimizerPlace[],
  districts: NamedDistrict[]
): OptimizerPlace[][] {
  const districtOf = new Map<string, string | null>();
  for (const p of places) districtOf.set(p.id, findDistrict(p, districts));

  const groups: OptimizerPlace[][] = [];
  const used = new Set<string>();

  for (const place of places) {
    if (used.has(place.id)) continue;
    const group = [place];
    used.add(place.id);
    const placeDistrict = districtOf.get(place.id);

    for (const other of places) {
      if (used.has(other.id)) continue;

      const proximityMatch =
        haversineDistance(place.latitude, place.longitude, other.latitude, other.longitude) <= MERGE_THRESHOLD_KM;
      const districtMatch = placeDistrict !== null && districtOf.get(other.id) === placeDistrict;

      if (proximityMatch || districtMatch) {
        group.push(other);
        used.add(other.id);
      }
    }
    groups.push(group);
  }

  return groups;
}

function groupCentroid(group: OptimizerPlace[]): { lat: number; lon: number } {
  const lat = group.reduce((sum, p) => sum + p.latitude, 0) / group.length;
  const lon = group.reduce((sum, p) => sum + p.longitude, 0) / group.length;
  return { lat, lon };
}

function kMeansPlusPlusInit(groups: OptimizerPlace[][], k: number): { lat: number; lon: number }[] {
  const points = groups.map((g) => groupCentroid(g));
  const centroids: { lat: number; lon: number }[] = [];
  centroids.push(points[Math.floor(Math.random() * points.length)]);

  while (centroids.length < k) {
    const distances = points.map((p) => {
      const minDist = Math.min(...centroids.map((c) => haversineDistance(p.lat, p.lon, c.lat, c.lon)));
      return minDist * minDist;
    });

    const totalWeight = distances.reduce((sum, d) => sum + d, 0);
    if (totalWeight === 0) {
      centroids.push(points[Math.floor(Math.random() * points.length)]);
      continue;
    }

    let r = Math.random() * totalWeight;
    let chosenIdx = 0;
    for (let i = 0; i < distances.length; i++) {
      r -= distances[i];
      if (r <= 0) {
        chosenIdx = i;
        break;
      }
    }
    centroids.push(points[chosenIdx]);
  }

  return centroids;
}

function calculateClusterMetrics(
  cluster: OptimizerPlace[][],
  dailyBudgetUsd: number
): { durationMin: number; estimatedCost: number } {
  if (cluster.length === 0) return { durationMin: 0, estimatedCost: 0 };

  const flatPlaces = cluster.flat();
  let totalVisitTime = 0;
  let totalCost = 0;

  for (const place of flatPlaces) {
    totalVisitTime += inferVisitDuration(place);
    totalCost += inferPlaceCost(place, dailyBudgetUsd);
  }

  let totalTransitMinutes = 0;
  for (let i = 0; i < cluster.length - 1; i++) {
    const c1 = groupCentroid(cluster[i]);
    const c2 = groupCentroid(cluster[i + 1]);
    const distKm = haversineDistance(c1.lat, c1.lon, c2.lat, c2.lon);
    totalTransitMinutes += (distKm / AVG_WALKING_SPEED_KMH) * 60;
  }

  return { durationMin: totalVisitTime + totalTransitMinutes, estimatedCost: totalCost };
}

function museumCountIn(cluster: OptimizerPlace[][]): number {
  return cluster.flat().filter(isMuseumCategory).length;
}

function clusterGlobalDestinations(
  groups: OptimizerPlace[][],
  numDays: number,
  maxDailyMinutes: number,
  dailyBudgetUsd: number,
  maxMuseumsPerDay: number
): OptimizerPlace[][][] {
  if (groups.length <= numDays) {
    return groups.map((g) => [g]);
  }

  let centroids = kMeansPlusPlusInit(groups, numDays);
  let clusters: OptimizerPlace[][][] = Array.from({ length: numDays }, () => []);
  const targetSize = groups.length / numDays;

  for (let iter = 0; iter < 10; iter++) {
    clusters = Array.from({ length: numDays }, () => []);

    for (const group of groups) {
      const gc = groupCentroid(group);
      const groupMuseumCount = group.filter(isMuseumCategory).length;

      const scored = centroids.map((c, idx) => {
        const dist = haversineDistance(gc.lat, gc.lon, c.lat, c.lon);
        const currentSize = clusters[idx].reduce((sum, g) => sum + g.length, 0);
        const overCapacity = Math.max(0, currentSize - targetSize);
        const balancePenaltyKm = overCapacity * BALANCE_PENALTY_KM_PER_EXCESS_STOP;
        return { idx, score: dist + balancePenaltyKm };
      });

      scored.sort((a, b) => a.score - b.score);

      let targetIdx = scored[0].idx;
      let placed = false;

      for (const cand of scored) {
        const metrics = calculateClusterMetrics(clusters[cand.idx], dailyBudgetUsd);
        const groupDuration = group.reduce((sum, p) => sum + inferVisitDuration(p), 0);
        const currentMuseums = museumCountIn(clusters[cand.idx]);

        const withinTime = metrics.durationMin + groupDuration <= maxDailyMinutes;
        const withinMuseumCap = currentMuseums + groupMuseumCount <= maxMuseumsPerDay;

        if (withinTime && withinMuseumCap) {
          targetIdx = cand.idx;
          placed = true;
          break;
        }
      }

      if (!placed) {
        for (const cand of scored) {
          const metrics = calculateClusterMetrics(clusters[cand.idx], dailyBudgetUsd);
          const groupDuration = group.reduce((sum, p) => sum + inferVisitDuration(p), 0);
          if (metrics.durationMin + groupDuration <= maxDailyMinutes) {
            targetIdx = cand.idx;
            break;
          }
        }
      }

      clusters[targetIdx].push(group);
    }

    centroids = centroids.map((prev, idx) =>
      clusters[idx].length > 0 ? groupCentroid(clusters[idx].flat()) : prev
    );
  }

  return clusters;
}

function groupCentroidsCost(clusters: OptimizerPlace[][][]): number {
  let total = 0;
  for (const clusterGroups of clusters) {
    if (clusterGroups.length === 0) continue;
    const centroid = groupCentroid(clusterGroups.flat());
    for (const group of clusterGroups) {
      const gc = groupCentroid(group);
      total += haversineDistance(gc.lat, gc.lon, centroid.lat, centroid.lon);
    }
  }
  return total;
}

function rebalanceClusters(
  clusters: OptimizerPlace[][][],
  minSize: number,
  maxSize: number,
  maxDailyMinutes: number,
  dailyBudgetUsd: number,
  maxMuseumsPerDay: number
): OptimizerPlace[][][] {
  const sizeOf = (c: OptimizerPlace[][]) => c.reduce((sum, g) => sum + g.length, 0);
  const durationOf = (c: OptimizerPlace[][]) => calculateClusterMetrics(c, dailyBudgetUsd).durationMin;

  let rounds = 0;
  while (rounds < 40) {
    rounds++;
    const baselineCost = groupCentroidsCost(clusters);
    let bestCost = baselineCost;
    let bestAction: (() => void) | null = null;

    for (let a = 0; a < clusters.length; a++) {
      for (let b = 0; b < clusters.length; b++) {
        if (a === b) continue;

        for (let i = 0; i < clusters[a].length; i++) {
          const groupA = clusters[a][i];
          const groupAMuseums = groupA.filter(isMuseumCategory).length;
          const sizeA = sizeOf(clusters[a]);
          const sizeB = sizeOf(clusters[b]);

          const resultingSizeA = sizeA - groupA.length;
          const resultingSizeB = sizeB + groupA.length;
          const resultingMuseumsB = museumCountIn(clusters[b]) + groupAMuseums;

          if (resultingSizeA >= minSize && resultingSizeB <= maxSize && resultingMuseumsB <= maxMuseumsPerDay) {
            const trial = clusters.map((c) => c.map((g) => g));
            trial[a] = trial[a].filter((_, idx) => idx !== i);
            trial[b] = [...trial[b], groupA];

            if (durationOf(trial[b]) <= maxDailyMinutes) {
              const cost = groupCentroidsCost(trial);
              if (cost < bestCost - 0.05) {
                bestCost = cost;
                bestAction = () => {
                  clusters[a] = clusters[a].filter((_, idx) => idx !== i);
                  clusters[b] = [...clusters[b], groupA];
                };
              }
            }
          }

          for (let j = 0; j < clusters[b].length; j++) {
            const groupB = clusters[b][j];
            const groupBMuseums = groupB.filter(isMuseumCategory).length;

            const resultingMuseumsA = museumCountIn(clusters[a]) - groupAMuseums + groupBMuseums;
            const resultingMuseumsBSwap = museumCountIn(clusters[b]) - groupBMuseums + groupAMuseums;

            if (resultingMuseumsA > maxMuseumsPerDay || resultingMuseumsBSwap > maxMuseumsPerDay) continue;

            const trial = clusters.map((c) => c.map((g) => g));
            trial[a][i] = groupB;
            trial[b][j] = groupA;

            if (durationOf(trial[a]) <= maxDailyMinutes && durationOf(trial[b]) <= maxDailyMinutes) {
              const cost = groupCentroidsCost(trial);
              if (cost < bestCost - 0.05) {
                bestCost = cost;
                bestAction = () => {
                  clusters[a][i] = groupB;
                  clusters[b][j] = groupA;
                };
              }
            }
          }
        }
      }
    }

    if (!bestAction) break;
    bestAction();
  }

  return clusters;
}

function totalRouteDistance(route: OptimizerPlace[]): number {
  let total = 0;
  for (let i = 0; i < route.length - 1; i++) {
    total += haversineDistance(route[i].latitude, route[i].longitude, route[i + 1].latitude, route[i + 1].longitude);
  }
  return total;
}

function nearestNeighborOrder(places: OptimizerPlace[]): OptimizerPlace[] {
  if (places.length === 0) return [];
  const remaining = [...places];
  const ordered: OptimizerPlace[] = [remaining.shift()!];

  while (remaining.length > 0) {
    const last = ordered[ordered.length - 1];
    let nearestIdx = 0;
    let nearestDist = Infinity;

    for (let idx = 0; idx < remaining.length; idx++) {
      const dist = haversineDistance(last.latitude, last.longitude, remaining[idx].latitude, remaining[idx].longitude);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestIdx = idx;
      }
    }

    ordered.push(remaining[nearestIdx]);
    remaining.splice(nearestIdx, 1);
  }

  return ordered;
}


function computeLegs(route: OptimizerPlace[]): RouteLeg[] {
  const legs: RouteLeg[] = [];
  for (let i = 0; i < route.length - 1; i++) {
    const distanceKm = haversineDistance(
      route[i].latitude, route[i].longitude,
      route[i + 1].latitude, route[i + 1].longitude
    );
    const travelTimeMin = Math.round((distanceKm / AVG_WALKING_SPEED_KMH) * 60);
    legs.push({
      fromName: route[i].name,
      toName: route[i + 1].name,
      distanceKm: Math.round(distanceKm * 10) / 10,
      travelTimeMin,
    });
  }
  return legs;
}

// Inserts a lunch stop roughly at the midpoint of the day's route — placed
// after whichever real stop is closest to the halfway mark by cumulative
// visit+travel time, so lunch lands naturally mid-day rather than at a
// fixed stop index regardless of how long the morning ran.
function insertLunch(route: OptimizerPlace[], destination: string): OptimizerPlace[] {
  if (route.length === 0) return route;

  let cumulative = 0;
  const durations = route.map((p) => inferVisitDuration(p));
  const totalDuration = durations.reduce((sum, d) => sum + d, 0);
  const halfway = totalDuration / 2;

  let insertAfterIdx = route.length - 1;
  for (let i = 0; i < route.length; i++) {
    cumulative += durations[i];
    if (cumulative >= halfway) {
      insertAfterIdx = i;
      break;
    }
  }

  const lunchStop: OptimizerPlace = {
    id: `lunch-${insertAfterIdx}-${Math.random().toString(36).slice(2, 8)}`,
    name: `Lunch near ${route[insertAfterIdx].name}`,
    latitude: route[insertAfterIdx].latitude,
    longitude: route[insertAfterIdx].longitude,
    category: "dining",
    visitDurationMin: MEAL_DURATION_MIN,
  };

  return [
    ...route.slice(0, insertAfterIdx + 1),
    lunchStop,
    ...route.slice(insertAfterIdx + 1),
  ];
}

function twoOptImprove(route: OptimizerPlace[]): OptimizerPlace[] {
  if (route.length < 4) return route;
  let improved = true;
  let best = [...route];

  while (improved) {
    improved = false;
    for (let i = 1; i < best.length - 2; i++) {
      for (let j = i + 1; j < best.length - 1; j++) {
        const newRoute = [...best.slice(0, i), ...best.slice(i, j + 1).reverse(), ...best.slice(j + 1)];
        if (totalRouteDistance(newRoute) < totalRouteDistance(best)) {
          best = newRoute;
          improved = true;
        }
      }
    }
  }

  return best;
}

function orderStopsByProximity(
  places: OptimizerPlace[],
  destination: string
): { ordered: OptimizerPlace[]; totalDistanceKm: number; legs: RouteLeg[] } {
  if (places.length === 0) return { ordered: [], totalDistanceKm: 0, legs: [] };
  const initial = nearestNeighborOrder(places);
  const improved = twoOptImprove(initial);
  const withLunch = insertLunch(improved, destination);
  const legs = computeLegs(withLunch);
  return {
    ordered: withLunch,
    totalDistanceKm: totalRouteDistance(withLunch),
    legs,
  };
}

function recalculateDayMetrics(day: DayPlan, dailyBudgetUsd: number): void {
  // Strip any previously-inserted lunch stop before recalculating, so we
  // don't accumulate duplicate lunch entries across multiple rebalance passes
  const realStops = day.stops.filter((s) => s.category !== "dining");
  const { ordered, totalDistanceKm, legs } = orderStopsByProximity(realStops, "");
  const groupedForMetrics = ordered.filter((s) => s.category !== "dining").map((s) => [s]);
  const { durationMin, estimatedCost } = calculateClusterMetrics(groupedForMetrics, dailyBudgetUsd);

  day.stops = ordered;
  day.legs = legs;
  day.totalDistanceKm = Math.round(totalDistanceKm * 10) / 10;
  day.totalDurationMin = Math.round(durationMin) + MEAL_DURATION_MIN;
  day.estimatedDayCostUsd = Math.round(estimatedCost);
}


/**
 * Final safety-net pass operating directly on the finished DayPlan array.
 * Even after cluster-level rebalancing, a day can still end up under the
 * minimum workload (e.g. a lone outlier like a far-east fountain) or over
 * the maximum. This pass moves individual stops — picking whichever stop
 * on the overloaded day is geographically closest to the underloaded day —
 * from over-filled days into under-filled ones, then recalculates both
 * days' metrics and re-runs route ordering so the moved stop is inserted
 * sensibly rather than just appended.
 */
function enforceStrictDayLimits(days: DayPlan[], dailyBudgetUsd: number): DayPlan[] {
  const underloaded = days.filter((d) => d.totalDurationMin < MIN_DAY_DURATION_MIN);
  const overloaded = days.filter((d) => d.totalDurationMin > MAX_DAY_DURATION_MIN);

  if (underloaded.length === 0 && overloaded.length === 0) {
    return days;
  }

  for (const emptyDay of underloaded) {
    for (const heavyDay of overloaded) {
      if (heavyDay.stops.length <= 1) continue;

      let bestStopIdx = -1;
      let minDistance = Infinity;

      heavyDay.stops.forEach((stop, idx) => {
        if (heavyDay.stops.length - 1 === 0) return;
        const avgDistToEmptyDay =
          emptyDay.stops.reduce((sum, s) => sum + haversineDistance(stop.latitude, stop.longitude, s.latitude, s.longitude), 0) /
          (emptyDay.stops.length || 1);
        if (avgDistToEmptyDay < minDistance) {
          minDistance = avgDistToEmptyDay;
          bestStopIdx = idx;
        }
      });

      if (bestStopIdx !== -1) {
        const [movedStop] = heavyDay.stops.splice(bestStopIdx, 1);
        emptyDay.stops.push(movedStop);

        recalculateDayMetrics(heavyDay, dailyBudgetUsd);
        recalculateDayMetrics(emptyDay, dailyBudgetUsd);

        if (emptyDay.totalDurationMin >= MIN_DAY_DURATION_MIN) break;
      }
    }
  }

  return days.filter((d) => d.stops.length > 0);
}

export function buildUniversalItinerary(places: OptimizerPlace[], constraints: TripConstraints): DayPlan[] {
  if (places.length === 0 || constraints.numDays <= 0) return [];

  const {
    numDays,
    totalBudgetUsd,
    targetActiveHoursPerDay = 5.5,
    maxMuseumsPerDay = 1,
    namedDistricts = [],
  } = constraints;

  const dailyBudgetUsd = totalBudgetUsd / numDays;
  const maxDailyMinutes = targetActiveHoursPerDay * 60;

  const mergedGroups = mergeNearDuplicatesAndDistricts(places, namedDistricts);
  const totalStops = mergedGroups.reduce((sum, g) => sum + g.length, 0);
  const avgSize = totalStops / numDays;
  const minSize = Math.max(1, Math.floor(avgSize - 1));
  const maxSize = Math.ceil(avgSize + 1);

  let clusters = clusterGlobalDestinations(mergedGroups, numDays, maxDailyMinutes, dailyBudgetUsd, maxMuseumsPerDay);
  clusters = rebalanceClusters(clusters, minSize, maxSize, maxDailyMinutes, dailyBudgetUsd, maxMuseumsPerDay);

  let days: DayPlan[] = [];
    clusters.forEach((clusterGroups, idx) => {
    const dayPlaces = clusterGroups.flat();
    if (dayPlaces.length === 0) return;

    const { ordered, totalDistanceKm, legs } = orderStopsByProximity(dayPlaces, "");
    const { durationMin, estimatedCost } = calculateClusterMetrics(clusterGroups, dailyBudgetUsd);

    days.push({
      dayNumber: idx + 1,
      stops: ordered,
      legs,
      totalDistanceKm: Math.round(totalDistanceKm * 10) / 10,
      totalDurationMin: Math.round(durationMin) + MEAL_DURATION_MIN,
      estimatedDayCostUsd: Math.round(estimatedCost),
    });
  });

  days = enforceStrictDayLimits(days, dailyBudgetUsd);

  days.forEach((d, idx) => (d.dayNumber = idx + 1));

  return days;
}