import { NextRequest, NextResponse } from "next/server";
import { searchPlacesByVibe } from "@/lib/search";
import { buildItinerary } from "@/lib/optimizer";
import { generateDayNarrative } from "@/lib/narrative";

export async function POST(req: NextRequest) {
  try {
    const { destination, budget, days } = await req.json();

    const places = await searchPlacesByVibe(destination, 6) as any[];

    const dayPlans = buildItinerary(
      places.map((p) => ({
        id: p.id,
        name: p.name,
        latitude: p.latitude,
        longitude: p.longitude,
      })),
      days
    );

    const itinerary = [];
    for (const day of dayPlans) {
      const narrative = await generateDayNarrative(day, destination);
      itinerary.push({ ...day, narrative });
    }

    return NextResponse.json({ itinerary });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to generate itinerary" }, { status: 500 });
  }
}