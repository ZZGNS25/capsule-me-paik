import AppHeader from "@/components/AppHeader";
import CapsuleDashboard from "@/components/CapsuleDashboard";
import PageShell from "@/components/PageShell";

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
