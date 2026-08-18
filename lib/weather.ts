export type WeatherSnapshot = {
  weather: string;
  weather_temp: number | null;
  weather_humidity: number | null;
  location: string | null;
  fallback: boolean;
};

const SEOUL = { lat: 37.5665, lng: 126.978 };

const PTY_LABEL: Record<string, string> = {
  "0": "맑음",
  "1": "비",
  "2": "비/눈",
  "3": "눈",
  "4": "소나기",
  "5": "빗방울",
  "6": "빗방울눈날림",
  "7": "눈날림",
};

const SKY_LABEL: Record<string, string> = {
  "1": "맑음",
  "3": "구름많음",
  "4": "흐림",
};

type KmaItem = {
  category: string;
  obsrValue?: string;
  fcstValue?: string;
  fcstDate?: string;
  fcstTime?: string;
};

function kstParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "00";

  return {
    year: Number(value("year")),
    month: Number(value("month")),
    day: Number(value("day")),
    hour: Number(value("hour")),
    minute: Number(value("minute")),
  };
}

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function formatBase(year: number, month: number, day: number, hour: number) {
  return {
    baseDate: `${year}${pad2(month)}${pad2(day)}`,
    baseTime: `${pad2(hour)}00`,
  };
}

function shiftHour(
  year: number,
  month: number,
  day: number,
  hour: number,
  delta: number,
) {
  const utc = Date.UTC(year, month - 1, day, hour + delta);
  const shifted = new Date(utc);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
  };
}

export function getNcstBase() {
  const now = kstParts();
  const adjusted =
    now.minute < 40
      ? shiftHour(now.year, now.month, now.day, now.hour, -1)
      : now;
  return formatBase(adjusted.year, adjusted.month, adjusted.day, adjusted.hour);
}

export function getFcstBase() {
  const now = kstParts();
  let total = now.hour * 60 + now.minute - 10;
  if (total < 0) total += 24 * 60;
  const rounded = Math.floor(total / 10) * 10;
  const hour = Math.floor(rounded / 60) % 24;
  const minute = rounded % 60;
  const dayShift = now.hour * 60 + now.minute - 10 < 0 ? -1 : 0;
  const date = shiftHour(now.year, now.month, now.day, 0, dayShift * 24);
  return {
    baseDate: `${date.year}${pad2(date.month)}${pad2(date.day)}`,
    baseTime: `${pad2(hour)}${pad2(minute)}`,
  };
}

/** 기상청 LCC DFS 위경도 → 격자 (nx, ny) */
export function latLngToGrid(lat: number, lng: number) {
  const RE = 6371.00877;
  const GRID = 5.0;
  const SLAT1 = 30.0;
  const SLAT2 = 60.0;
  const OLON = 126.0;
  const OLAT = 38.0;
  const XO = 43;
  const YO = 136;
  const DEGRAD = Math.PI / 180.0;

  const re = RE / GRID;
  const slat1 = SLAT1 * DEGRAD;
  const slat2 = SLAT2 * DEGRAD;
  const olon = OLON * DEGRAD;
  const olat = OLAT * DEGRAD;

  let sn =
    Math.tan(Math.PI * 0.25 + slat2 * 0.5) /
    Math.tan(Math.PI * 0.25 + slat1 * 0.5);
  sn = Math.log(Math.cos(slat1) / Math.cos(slat2)) / Math.log(sn);
  let sf = Math.tan(Math.PI * 0.25 + slat1 * 0.5);
  sf = (Math.pow(sf, sn) * Math.cos(slat1)) / sn;
  let ro = Math.tan(Math.PI * 0.25 + olat * 0.5);
  ro = (re * sf) / Math.pow(ro, sn);

  let ra = Math.tan(Math.PI * 0.25 + lat * DEGRAD * 0.5);
  ra = (re * sf) / Math.pow(ra, sn);
  let theta = lng * DEGRAD - olon;
  if (theta > Math.PI) theta -= 2.0 * Math.PI;
  if (theta < -Math.PI) theta += 2.0 * Math.PI;
  theta *= sn;

  const nx = Math.floor(ra * Math.sin(theta) + XO + 0.5);
  const ny = Math.floor(ro - ra * Math.cos(theta) + YO + 0.5);
  return { nx, ny };
}

