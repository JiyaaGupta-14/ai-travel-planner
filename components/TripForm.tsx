"use client";

interface TripFormProps {
  destination: string;
  budget: string;
  days: number;
  loading: boolean;
  onDestinationChange: (v: string) => void;
  onBudgetChange: (v: string) => void;
  onDaysChange: (v: number) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export default function TripForm({
  destination,
  budget,
  days,
  loading,
  onDestinationChange,
  onBudgetChange,
  onDaysChange,
  onSubmit,
}: TripFormProps) {
  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-4 bg-neutral-900 p-6 rounded-2xl border border-neutral-800 shadow-xl"
    >
      <div className="flex flex-col gap-1">
        <label className="text-sm text-neutral-400">Destination</label>
        <input
          className="border border-neutral-700 rounded-lg px-4 py-2 bg-neutral-950 text-neutral-100 outline-none focus:border-blue-500 transition"
          placeholder="e.g. Paris"
          value={destination}
          onChange={(e) => onDestinationChange(e.target.value)}
          required
        />
      </div>

      <div className="flex gap-4">
        <div className="flex flex-col gap-1 flex-1">
          <label className="text-sm text-neutral-400">Budget (USD)</label>
          <input
            className="border border-neutral-700 rounded-lg px-4 py-2 bg-neutral-950 text-neutral-100 outline-none focus:border-blue-500 transition"
            type="number"
            value={budget}
            onChange={(e) => onBudgetChange(e.target.value)}
            required
          />
        </div>
        <div className="flex flex-col gap-1 flex-1">
          <label className="text-sm text-neutral-400">Days</label>
          <input
            className="border border-neutral-700 rounded-lg px-4 py-2 bg-neutral-950 text-neutral-100 outline-none focus:border-blue-500 transition"
            type="number"
            min={1}
            max={14}
            value={days}
            onChange={(e) => onDaysChange(Number(e.target.value))}
            required
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium rounded-lg px-4 py-2.5 transition"
      >
        {loading ? "Planning your trip..." : "Generate Itinerary"}
      </button>
    </form>
  );
}