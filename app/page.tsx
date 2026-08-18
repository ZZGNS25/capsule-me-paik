"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  type User,
} from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase";
import AppHeader from "@/components/AppHeader";
import CapsuleDashboard from "@/components/CapsuleDashboard";
import GoogleLoginButton from "@/components/GoogleLoginButton";
import NowWeather from "@/components/NowWeather";
import PageShell from "@/components/PageShell";

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return onAuthStateChanged(getFirebaseAuth(), (nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });
  }, []);

  async function handleGoogleLogin() {
    setError(null);
    setBusy(true);
    try {
      await signInWithPopup(getFirebaseAuth(), new GoogleAuthProvider());
    } catch (err) {
      setError(err instanceof Error ? err.message : "로그인에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <PageShell centered>
        <p className="mono-readout text-sm text-slate-500">INITIALIZING…</p>
      </PageShell>
    );
  }

  if (!user) {
    return (
      <PageShell centered>
        <main className="steel-panel-glow w-full max-w-md px-10 py-14 text-center">
          <div className="countdown-cell mx-auto flex h-14 w-14 items-center justify-center">
            <span className="mono-readout countdown-digit text-lg font-semibold">
              CM
            </span>
          </div>
          <p className="label-caps mt-6">Time Capsule Protocol</p>
          <h1 className="etched mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
            캡슐 미
          </h1>
          <hr className="steel-rule mx-auto mt-6 w-24" />
          <p className="mt-5 text-base leading-relaxed text-slate-400">
            사진과 편지를 봉인하고,
            <br />
            정해진 날에 함께 열어요.
          </p>
          <div className="mt-10">
            <GoogleLoginButton onClick={handleGoogleLogin} busy={busy} />
          </div>
          {error ? <p className="alert-error mt-4 text-left">{error}</p> : null}
        </main>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <main className="mx-auto w-full max-w-3xl">
        <AppHeader />
        <NowWeather className="mt-6" />
        <p className="mt-6 max-w-xl text-base leading-relaxed text-slate-400">
          사진과 편지를 묻고, 열람일에 함께 열어요. 아래에서 캡슐 상태와
          카운트다운을 확인하세요. 내가 묻은 것만 보려면{" "}
          <Link href="/mine" className="glow-text underline underline-offset-2">
            내 캡슐
          </Link>
          로 이동하세요.
        </p>
        <CapsuleDashboard />
      </main>
    </PageShell>
  );
}
