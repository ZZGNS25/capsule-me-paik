import { createPageMetadata } from "@/lib/site";

export const metadata = createPageMetadata({
  title: "타임캡슐",
  description: "봉인된 타임캡슐을 열람일까지 안전하게 보관합니다.",
  path: "/capsule",
  noIndex: true,
});

export default function CapsuleLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