function parseNumber(value: string | undefined) {
  if (value == null || value === "" || value === "-") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function weatherLabel(pty: string | undefined, sky: string | undefined) {
  if (pty && pty !== "0" && PTY_LABEL[pty]) return PTY_LABEL[pty];
  if (sky && SKY_LABEL[sky]) return SKY_LABEL[sky];
  if (pty === "0") return "맑음";
  return "관측됨";
}

function itemsFromResponse(payload: unknown): KmaItem[] {
  if (!payload || typeof payload !== "object") return [];
  const body = (payload as { response?: { body?: { items?: { item?: unknown } } } })
    .response?.body?.items?.item;
  if (Array.isArray(body)) return body as KmaItem[];
  if (body && typeof body === "object") return [body as KmaItem];
  return [];
}

async function fetchKma(
  path: string,
  params: Record<string, string>,
): Promise<KmaItem[]> {
  const serviceKey = process.env.DATA_GO_KR_SERVICE_KEY;
  if (!serviceKey) {
    throw new Error("기상청 API 키가 설정되지 않았습니다.");
  }

  const url = new URL(
    `https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0${path}`,
  );
  url.searchParams.set("serviceKey", serviceKey);
  url.searchParams.set("pageNo", "1");
  url.searchParams.set("numOfRows", "60");
  url.searchParams.set("dataType", "JSON");
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url.toString(), { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`기상청 API 오류 (${response.status})`);
  }

  const payload = (await response.json()) as {
    response?: { header?: { resultCode?: string; resultMsg?: string } };
  };
  const code = payload.response?.header?.resultCode;
  if (code && code !== "00") {
    throw new Error(payload.response?.header?.resultMsg || "기상 정보를 불러오지 못했습니다.");
  }

  return itemsFromResponse(payload);
}

export function resolveCoords(lat?: number, lng?: number) {
  if (
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng)
  ) {
    return { lat, lng, fallback: false };
  }
  return { ...SEOUL, fallback: true };
}

type NominatimAddress = {
  city?: string;
  province?: string;
  state?: string;
  region?: string;
  borough?: string;
  city_district?: string;
  county?: string;
  town?: string;
  municipality?: string;
  suburb?: string;
  quarter?: string;
  neighbourhood?: string;
  village?: string;
};

function uniqueParts(parts: Array<string | undefined>) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const part of parts) {
    const value = part?.trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    result.push(value);
  }
  return result;
}

function formatNominatimLocation(
  address?: NominatimAddress,
  displayName?: string,
) {
  const fromAddress = uniqueParts([
    address?.city || address?.province || address?.state || address?.region,
    address?.borough ||
      address?.city_district ||
      address?.county ||
      address?.town ||
      address?.municipality,
    address?.suburb ||
      address?.quarter ||
      address?.neighbourhood ||
      address?.village,
  ]);
  if (fromAddress.length > 0) return fromAddress.join(" ");
  return displayName?.split(",")[0]?.trim() || null;
}

