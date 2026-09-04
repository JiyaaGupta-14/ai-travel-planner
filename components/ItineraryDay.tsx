interface Stop {
  id: string;
  name: string;
  category?: string | null;
}

interface Leg {
  fromName: string;
  toName: string;
  distanceKm: number;
  travelTimeMin: number;
}

interface ItineraryDayProps {
  dayNumber: number;
  narrative: string;
  stops: Stop[];
  legs: Leg[];
  totalDistanceKm: number;
  totalDurationMin: number;
}

export default function ItineraryDay({
  dayNumber,
  narrative,
  stops,
  legs,
  totalDistanceKm,
  totalDurationMin,
}: ItineraryDayProps) {
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-neutral-100">Day {dayNumber}</h3>
        <span className="text-xs text-neutral-500">
          {totalDistanceKm} km · {(totalDurationMin / 60).toFixed(1)} hrs
        </span>
      </div>
      <p className="text-neutral-300 text-sm leading-relaxed mb-4">{narrative}</p>

      <div className="flex flex-col gap-1">
        {stops.map((stop, idx) => (
          <div key={stop.id}>
            <span
              className={`text-xs px-3 py-1 rounded-full border inline-block ${
                stop.category === "dining"
                  ? "bg-amber-950/40 text-amber-300 border-amber-800"
                  : "bg-neutral-800 text-neutral-300 border-neutral-700"
              }`}
            >
              {stop.category === "dining" ? "🍽 " : ""}
              {stop.name}
            </span>
            {legs[idx] && (
              <div className="text-xs text-neutral-600 pl-2 py-1">
                ↓ {legs[idx].distanceKm} km · ~{legs[idx].travelTimeMin} min walk
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}