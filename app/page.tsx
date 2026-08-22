"use client";

import { useState } from "react";

export default function Home() {
  const [destination, setDestination] = useState("");
  const [budget, setBudget] = useState("");
  const [days, setDays] = useState(3);
  const [loading, setLoading] = useState(false);
  const [itinerary, setItinerary] = useState<any[]>([]);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setItinerary([]);
    setSaved(false);

    const res = await fetch("/api/plan-trip", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ destination, budget, days }),
    });

    const data = await res.json();
    setItinerary(data.itinerary || []);
    setLoading(false);
  }

  async function handleSave() {
    const res = await fetch("/api/save-trip", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ destination, budget, itinerary }),
    });
    if (res.ok) setSaved(true);
  }

  return (
    <main style={{ maxWidth: 700, margin: "0 auto", padding: "2rem" }}>
      <h1>AI Travel Planner</h1>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <input
          placeholder="Destination (e.g. Paris)"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          required
        />
        <input
          placeholder="Budget (USD)"
          type="number"
          value={budget}
          onChange={(e) => setBudget(e.target.value)}
          required
        />
        <input
          placeholder="Number of days"
          type="number"
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? "Planning your trip..." : "Generate Itinerary"}
        </button>
      </form>

      {itinerary.map((day) => (
        <div key={day.dayNumber} style={{ marginTop: "2rem", borderTop: "1px solid #ccc", paddingTop: "1rem" }}>
          <h2>Day {day.dayNumber}</h2>
          <p>{day.narrative}</p>
          <ul>
            {day.stops.map((stop: any) => (
              <li key={stop.id}>{stop.name}</li>
            ))}
          </ul>
          <small>Total distance: {day.totalDistanceKm} km</small>
        </div>
      ))}

      {itinerary.length > 0 && (
        <button onClick={handleSave} style={{ marginTop: "1rem" }}>
          {saved ? "Saved ✓" : "Save Trip"}
        </button>
      )}
    </main>
  );
}