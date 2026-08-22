import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const API_KEY = process.env.GOOGLE_MAPS_API_KEY!;

export interface GooglePlace {
  googlePlaceId: string;
  name: string;
  category?: string;
  latitude: number;
  longitude: number;
  rating?: number;
  priceLevel?: number;
  description: string;
}

export async function fetchPlacesForDestination(destination: string, limit: number = 10): Promise<GooglePlace[]> {
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": API_KEY,
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.priceLevel,places.types,places.editorialSummary",
    },
    body: JSON.stringify({
      textQuery: `top tourist attractions in ${destination}`,
      maxResultCount: limit,
    }),
  });

  const data = await res.json();

  if (!data.places) {
    console.error("No places returned:", data);
    return [];
  }

  return data.places.map((p: any) => ({
    googlePlaceId: p.id,
    name: p.displayName?.text ?? "Unknown",
    category: p.types?.[0] ?? undefined,
    latitude: p.location?.latitude,
    longitude: p.location?.longitude,
    rating: p.rating,
    priceLevel: p.priceLevel ? Number(p.priceLevel) : undefined,
    description: p.editorialSummary?.text ?? `${p.displayName?.text} — a popular spot in ${destination}.`,
  }));
}