import { buildItinerary } from "../lib/optimizer";
import { generateDayNarrative } from "../lib/narrative";

const testPlaces = [
  { id: "1", name: "Eiffel Tower", latitude: 48.8584, longitude: 2.2945 },
  { id: "2", name: "Louvre Museum", latitude: 48.8606, longitude: 2.3376 },
  { id: "3", name: "Notre-Dame", latitude: 48.8530, longitude: 2.3499 },
  { id: "4", name: "Montmartre", latitude: 48.8867, longitude: 2.3431 },
  { id: "5", name: "Champs-Élysées", latitude: 48.8698, longitude: 2.3078 },
  { id: "6", name: "Arc de Triomphe", latitude: 48.8738, longitude: 2.2950 },
];

async function main() {
  const days = buildItinerary(testPlaces, 2);

  const fullItinerary = [];
  for (const day of days) {
    const narrative = await generateDayNarrative(day, "Paris");
    fullItinerary.push({ ...day, narrative });
  }

  console.log(JSON.stringify(fullItinerary, null, 2));
}

main();