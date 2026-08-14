"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  type User,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import AppHeader from "@/components/AppHeader";
import CapsuleDashboard from "@/components/CapsuleDashboard";

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });
  }, []);

  async function handleGoogleLogin() {
    setError(null);
    setBusy(true);
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (err) {
      setError(err instanceof Error ? err.message : "로그인에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-full flex-1 items-center justify-center bg-gradient-to-b from-slate-100 via-sky-50 to-stone-100 px-6 py-16">
        <p className="text-sm text-slate-400">불러오는 중…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-full flex-1 items-center justify-center bg-gradient-to-b from-slate-100 via-sky-50 to-stone-100 px-6 py-16">
        <main className="w-full max-w-md rounded-2xl border border-slate-200/80 bg-white/80 px-10 py-14 text-center shadow-sm backdrop-blur-sm">
          <p className="text-xs tracking-[0.22em] text-slate-400">CAPSULE ME</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-800 sm:text-5xl">
            캡슐 미
          </h1>
          <p className="mt-5 text-base leading-relaxed text-slate-500">
            사진과 편지를 묻고, 열람일에 함께 열어요
          </p>
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={busy}
            className="mt-10 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
          >
            {busy ? "로그인 중…" : "Google로 로그인"}
          </button>
          {error ? <p className="mt-4 text-sm text-rose-600">{error}</p> : null}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-full flex-1 bg-gradient-to-b from-slate-100 via-sky-50 to-stone-100 px-6 py-10">
      <main className="mx-auto w-full max-w-3xl">
        <AppHeader />
        <p className="mt-6 max-w-xl text-base leading-relaxed text-slate-500">
          사진과 편지를 묻고, 열람일에 함께 열어요. 아래에 올라온 캡슐들의
          카운트다운을 확인해 보세요. 내가 묻은 것만 보려면{" "}
          <Link
            href="/mine"
            className="underline underline-offset-2 hover:text-slate-700"
          >
            내 캡슐
          </Link>
          로 이동하세요.
        </p>
        <CapsuleDashboard />
      </main>
    </div>
  );
}
