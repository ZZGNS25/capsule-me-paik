export const CAPSULE_SHAPES = [
  "sun",
  "raindrop",
  "cloud",
  "snow",
  "storm",
  "mist",
  "orb",
] as const;

export type CapsuleShape = (typeof CAPSULE_SHAPES)[number];

export type CapsuleStyle = {
  daily_quote: string;
  keywords: string[];
  capsule_shape: CapsuleShape;
  capsule_color: string;
  capsule_color_alt: string;
};

const STYLE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "daily_quote",
    "keywords",
    "capsule_shape",
    "capsule_color",
    "capsule_color_alt",
  ],
  properties: {
    daily_quote: {
      type: "string",
      description:
        "그날의 날씨·기온·습도를 담은 한국어 한 문장. 40자 이내. 편지 내용을 직접 인용하지 말 것.",
    },
    keywords: {
      type: "array",
      minItems: 3,
      maxItems: 5,
      items: { type: "string" },
      description:
        "편지를 읽지 않고도 분위기를 짐작할 수 있는 한국어 키워드 3~5개. 문장 금지, 고유명사·직접 인용 금지.",
    },
    capsule_shape: {
      type: "string",
      enum: [...CAPSULE_SHAPES],
      description: "날씨에 맞는 캡슐 형태",
    },
    capsule_color: {
      type: "string",
      description: "메인 색상 hex, 예: #38bdf8",
    },
    capsule_color_alt: {
      type: "string",
      description: "보조 그라데이션 hex",
    },
  },
};

function isShape(value: unknown): value is CapsuleShape {
  return (
    typeof value === "string" &&
    (CAPSULE_SHAPES as readonly string[]).includes(value)
  );
}

function isHex(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9A-Fa-f]{6}$/.test(value);
}

function weatherShape(
  weather: string | null,
  temp: number | null,
  humidity: number | null,
): CapsuleShape {
  const label = weather ?? "";
  if (label.includes("눈")) return "snow";
  if (label.includes("소나기") || label.includes("폭풍")) return "storm";
  if (label.includes("비") || label.includes("빗방울")) return "raindrop";
  if (label.includes("흐림") || label.includes("구름")) return "cloud";
  if ((humidity ?? 0) >= 85) return "mist";
  if (label.includes("맑") && (temp ?? 0) >= 28) return "sun";
  if (label.includes("맑")) return "orb";
  return "orb";
}

function weatherColors(shape: CapsuleShape): Pick<
  CapsuleStyle,
  "capsule_color" | "capsule_color_alt"
> {
  switch (shape) {
    case "sun":
      return { capsule_color: "#f59e0b", capsule_color_alt: "#fde68a" };
    case "raindrop":
      return { capsule_color: "#0284c7", capsule_color_alt: "#7dd3fc" };
    case "cloud":
      return { capsule_color: "#64748b", capsule_color_alt: "#cbd5e1" };
    case "snow":
      return { capsule_color: "#e2e8f0", capsule_color_alt: "#38bdf8" };
    case "storm":
      return { capsule_color: "#1e3a5f", capsule_color_alt: "#38bdf8" };
    case "mist":
      return { capsule_color: "#94a3b8", capsule_color_alt: "#e2e8f0" };
    default:
      return { capsule_color: "#38bdf8", capsule_color_alt: "#0ea5e9" };
  }
}

export function fallbackCapsuleStyle(input: {
  weather: string | null;
  weather_temp: number | null;
  weather_humidity: number | null;
}): CapsuleStyle {
  const shape = weatherShape(
    input.weather,
    input.weather_temp,
    input.weather_humidity,
  );
  const colors = weatherColors(shape);
  const weather = input.weather || "그날";
  const temp =
    input.weather_temp != null ? `${input.weather_temp}℃` : "알 수 없는 기온";
  const humidity =
    input.weather_humidity != null
      ? `습도 ${input.weather_humidity}%`
      : "습도 미상";

  return {
    daily_quote: `${weather} 아래 ${temp}, ${humidity}의 공기를 봉인했다.`,
    keywords: [weather, temp, humidity].filter(Boolean),
    capsule_shape: shape,
    ...colors,
  };
}

function extractOutputText(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const data = payload as {
    output_text?: string;
    steps?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
  };
  if (typeof data.output_text === "string" && data.output_text.trim()) {
    return data.output_text;
  }
  const texts =
    data.steps?.flatMap((step) =>
      (step.content ?? [])
        .filter((item) => item.type === "text" && item.text)
        .map((item) => item.text as string),
    ) ?? [];
  return texts.join("\n").trim();
}

function normalizeStyle(raw: unknown, fallback: CapsuleStyle): CapsuleStyle {
  if (!raw || typeof raw !== "object") return fallback;
  const value = raw as Partial<CapsuleStyle>;
  const keywords = Array.isArray(value.keywords)
    ? value.keywords
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 5)
    : fallback.keywords;

  return {
    daily_quote:
      typeof value.daily_quote === "string" && value.daily_quote.trim()
        ? value.daily_quote.trim().slice(0, 80)
        : fallback.daily_quote,
    keywords: keywords.length > 0 ? keywords : fallback.keywords,
    capsule_shape: isShape(value.capsule_shape)
      ? value.capsule_shape
      : fallback.capsule_shape,
    capsule_color: isHex(value.capsule_color)
      ? value.capsule_color
      : fallback.capsule_color,
    capsule_color_alt: isHex(value.capsule_color_alt)
      ? value.capsule_color_alt
      : fallback.capsule_color_alt,
  };
}

async function createInteraction(model: string, prompt: string, apiKey: string) {
  const response = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/interactions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
        "Api-Revision": "2026-05-20",
      },
      body: JSON.stringify({
        model,
        input: prompt,
        response_format: {
          type: "text",
          mime_type: "application/json",
          schema: STYLE_SCHEMA,
        },
      }),
    },
  );

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      (payload as { error?: { message?: string } } | null)?.error?.message ||
      `Gemini API 오류 (${response.status})`;
    throw new Error(message);
  }
  return payload;
}

export async function generateCapsuleStyle(input: {
  weather: string | null;
  weather_temp: number | null;
  weather_humidity: number | null;
  recipient?: string;
  letter?: string;
}): Promise<CapsuleStyle> {
  const fallback = fallbackCapsuleStyle(input);
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return fallback;

  const prompt = [
    "타임캡슐을 봉인하는 순간의 분위기 데이터를 JSON으로 만들어라.",
    "편지 본문을 절대 그대로 반복하거나 요약 문장으로 누설하지 마라.",
    "키워드는 감정·장면·계절의 힌트만 남긴다.",
    `날씨: ${input.weather ?? "알 수 없음"}`,
    `기온: ${input.weather_temp ?? "알 수 없음"}℃`,
    `습도: ${input.weather_humidity ?? "알 수 없음"}%`,
    `받는 사람: ${input.recipient || "없음"}`,
    `편지(키워드 힌트용): ${input.letter?.slice(0, 1200) || "없음"}`,
  ].join("\n");

  const models = ["gemini-3.7-flash", "gemini-3.5-flash"];
  let lastError: unknown;

  for (const model of models) {
    try {
      const payload = await createInteraction(model, prompt, apiKey);
      const text = extractOutputText(payload);
      if (!text) continue;
      return normalizeStyle(JSON.parse(text), fallback);
    } catch (error) {
      lastError = error;
    }
  }

  console.error(lastError);
  return fallback;
}
