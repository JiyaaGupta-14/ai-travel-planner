import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const API_KEY = process.env.GOOGLE_MAPS_API_KEY!;

export interface LatLon {
  lat: number;
  lon: number;
}

export async function getWalkingDistanceMatrix(points: LatLon[]): Promise<{
  distanceKm: number[][];
  durationMin: number[][];
}> {
  const origins = points.map((p) => `${p.lat},${p.lon}`).join("|");
  const destinations = origins;

  const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origins}&destinations=${destinations}&mode=walking&key=${API_KEY}`;

  const res = await fetch(url);
  const data = await res.json();

  if (data.status !== "OK") {
    throw new Error(`Distance Matrix API error: ${data.status}`);
  }

  const n = points.length;
  const distanceKm: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  const durationMin: number[][] = Array.from({ length: n }, () => Array(n).fill(0));

  data.rows.forEach((row: any, i: number) => {
    row.elements.forEach((el: any, j: number) => {
      if (el.status === "OK") {
        distanceKm[i][j] = el.distance.value / 1000;
        durationMin[i][j] = el.duration.value / 60;
      } else {
        distanceKm[i][j] = Infinity;
        durationMin[i][j] = Infinity;
      }
    });
  });

  return { distanceKm, durationMin };
}