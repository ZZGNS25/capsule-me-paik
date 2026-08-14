"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function AppHeader() {
  const router = useRouter();
  const pathname = usePathname();
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
      if (pathname !== "/") {
        router.replace("/");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "로그인에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function handleLogout() {
    setError(null);
    setBusy(true);
    try {
      await signOut(auth);
      window.location.assign("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "로그아웃에 실패했습니다.");
      setBusy(false);
    }
  }

  return (
    <header className="flex flex-wrap items-center justify-between gap-4">
      <Link href="/" className="text-left">
        <p className="text-xs tracking-[0.22em] text-slate-400">CAPSULE ME</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-800">
          캡슐 미
        </h1>
      </Link>

      <div className="flex flex-wrap items-center gap-3">
        {user ? (
          <>
            <Link
              href="/mine"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              내 캡슐
            </Link>
            <Link
              href="/new"
              className="rounded-xl bg-slate-800 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-700"
            >
              캡슐 묻기
            </Link>
          </>
        ) : null}

        {loading ? (
          <span className="text-sm text-slate-400">확인 중…</span>
        ) : user ? (
          <>
            <span className="max-w-[10rem] truncate text-sm text-slate-600">
              {user.displayName ?? user.email}
            </span>
            <button
              type="button"
              onClick={handleLogout}
              disabled={busy}
              className="text-sm text-slate-500 underline-offset-2 transition hover:text-slate-700 hover:underline disabled:opacity-50"
            >
              로그아웃
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={busy}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 transition hover:bg-slate-50 disabled:opacity-50"
          >
            {busy ? "로그인 중…" : "Google 로그인"}
          </button>
        )}
      </div>

      {error ? (
        <p className="w-full text-sm text-rose-600">{error}</p>
      ) : null}
    </header>
  );
}
