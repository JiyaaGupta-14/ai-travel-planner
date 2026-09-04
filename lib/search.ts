import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { PrismaClient } from "@prisma/client";
import { embedText } from "./gemini";

const prisma = new PrismaClient();

export async function searchPlacesByVibe(query: string, destination: string, limit: number = 5) {
  const queryEmbedding = await embedText(query);
  const vectorString = `[${queryEmbedding.join(",")}]`;

  const results = await prisma.$queryRawUnsafe(
    `SELECT id, name, category, description, latitude, longitude,
            1 - (embedding <=> $1::vector) AS similarity
     FROM "Place"
     WHERE destination ILIKE $2
     ORDER BY embedding <=> $1::vector
     LIMIT $3`,
    vectorString,
    destination,
    limit
  );

  return results;
}