export async function reverseGeocode(lat: number, lng: number) {
  const roundedLat = lat.toFixed(3);
  const roundedLng = lng.toFixed(3);
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("lat", roundedLat);
  url.searchParams.set("lon", roundedLng);
  url.searchParams.set("zoom", "14");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("accept-language", "ko");

  try {
    const response = await fetch(url.toString(), {
      headers: {
        "User-Agent": "capsule-me/1.0 (time-capsule weather)",
        "Accept-Language": "ko",
      },
      next: { revalidate: 3600 },
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as {
      address?: NominatimAddress;
      display_name?: string;
    };
    return formatNominatimLocation(payload.address, payload.display_name);
  } catch {
    return null;
  }
}

export async function fetchWeatherSnapshot(
  lat?: number,
  lng?: number,
): Promise<WeatherSnapshot> {
  const coords = resolveCoords(lat, lng);
  let { nx, ny } = latLngToGrid(coords.lat, coords.lng);
  if (nx < 1 || nx > 149 || ny < 1 || ny > 253) {
    const seoul = latLngToGrid(SEOUL.lat, SEOUL.lng);
    nx = seoul.nx;
    ny = seoul.ny;
  }
  const ncst = getNcstBase();

  const [observed, locationName] = await Promise.all([
    fetchKma("/getUltraSrtNcst", {
      base_date: ncst.baseDate,
      base_time: ncst.baseTime,
      nx: String(nx),
      ny: String(ny),
    }),
    reverseGeocode(coords.lat, coords.lng),
  ]);

  const observedMap = Object.fromEntries(
    observed.map((item) => [item.category, item.obsrValue ?? ""]),
  );

  let sky = "";
  try {
    const fcst = getFcstBase();
    const forecast = await fetchKma("/getUltraSrtFcst", {
      base_date: fcst.baseDate,
      base_time: fcst.baseTime,
      nx: String(nx),
      ny: String(ny),
    });
    const firstSky = forecast
      .filter((item) => item.category === "SKY")
      .sort((a, b) =>
        `${a.fcstDate}${a.fcstTime}`.localeCompare(`${b.fcstDate}${b.fcstTime}`),
      )[0];
    sky = firstSky?.fcstValue ?? "";
  } catch {
    sky = "";
  }

  return {
    weather: weatherLabel(observedMap.PTY, sky),
    weather_temp: parseNumber(observedMap.T1H),
    weather_humidity: parseNumber(observedMap.REH),
    location:
      locationName || (coords.fallback ? "서울특별시" : "현재 위치"),
    fallback: coords.fallback,
  };
}

export function formatWeatherLine(snapshot: {
  weather?: string | null;
  weather_temp?: number | null;
  weather_humidity?: number | null;
}) {
  const parts: string[] = [];
  if (snapshot.weather) parts.push(snapshot.weather);
  if (snapshot.weather_temp != null) {
    parts.push(`${Number(snapshot.weather_temp)}℃`);
  }
  if (snapshot.weather_humidity != null) {
    parts.push(`습도 ${Number(snapshot.weather_humidity)}%`);
  }
  return parts.join(" · ");
}

export function weatherVisual(
  weather?: string | null,
  temp?: number | null,
  humidity?: number | null,
): {
  shape: "sun" | "raindrop" | "cloud" | "snow" | "storm" | "mist" | "orb";
  capsule_color: string;
  capsule_color_alt: string;
} {
  const label = weather ?? "";
  const shape = label.includes("눈")
    ? "snow"
    : label.includes("소나기") || label.includes("폭풍")
      ? "storm"
      : label.includes("비") || label.includes("빗방울")
        ? "raindrop"
        : label.includes("흐림") || label.includes("구름")
          ? "cloud"
          : (humidity ?? 0) >= 85
            ? "mist"
            : label.includes("맑") && (temp ?? 0) >= 28
              ? "sun"
              : label.includes("맑")
                ? "orb"
                : "orb";

  const colors =
    shape === "sun"
      ? { capsule_color: "#f59e0b", capsule_color_alt: "#fde68a" }
      : shape === "raindrop"
        ? { capsule_color: "#0284c7", capsule_color_alt: "#7dd3fc" }
        : shape === "cloud"
          ? { capsule_color: "#64748b", capsule_color_alt: "#cbd5e1" }
          : shape === "snow"
            ? { capsule_color: "#e2e8f0", capsule_color_alt: "#38bdf8" }
            : shape === "storm"
              ? { capsule_color: "#1e3a5f", capsule_color_alt: "#38bdf8" }
              : shape === "mist"
                ? { capsule_color: "#94a3b8", capsule_color_alt: "#e2e8f0" }
                : { capsule_color: "#38bdf8", capsule_color_alt: "#0ea5e9" };

  return { shape, ...colors };
}
