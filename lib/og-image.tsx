import { ImageResponse } from "next/og";

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

async function loadFont(weight: string, text: string) {
  const css = await fetch(
    `https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+KR:wght@${weight}&text=${encodeURIComponent(text)}`,
    { headers: { "User-Agent": "Mozilla/5.0" } },
  ).then((response) => response.text());

  const match = css.match(/src: url\((.+?)\) format\('(opentype|truetype|woff2)'\)/);
  if (!match?.[1]) {
    throw new Error("OG 폰트를 불러오지 못했습니다.");
  }

  return fetch(match[1]).then((response) => response.arrayBuffer());
}

export async function createOgImage({
  kicker,
  title,
  subtitle,
}: {
  kicker: string;
  title: string;
  subtitle: string;
}) {
  const fontText = `${kicker}${title}${subtitle}`;
  const [regular, semibold] = await Promise.all([
    loadFont("400", fontText),
    loadFont("600", fontText),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px",
          background:
            "linear-gradient(110deg, #12161b 0%, #1d242c 28%, #2a333d 46%, #1a2026 72%, #0f1318 100%)",
          color: "#e9eef3",
        }}
      >
        <div
          style={{
            display: "flex",
            width: 88,
            height: 88,
            borderRadius: 999,
            background:
              "radial-gradient(circle at 30% 25%, #7dd3fc 0%, #38bdf8 28%, #0369a1 70%, #0c4a6e 100%)",
            boxShadow: "0 0 48px rgba(56,189,248,0.45)",
          }}
        />
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 22,
              letterSpacing: "0.28em",
              color: "#7dd3fc",
              fontFamily: "IBM Plex Sans KR",
            }}
          >
            {kicker}
          </div>
          <div
            style={{
              marginTop: 18,
              fontSize: 84,
              lineHeight: 1.05,
              fontWeight: 600,
              fontFamily: "IBM Plex Sans KR",
            }}
          >
            {title}
          </div>
          <div
            style={{
              marginTop: 20,
              fontSize: 32,
              color: "#a7b2be",
              fontFamily: "IBM Plex Sans KR",
            }}
          >
            {subtitle}
          </div>
        </div>
      </div>
    ),
    {
      ...OG_SIZE,
      fonts: [
        { name: "IBM Plex Sans KR", data: regular, weight: 400, style: "normal" },
        { name: "IBM Plex Sans KR", data: semibold, weight: 600, style: "normal" },
      ],
    },
  );
}
