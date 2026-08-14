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
import { getFirebaseAuth } from "@/lib/firebase";
import GoogleLoginButton from "@/components/GoogleLoginButton";

const NAV_ITEMS = [
  { href: "/", label: "보드" },
  { href: "/mine", label: "내 캡슐" },
  { href: "/new", label: "묻기" },
] as const;

export default function AppHeader() {
  const router = useRouter();
  const pathname = usePathname();
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
      await signOut(getFirebaseAuth());
      window.location.assign("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "로그아웃에 실패했습니다.");
      setBusy(false);
    }
  }

  return (
    <header className="flex flex-col gap-4">
      <div className="steel-panel flex flex-wrap items-center justify-between gap-4 px-5 py-4">
        <Link href="/" className="flex items-center gap-3 text-left">
          <div className="countdown-cell flex h-10 w-10 items-center justify-center">
            <span className="mono-readout countdown-digit text-xs font-semibold">
              CM
            </span>
          </div>
          <div>
            <p className="label-caps">Capsule Me</p>
            <h1 className="etched text-xl font-semibold tracking-tight">
              캡슐 미
            </h1>
          </div>
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          {user ? (
            <>
              {NAV_ITEMS.map(({ href, label }) => {
                const active =
                  href === "/" ? pathname === "/" : pathname.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`nav-link ${active ? "nav-link-active" : ""}`}
                  >
                    {label}
                  </Link>
                );
              })}
              <Link href="/new" className="btn-primary ml-1 px-4 py-2 text-sm">
                캡슐 묻기
              </Link>
            </>
          ) : null}

          {loading ? (
            <span className="mono-readout px-2 text-xs text-slate-500">
              CHECKING…
            </span>
          ) : user ? (
            <div className="ml-1 flex items-center gap-3 border-l border-black/50 pl-3">
              <span className="max-w-[10rem] truncate text-sm text-slate-400">
                {user.displayName ?? user.email}
              </span>
              <button
                type="button"
                onClick={handleLogout}
                disabled={busy}
                className="btn-ghost disabled:opacity-50"
              >
                로그아웃
              </button>
            </div>
          ) : (
            <GoogleLoginButton onClick={handleGoogleLogin} busy={busy} />
          )}
        </div>
      </div>

      {error ? <p className="alert-error">{error}</p> : null}
    </header>
  );
}
