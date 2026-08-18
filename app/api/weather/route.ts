import { NextRequest, NextResponse } from "next/server";
import { fetchWeatherSnapshot } from "@/lib/weather";

export async function GET(request: NextRequest) {
  const latParam = request.nextUrl.searchParams.get("lat");
  const lngParam = request.nextUrl.searchParams.get("lng");
  const lat = latParam ? Number(latParam) : Number.NaN;
  const lng = lngParam ? Number(lngParam) : Number.NaN;

  try {
    const snapshot = await fetchWeatherSnapshot(
      Number.isFinite(lat) ? lat : undefined,
      Number.isFinite(lng) ? lng : undefined,
    );
    return NextResponse.json(snapshot);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "날씨 정보를 불러오지 못했습니다.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
    return NextResponse.json(snapshot);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "날씨 정보를 불러오지 못했습니다.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
