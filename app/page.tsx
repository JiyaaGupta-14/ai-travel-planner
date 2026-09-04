"use client";

import { useState } from "react";
import TripForm from "@/components/TripForm";
import ItineraryDay from "@/components/ItineraryDay";

interface Day {
  dayNumber: number;
  narrative: string;
  stops: { id: string; name: string; category?: string | null }[];
  legs: { fromName: string; toName: string; distanceKm: number; travelTimeMin: number }[];
  totalDistanceKm: number;
  totalDurationMin: number;
}

export default function Home() {
  const [destination, setDestination] = useState("");
  const [budget, setBudget] = useState("");
  const [days, setDays] = useState(3);
  const [loading, setLoading] = useState(false);
  const [itinerary, setItinerary] = useState<Day[]>([]);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  // Country-flow state
  const [needsCitySelection, setNeedsCitySelection] = useState(false);
  const [startCity, setStartCity] = useState("");
  const [endCity, setEndCity] = useState("");
  const [countryName, setCountryName] = useState("");

  async function classifyAndProceed(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const res = await fetch("/api/classify-destination", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ destination }),
    });
    const data = await res.json();

    if (data.type === "country") {
      setCountryName(data.formattedName);
      setNeedsCitySelection(true);
      return;
    }

    await generateItinerary(destination);
  }

  async function handleCitySelectionSubmit(e: React.FormEvent) {
    e.preventDefault();
    // For now, generate the itinerary for the start city.
    // (Multi-city routing across a country is a bigger feature — see note below.)
    await generateItinerary(startCity);
  }

  async function generateItinerary(targetDestination: string) {
    setLoading(true);
    setItinerary([]);
    setSaved(false);
    setError("");

    try {
      const res = await fetch("/api/plan-trip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destination: targetDestination, budget, days }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong.");
      } else {
        setItinerary(data.itinerary || []);
      }
    } catch {
      setError("Failed to reach the server.");
    }
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
    <main className="min-h-screen bg-neutral-950 text-neutral-100 px-4 py-12">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-1">AI Travel Planner</h1>
        <p className="text-neutral-500 mb-8 text-sm">
          RAG-powered recommendations, route-optimized itineraries.
        </p>

        {!needsCitySelection ? (
          <TripForm
            destination={destination}
            budget={budget}
            days={days}
            loading={loading}
            onDestinationChange={setDestination}
            onBudgetChange={setBudget}
            onDaysChange={setDays}
            onSubmit={classifyAndProceed}
          />
        ) : (
          <form
            onSubmit={handleCitySelectionSubmit}
            className="flex flex-col gap-4 bg-neutral-900 p-6 rounded-2xl border border-neutral-800"
          >
            <p className="text-sm text-neutral-400">
              {countryName} is a country — tell us which cities you're starting and ending your trip in.
            </p>
            <input
              className="border border-neutral-700 rounded-lg px-4 py-2 bg-neutral-950 text-neutral-100 outline-none focus:border-blue-500"
              placeholder="Start city (e.g. Rome)"
              value={startCity}
              onChange={(e) => setStartCity(e.target.value)}
              required
            />
            <input
              className="border border-neutral-700 rounded-lg px-4 py-2 bg-neutral-950 text-neutral-100 outline-none focus:border-blue-500"
              placeholder="End city (e.g. Florence)"
              value={endCity}
              onChange={(e) => setEndCity(e.target.value)}
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-medium rounded-lg px-4 py-2.5 transition"
            >
              {loading ? "Planning..." : "Generate Itinerary"}
            </button>
            <button
              type="button"
              onClick={() => setNeedsCitySelection(false)}
              className="text-xs text-neutral-500 hover:text-neutral-300 self-start"
            >
              ← Back
            </button>
          </form>
        )}

        {error && (
          <p className="mt-4 text-red-400 text-sm bg-red-950/40 border border-red-900 rounded-lg px-4 py-3">
            {error}
          </p>
        )}

        {itinerary.length > 0 && (
          <div className="mt-8 flex flex-col gap-4">
            {itinerary.map((day) => (
              <ItineraryDay key={day.dayNumber} {...day} />
            ))}
            <button
              onClick={handleSave}
              className="self-start mt-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg px-5 py-2.5 transition"
            >
              {saved ? "Saved ✓" : "Save Trip"}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}