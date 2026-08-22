import { searchPlacesByVibe } from "../lib/search";

async function main() {
  const results = await searchPlacesByVibe("famous landmark with a view");
  console.log(results);
}

main();