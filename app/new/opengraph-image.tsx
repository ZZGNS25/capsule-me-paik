import { createOgImage, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og-image";

export const alt = "캡슐 묻기 — 지금 이 순간의 날씨와 함께 타임캡슐을 봉인해요";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function NewCapsuleOgImage() {
  return createOgImage({
    kicker: "SEAL PROTOCOL",
    title: "캡슐 묻기",
    subtitle: "지금 이 순간의 날씨와 함께 봉인해요",
  });
}
