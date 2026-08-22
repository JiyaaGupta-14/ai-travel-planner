import { buildItinerary } from "../lib/optimizer";
import { generateDayNarrative } from "../lib/narrative";

const testPlaces = [
  { id: "1", name: "Eiffel Tower", latitude: 48.8584, longitude: 2.2945 },
  { id: "2", name: "Louvre Museum", latitude: 48.8606, longitude: 2.3376 },
  { id: "3", name: "Notre-Dame", latitude: 48.8530, longitude: 2.3499 },
];

async function main() {
  const itinerary = buildItinerary(testPlaces, 1);
  const narrative = await generateDayNarrative(itinerary[0], "Paris");
  console.log(narrative);
}

main();