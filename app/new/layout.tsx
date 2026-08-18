import { createPageMetadata } from "@/lib/site";

export const metadata = createPageMetadata({
  title: "캡슐 묻기",
  description:
    "편지와 사진을 봉인하고, 묻는 순간의 날씨로 캡슐의 색과 형태를 정해 열람일에 열어보세요.",
  path: "/new",
});

export default function NewCapsuleLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
