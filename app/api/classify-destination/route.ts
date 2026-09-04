import { NextRequest, NextResponse } from "next/server";
import { classifyDestination } from "@/lib/geocode";

export async function POST(req: NextRequest) {
  try {
    const { destination } = await req.json();
    const result = await classifyDestination(destination);
    return NextResponse.json(result);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to classify destination" }, { status: 500 });
  }
}