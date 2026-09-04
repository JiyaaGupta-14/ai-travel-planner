import { buildUniversalItinerary } from "../lib/optimizer";

const testPlaces = [
  { id: "1", name: "Basilica di Santa Maria delle Grazie", latitude: 45.4655, longitude: 9.1707, category: "museum" },
  { id: "2", name: "Piazza Castello Fountain", latitude: 45.4706, longitude: 9.1794, category: "landmark" },
  { id: "3", name: "Sforzesco Castle", latitude: 45.4706, longitude: 9.1797, category: "museum" },
  { id: "4", name: "Branca Tower", latitude: 45.4726, longitude: 9.1751, category: "viewpoint" },
  { id: "5", name: "Arco della Pace", latitude: 45.4746, longitude: 9.1707, category: "landmark" },
  { id: "6", name: "Pinacoteca di Brera", latitude: 45.4718, longitude: 9.1880, category: "museum" },
  { id: "7", name: "HIGHLINE Milano", latitude: 45.4642, longitude: 9.1895, category: "viewpoint" },
  { id: "8", name: "Galleria Vittorio Emanuele II", latitude: 45.4656, longitude: 9.1900, category: "landmark" },
  { id: "9", name: "Piazza del Duomo", latitude: 45.4642, longitude: 9.1900, category: "landmark" },
  { id: "10", name: "Madonnina", latitude: 45.4641, longitude: 9.1919, category: "landmark" },
  { id: "11", name: "Quadrilatero del Silenzio", latitude: 45.4696, longitude: 9.1969, category: "landmark" },
  { id: "12", name: "Fontana Giuseppe Grandi", latitude: 45.4695, longitude: 9.2135, category: "landmark" },
];

const itinerary = buildUniversalItinerary(testPlaces, {
  numDays: 4,
  totalBudgetUsd: 1200,
});

console.log(JSON.stringify(itinerary, null, 2));