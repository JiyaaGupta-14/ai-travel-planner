import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const API_KEY = process.env.GOOGLE_MAPS_API_KEY!;

export interface GeocodeResult {
  type: "country" | "city" | "unknown";
  formattedName: string;
}

export async function classifyDestination(query: string): Promise<GeocodeResult> {
  const res = await fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${API_KEY}`
  );
  const data = await res.json();

  if (!data.results || data.results.length === 0) {
    return { type: "unknown", formattedName: query };
  }

  const result = data.results[0];
  const types: string[] = result.types || [];

  if (types.includes("country")) {
    return { type: "country", formattedName: result.formatted_address };
  }
  if (types.includes("locality") || types.includes("postal_town")) {
    return { type: "city", formattedName: result.formatted_address };
  }

  return { type: "unknown", formattedName: result.formatted_address };
}