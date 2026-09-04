import { PrismaClient } from "@prisma/client";
import { fetchPlacesForDestination } from "../lib/places";
import { embedText } from "../lib/gemini";

const prisma = new PrismaClient();

async function main() {
  const destination = process.argv[2] || "Paris";
  console.log(`Fetching places for ${destination}...`);

  const places = await fetchPlacesForDestination(destination, 20);
  console.log(`Found ${places.length} places.`);

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

    console.log(`Inserted: ${place.name}`);
  }

  console.log("Done seeding.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());