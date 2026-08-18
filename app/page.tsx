"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  type User,
} from "firebase/auth";
import { peekCapsuleLoginIntent } from "@/lib/capsule";
import { getFirebaseAuth } from "@/lib/firebase";
import AppHeader from "@/components/AppHeader";
import CapsuleDashboard from "@/components/CapsuleDashboard";
import LandingScreen from "@/components/LandingScreen";
import NowWeather from "@/components/NowWeather";
import PageShell from "@/components/PageShell";

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(getFirebaseAuth(), (nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!user) return;
    if (peekCapsuleLoginIntent() !== "create") return;
    setRedirecting(true);
    router.replace("/new");
  }, [user, router]);

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

  if (loading || redirecting) {
    return (
      <PageShell centered>
        <p className="mono-readout text-sm text-slate-500">INITIALIZING…</p>
      </PageShell>
    );
  }

  if (!user) {
    return (
      <PageShell>
        <LandingScreen
          onGoogleLogin={() => void handleGoogleLogin()}
          busy={busy}
          error={error}
        />
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
