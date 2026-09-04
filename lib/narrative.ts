import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { GoogleGenAI } from "@google/genai";
import type { DayPlan } from "./optimizer";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export async function generateDayNarrative(day: DayPlan, destination: string): Promise<string> {
  const stopNames = day.stops.map((s) => s.name).join(", ");

  const prompt = `You are a friendly travel guide. Write a short, engaging 2-3 sentence description for Day ${day.dayNumber} of a trip to ${destination}.
The stops for this day, in visiting order, are: ${stopNames}.

Rules:
- Only describe the order of visiting (e.g. "start at X, then head to Y").
- Do NOT invent specific street names, neighborhoods, piazzas, or distances between stops — you don't have that information and may get it wrong.
- Keep descriptions general and about the places themselves, not the route between them.
- Keep it concise and avoid generic filler.`;

  const result = await ai.models.generateContent({
    model: "gemini-3.5-flash-lite",
    contents: prompt,
  });

  return result.text ?? "";
}