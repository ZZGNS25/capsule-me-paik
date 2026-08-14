"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase";

export default function HomeAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(getFirebaseAuth(), (nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  async function handleGoogleLogin() {
    setError(null);
    setBusy(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(getFirebaseAuth(), provider);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "로그인에 실패했습니다.";
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  async function handleLogout() {
    setError(null);
    setBusy(true);
    try {
      await signOut(getFirebaseAuth());
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "로그아웃에 실패했습니다.";
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <p className="mt-10 text-sm text-slate-400">로그인 상태 확인 중…</p>
    );
  }

  if (user) {
    return (
      <div className="mt-10 flex w-full flex-col items-center gap-4">
        <p className="text-sm text-slate-600">
          {user.displayName ?? user.email}님, 환영해요
        </p>
        <Link
          href="/new"
          className="inline-block rounded-xl bg-slate-800 px-6 py-3 text-sm font-medium text-white transition hover:bg-slate-700"
        >
          캡슐 묻으러 가기
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          disabled={busy}
          className="text-sm text-slate-500 underline-offset-2 transition hover:text-slate-700 hover:underline disabled:opacity-50"
        >
          로그아웃
        </button>
        {error ? <p className="text-sm text-red-500">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className="mt-10 flex w-full flex-col items-center gap-3">
      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={busy}
        className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
      >
        <GoogleIcon />
        {busy ? "로그인 중…" : "Google로 로그인"}
      </button>
      {error ? <p className="text-sm text-red-500">{error}</p> : null}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}
