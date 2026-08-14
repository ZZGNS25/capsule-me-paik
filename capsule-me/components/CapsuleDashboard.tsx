"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { onAuthStateChanged, type User } from "firebase/auth";
import {
  formatOpenDate,
  getCapsulePhotoUrls,
  isCapsuleOpen,
  type Capsule,
} from "@/lib/capsule";
import { auth } from "@/lib/firebase";
import { supabase } from "@/lib/supabase";
import Countdown from "@/components/Countdown";
import {
  OpenMessageBanner,
  requestNotificationPermission,
  useCapsuleOpenAlert,
} from "@/components/OpenMessage";

type Filter = "all" | "locked" | "open";

type CapsuleDashboardProps = {
  mode?: "all" | "mine";
};

export default function CapsuleDashboard({
  mode = "all",
}: CapsuleDashboardProps) {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [capsules, setCapsules] = useState<Capsule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [now, setNow] = useState(() => Date.now());
  const [notifyReady, setNotifyReady] = useState(false);
  const { message, dismiss } = useCapsuleOpenAlert({
    capsules,
    enabled: !loading && capsules.length > 0,
  });

  useEffect(() => {
    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setAuthReady(true);
    });
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (notifyReady || capsules.length === 0) return;
    void requestNotificationPermission().finally(() => setNotifyReady(true));
  }, [capsules.length, notifyReady]);

  useEffect(() => {
    if (!authReady) return;
    if (mode === "mine" && !user) {
      setCapsules([]);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;

    async function loadCapsules() {
      setLoading(true);
      setError(null);

      let query = supabase
        .from("capsules")
        .select(
          "id, owner_uid, title, recipient, letter, open_at, created_at, photo_paths",
        )
        .order("created_at", { ascending: false });

      if (mode === "mine" && user) {
        query = query.eq("owner_uid", user.uid);
      }

      const { data, error: fetchError } = await query;

      if (cancelled) return;

      if (fetchError) {
        setError(fetchError.message);
        setCapsules([]);
      } else {
        setCapsules((data ?? []) as Capsule[]);
      }

      setLoading(false);
    }

    void loadCapsules();

    return () => {
      cancelled = true;
    };
  }, [authReady, mode, user]);

  const counts = useMemo(() => {
    const open = capsules.filter((capsule) =>
      isCapsuleOpen(capsule.open_at, now),
    ).length;
    return {
      total: capsules.length,
      open,
      locked: capsules.length - open,
    };
  }, [capsules, now]);

  const visibleCapsules = useMemo(() => {
    return capsules.filter((capsule) => {
      const opened = isCapsuleOpen(capsule.open_at, now);
      if (filter === "open") return opened;
      if (filter === "locked") return !opened;
      return true;
    });
  }, [capsules, filter, now]);

  const title = mode === "mine" ? "내가 묻은 캡슐" : "캡슐 보드";
  const description =
    mode === "mine"
      ? "내가 남긴 캡슐만 모아서 보고, 열람까지 남은 시간을 확인하세요."
      : "묻어 둔 캡슐의 열람까지 남은 시간을 한눈에 확인하세요.";

  return (
    <section className="mt-10">
      <OpenMessageBanner message={message} onClose={dismiss} />

      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-slate-800">
            {title}
          </h2>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>

        <div className="flex gap-2">
          {(
            [
              ["all", `전체 ${counts.total}`],
              ["locked", `잠김 ${counts.locked}`],
              ["open", `열림 ${counts.open}`],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={`rounded-full px-3.5 py-1.5 text-sm transition ${
                filter === value
                  ? "bg-slate-800 text-white"
                  : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {mode === "mine" && authReady && !user ? (
        <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white/70 px-6 py-12 text-center">
          <p className="text-base font-medium text-slate-700">
            로그인하면 내가 묻은 캡슐을 볼 수 있어요
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Google로 로그인한 뒤 다시 이 페이지를 열어 주세요.
          </p>
          <Link
            href="/"
            className="mt-6 inline-block rounded-xl bg-slate-800 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-700"
          >
            홈에서 로그인하기
          </Link>
        </div>
      ) : null}

      {loading ? (
        <p className="mt-10 text-sm text-slate-400">캡슐을 불러오는 중…</p>
      ) : null}

      {error ? (
        <div className="mt-8 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {!loading &&
      !error &&
      !(mode === "mine" && !user) &&
      visibleCapsules.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white/70 px-6 py-12 text-center">
          <p className="text-base font-medium text-slate-700">
            {mode === "mine"
              ? "아직 내가 묻은 캡슐이 없어요"
              : "아직 보여 줄 캡슐이 없어요"}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            첫 번째 캡슐을 묻으면 이곳에 목록이 나타납니다.
          </p>
          <Link
            href="/new"
            className="mt-6 inline-block rounded-xl bg-slate-800 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-700"
          >
            캡슐 묻으러 가기
          </Link>
        </div>
      ) : null}

      <div className="mt-8 grid gap-4">
        {visibleCapsules.map((capsule) => {
          const opened = isCapsuleOpen(capsule.open_at, now);
          const photos = getCapsulePhotoUrls(capsule.photo_paths);
          const cover = photos[0];
          const name = capsule.recipient || capsule.title || "이름 없는 캡슐";

          return (
            <Link
              key={capsule.id}
              href={`/capsule/${capsule.id}`}
              className="group flex gap-4 rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-sm backdrop-blur-sm transition hover:border-slate-300 hover:bg-white"
            >
              <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                {cover ? (
                  <img
                    src={cover}
                    alt=""
                    className={`h-full w-full object-cover transition ${
                      opened ? "" : "scale-105 blur-[2px] brightness-90"
                    }`}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-slate-400">
                    No photo
                  </div>
                )}
                {!opened ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-900/25 text-xs font-medium text-white">
                    LOCKED
                  </div>
                ) : null}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="truncate text-base font-semibold text-slate-800">
                    {name}
                  </h3>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      opened
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {opened ? "열람 가능" : "봉인 중"}
                  </span>
                </div>

                <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-slate-500">
                  {opened
                    ? capsule.letter || "편지가 비어 있어요."
                    : "열람일 전까지 편지는 비밀로 남겨 둡니다."}
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                  <Countdown
                    openAt={capsule.open_at}
                    className="font-medium"
                  />
                  <span className="text-slate-300">·</span>
                  <span className="text-slate-400">
                    열람일 {formatOpenDate(capsule.open_at)}
                  </span>
                  <span className="text-slate-300">·</span>
                  <span className="text-slate-400">
                    사진 {photos.length}장
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
