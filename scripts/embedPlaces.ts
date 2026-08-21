import { PrismaClient } from "@prisma/client";
import { embedText } from "../lib/gemini";

const prisma = new PrismaClient();

async function main() {
  const place = {
    googlePlaceId: "test123",
    name: "Eiffel Tower",
    category: "Landmark",
    latitude: 48.8584,
    longitude: 2.2945,
    description: "Iconic iron lattice tower in Paris, offering panoramic city views.",
  };

  const embedding = await embedText(place.description);

  await prisma.$executeRawUnsafe(
    `INSERT INTO "Place" (id, "googlePlaceId", name, category, latitude, longitude, description, embedding)
     VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7::vector)`,
    place.googlePlaceId,
    place.name,
    place.category,
    place.latitude,
    place.longitude,
    place.description,
    `[${embedding.join(",")}]`
  );

  console.log("Place inserted with embedding.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());