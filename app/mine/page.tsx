import { createPageMetadata } from "@/lib/site";
import AppHeader from "@/components/AppHeader";
import CapsuleDashboard from "@/components/CapsuleDashboard";
import PageShell from "@/components/PageShell";

export const metadata = createPageMetadata({
  title: "내 캡슐",
  description: "내가 묻어 둔 타임캡슐 목록과 열람일까지 남은 시간.",
  path: "/mine",
  noIndex: true,
});

export default function MyCapsulesPage() {
  return (
    <PageShell>
      <main className="mx-auto w-full max-w-3xl">
        <AppHeader />
        <p className="mt-6 max-w-xl text-base leading-relaxed text-slate-400">
          지금까지 내가 묻어 둔 캡슐을 목록으로 확인하고, 열람일까지 남은
          시간을 살펴보세요.
        </p>
        <CapsuleDashboard mode="mine" />
      </main>
    </PageShell>
  );
}
