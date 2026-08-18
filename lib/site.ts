import type { Metadata, Viewport } from "next";

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://capsule-me-two.vercel.app";

export const SITE_NAME = "캡슐 미";
export const SITE_TITLE = "캡슐 미 — Time Capsule";
export const SITE_DESCRIPTION =
  "사진과 편지를 봉인하고, 묻는 날의 날씨와 함께 열람일에 열어보는 타임캡슐.";
export const SITE_KEYWORDS = [
  "타임캡슐",
  "캡슐 미",
  "편지",
  "사진",
  "추억",
  "날씨",
  "time capsule",
];

export function getSiteUrl(path = "/") {
  return new URL(path, SITE_URL).toString();
}

export function createPageMetadata({
  title,
  description,
  path,
  noIndex = false,
}: {
  title: string;
  description: string;
  path: string;
  noIndex?: boolean;
}): Metadata {
  const url = getSiteUrl(path);

  return {
    title,
    description,
    keywords: SITE_KEYWORDS,
    alternates: { canonical: path },
    robots: noIndex
      ? { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } }
      : { index: true, follow: true },
    openGraph: {
      type: "website",
      locale: "ko_KR",
      url,
      siteName: SITE_NAME,
      title: title.includes(SITE_NAME) ? title : `${title} — ${SITE_NAME}`,
      description,
    },
    twitter: {
      card: "summary_large_image",
      title: title.includes(SITE_NAME) ? title : `${title} — ${SITE_NAME}`,
      description,
    },
  };
}

export const rootViewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#171b20" },
    { color: "#171b20" },
  ],
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      name: SITE_NAME,
      alternateName: "Capsule Me",
      url: SITE_URL,
      inLanguage: "ko-KR",
      description: SITE_DESCRIPTION,
    },
    {
      "@type": "WebApplication",
      name: SITE_NAME,
      url: SITE_URL,
      applicationCategory: "LifestyleApplication",
      operatingSystem: "Web",
      inLanguage: "ko-KR",
      description: SITE_DESCRIPTION,
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "KRW",
      },
    },
  ],
};
