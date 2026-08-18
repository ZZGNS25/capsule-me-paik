import { NextResponse } from "next/server";
import { generateCapsuleStyle } from "@/lib/gemini";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      weather?: string | null;
      weather_temp?: number | null;
      weather_humidity?: number | null;
      recipient?: string;
      letter?: string;
    };

    const style = await generateCapsuleStyle({
      weather: body.weather ?? null,
      weather_temp:
        typeof body.weather_temp === "number" ? body.weather_temp : null,
      weather_humidity:
        typeof body.weather_humidity === "number"
          ? body.weather_humidity
          : null,
      recipient: body.recipient,
      letter: body.letter,
    });

    return NextResponse.json(style);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "캡슐 스타일을 만들지 못했습니다.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
