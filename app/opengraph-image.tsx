import { createOgImage, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og-image";

export const alt = "캡슐 미 — 사진과 편지를 봉인하고 열람일에 함께 열어요";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function OpenGraphImage() {
  return createOgImage({
    kicker: "TIME CAPSULE",
    title: "캡슐 미",
    subtitle: "사진과 편지를 봉인하고 열람일에 함께 열어요",
  });
}
