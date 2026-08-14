"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  formatOpenDate,
  getCapsulePhotoUrls,
  getCountdownParts,
  isCapsuleOpen,
  type Capsule,
} from "@/lib/capsule";
import { getSupabase } from "@/lib/supabase";
import Countdown from "@/components/Countdown";
import AppHeader from "@/components/AppHeader";
import {
  OpenMessageBanner,
  requestNotificationPermission,
} from "@/components/OpenMessage";

const isDev = process.env.NODE_ENV === "development";

export default function CapsulePage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [capsule, setCapsule] = useState<Capsule | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [forcePreview, setForcePreview] = useState(false);
  const [openMessage, setOpenMessage] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const wasOpenRef = useRef<boolean | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    void requestNotificationPermission();
  }, []);

  useEffect(() => {
    wasOpenRef.current = null;
  }, [id]);

  useEffect(() => {
    if (!capsule) return;

    const opened = isCapsuleOpen(capsule.open_at, now);
    if (wasOpenRef.current === false && opened) {
      const nextName = capsule.recipient || capsule.title || "이름 없는 캡슐";
      setOpenMessage({ id: capsule.id, name: nextName });

      if (
        typeof window !== "undefined" &&
        "Notification" in window &&
        Notification.permission === "granted"
      ) {
        new Notification("캡슐이 열렸어요", {
          body: `${nextName}에게 남긴 이야기를 지금 열어볼 수 있어요.`,
          tag: `capsule-open-${capsule.id}`,
        });
      }
    }
    wasOpenRef.current = opened;
  }, [capsule, now]);

  useEffect(() => {
    let cancelled = false;

    async function loadCapsule() {
      setLoading(true);
      setError(null);
      setForcePreview(false);

      const { data, error: fetchError } = await getSupabase()
        .from("capsules")
        .select(
          "id, owner_uid, title, recipient, letter, open_at, created_at, photo_paths",
        )
        .eq("id", id)
        .maybeSingle();

      if (cancelled) return;

      if (fetchError) {
        setError(fetchError.message);
        setCapsule(null);
      } else if (!data) {
        setError("캡슐을 찾을 수 없어요.");
        setCapsule(null);
      } else {
        setCapsule(data as Capsule);
      }

      setLoading(false);
    }

    if (id) {
      void loadCapsule();
    }

    return () => {
      cancelled = true;
    };
  }, [id]);

  const naturallyOpen = capsule ? isCapsuleOpen(capsule.open_at, now) : false;
  const opened = naturallyOpen || forcePreview;
  const photos = capsule ? getCapsulePhotoUrls(capsule.photo_paths) : [];
  const name = capsule?.recipient || capsule?.title || "이름 없는 캡슐";
  const parts = capsule ? getCountdownParts(capsule.open_at, now) : null;

  return (
    <div className="min-h-full flex-1 bg-gradient-to-b from-slate-100 via-sky-50 to-stone-100 px-6 py-10">
      <OpenMessageBanner
        message={openMessage}
        onClose={() => setOpenMessage(null)}
      />
      <main className="mx-auto w-full max-w-3xl">
        <AppHeader />

        {loading ? (
          <p className="mt-16 text-center text-sm text-slate-400">
            캡슐을 여는 중…
          </p>
        ) : null}

        {error ? (
          <div className="mt-16 rounded-3xl border border-rose-200 bg-rose-50 px-6 py-10 text-center">
            <p className="text-rose-700">{error}</p>
            <Link
              href="/"
              className="mt-6 inline-block text-sm text-slate-600 underline underline-offset-2"
            >
              보드로 돌아가기
            </Link>
          </div>
        ) : null}

        {!loading && !error && capsule && parts ? (
          <section className="mt-10 overflow-hidden rounded-3xl border border-slate-200/80 bg-white/90 shadow-sm backdrop-blur-sm">
            <div className="relative overflow-hidden border-b border-slate-100 px-8 py-10">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(148,163,184,0.18),transparent_45%)]" />
              <div className="relative">
                <p className="text-xs tracking-[0.22em] text-slate-400">
                  TIME CAPSULE
                </p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-800 sm:text-4xl">
                  {name}에게
                </h2>
                <div className="mt-5 flex flex-wrap items-center gap-3 text-sm">
                  <span
                    className={`rounded-full px-3 py-1 font-medium ${
                      naturallyOpen
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {naturallyOpen ? "열람 가능" : "아직 기간이 남았어요"}
                  </span>
                  {forcePreview && !naturallyOpen ? (
                    <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                      개발 미리보기
                    </span>
                  ) : null}
                </div>
                <p className="mt-4 text-sm text-slate-500">
                  열람일 · {formatOpenDate(capsule.open_at)}
                </p>
              </div>
            </div>

            <div className="px-8 py-8">
              {opened ? (
                <div className="space-y-8">
                  {!naturallyOpen ? (
                    <div className="rounded-2xl border border-amber-200/80 bg-amber-50/70 px-4 py-3 text-sm text-amber-800">
                      개발 모드로 미리 보는 중이에요. 실제 열람일은 아직
                      지나지 않았습니다.
                    </div>
                  ) : null}

                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
                      Letter
                    </p>
                    <p className="mt-4 whitespace-pre-wrap text-base leading-8 text-slate-700">
                      {capsule.letter || "편지가 비어 있어요."}
                    </p>
                  </div>

                  {photos.length > 0 ? (
                    <div>
                      <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
                        Photos
                      </p>
                      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                        {photos.map((url, index) => (
                          <a
                            key={url}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="overflow-hidden rounded-2xl ring-1 ring-slate-200"
                          >
                            <img
                              src={url}
                              alt={`${name} 사진 ${index + 1}`}
                              className="aspect-square w-full object-cover transition hover:scale-[1.02]"
                            />
                          </a>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="rounded-3xl bg-gradient-to-b from-slate-50 to-stone-50 px-6 py-12 text-center">
                  <p className="text-sm tracking-[0.18em] text-slate-400">
                    SEALED
                  </p>
                  <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-800">
                    아직 기간이 남았어요
                  </h3>
                  <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-500">
                    열람일이 되기 전에는 편지와 사진을 열어볼 수 없어요.
                    남은 시간을 함께 기다려 주세요.
                  </p>

                  <div className="mx-auto mt-8 grid max-w-md grid-cols-4 gap-2">
                    {[
                      ["일", parts.days],
                      ["시간", parts.hours],
                      ["분", parts.minutes],
                      ["초", parts.seconds],
                    ].map(([label, value]) => (
                      <div
                        key={label}
                        className="rounded-2xl bg-white px-2 py-4 shadow-sm ring-1 ring-slate-200/80"
                      >
                        <p className="text-2xl font-semibold tabular-nums text-slate-800">
                          {String(value).padStart(2, "0")}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">{label}</p>
                      </div>
                    ))}
                  </div>

                  <p className="mt-6 text-sm font-medium text-slate-600">
                    <Countdown openAt={capsule.open_at} />
                  </p>

                  {photos[0] ? (
                    <div className="relative mx-auto mt-10 h-44 w-44 overflow-hidden rounded-[1.75rem]">
                      <img
                        src={photos[0]}
                        alt=""
                        className="h-full w-full object-cover blur-md brightness-90"
                      />
                      <div className="absolute inset-0 bg-slate-900/20" />
                    </div>
                  ) : null}

                  {isDev ? (
                    <button
                      type="button"
                      onClick={() => setForcePreview(true)}
                      className="mt-10 text-xs text-slate-300 transition hover:text-slate-500"
                    >
                      바로보기
                    </button>
                  ) : null}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 px-8 py-5">
              <Link
                href="/"
                className="text-sm text-slate-500 underline-offset-2 transition hover:text-slate-700 hover:underline"
              >
                ← 캡슐 보드로
              </Link>
              {forcePreview && !naturallyOpen ? (
                <button
                  type="button"
                  onClick={() => setForcePreview(false)}
                  className="text-xs text-slate-300 transition hover:text-slate-500"
                >
                  다시 봉인
                </button>
              ) : null}
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}
