import { NextRequest, NextResponse } from "next/server";
import { searchPlacesByVibe } from "@/lib/search";
import { buildUniversalItinerary } from "@/lib/optimizer";
import { generateDayNarrative } from "@/lib/narrative";
import { fetchPlacesForDestination } from "@/lib/places";
import { embedText } from "@/lib/gemini";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function ensureDestinationSeeded(destination: string) {
  const existing = await prisma.$queryRawUnsafe<any[]>(
    `SELECT id FROM "Place" WHERE destination ILIKE $1 LIMIT 1`,
    destination
  );
  if (existing.length > 0) return;

  const places = await fetchPlacesForDestination(destination, 20);
  for (const place of places) {
    if (!place.latitude || !place.longitude) continue;
    const embedding = await embedText(place.description);
    await prisma.$executeRawUnsafe(
      `INSERT INTO "Place" (id, "googlePlaceId", name, category, destination, latitude, longitude, "priceLevel", rating, description, embedding)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10::vector)
       ON CONFLICT ("googlePlaceId") DO NOTHING`,
      place.googlePlaceId,
      place.name,
      place.category,
      destination,
      place.latitude,
      place.longitude,
      place.priceLevel ?? null,
      place.rating ?? null,
      place.description,
      `[${embedding.join(",")}]`
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { destination, budget, days } = await req.json();
    const numDays = Number(days) || 3;

    await ensureDestinationSeeded(destination);

    const placesNeeded = Math.max(numDays * 3, 6);
    const places = (await searchPlacesByVibe(destination, destination, placesNeeded)) as any[];

    if (places.length === 0) {
      return NextResponse.json(
        { error: `Couldn't find enough places for "${destination}". Try a different or more specific destination.` },
        { status: 404 }
      );
    }

    const dayPlans = buildUniversalItinerary(
      places.map((p) => ({
        id: p.id,
        name: p.name,
        latitude: p.latitude,
        longitude: p.longitude,
        category: p.category,
      })),
      { numDays, totalBudgetUsd: Number(budget) || 1000 }
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