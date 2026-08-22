import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const DEMO_USER_ID = "288d4ff4-f586-4984-922f-78c5040b540b";

export async function POST(req: NextRequest) {
  try {
    const { destination, budget, itinerary } = await req.json();

    const trip = await prisma.trip.create({
      data: {
        userId: DEMO_USER_ID,
        destination,
        budget: Number(budget),
        startDate: new Date(),
        endDate: new Date(),
        days: {
          create: itinerary.map((day: any) => ({
            dayNumber: day.dayNumber,
            narrative: day.narrative,
          })),
        },
      },
    });

    return NextResponse.json({ success: true, tripId: trip.id });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to save trip" }, { status: 500 });
  }
}