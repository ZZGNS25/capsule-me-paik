import AppHeader from "@/components/AppHeader";
import CapsuleDashboard from "@/components/CapsuleDashboard";

export default function MyCapsulesPage() {
  return (
    <div className="min-h-full flex-1 bg-gradient-to-b from-slate-100 via-sky-50 to-stone-100 px-6 py-10">
      <main className="mx-auto w-full max-w-3xl">
        <AppHeader />
        <p className="mt-6 max-w-xl text-base leading-relaxed text-slate-500">
          지금까지 내가 묻어 둔 캡슐을 목록으로 확인하고, 열람일까지 남은
          시간을 살펴보세요.
        </p>
        <CapsuleDashboard mode="mine" />
      </main>
    </div>
  );
}
