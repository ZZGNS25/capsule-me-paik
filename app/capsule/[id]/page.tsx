"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  CAPSULE_SELECT,
  formatOpenDate,
  getCapsulePhotoUrls,
  getCountdownParts,
  isCapsuleOpen,
  type Capsule,
} from "@/lib/capsule";
import { getSupabase } from "@/lib/supabase";
import Countdown from "@/components/Countdown";
import AppHeader from "@/components/AppHeader";
import PageShell from "@/components/PageShell";
import { OpenMessageBanner } from "@/components/OpenMessage";
import { weatherVisual } from "@/lib/weather";
import WeatherStamp from "@/components/WeatherStamp";
import WeatherCapsule from "@/components/WeatherCapsule";
import KeywordChips from "@/components/KeywordChips";

const isDev = process.env.NODE_ENV === "development";

export default function CapsulePage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [capsule, setCapsule] = useState<Capsule | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [forcePreview, setForcePreview] = useState(false);
  const [copied, setCopied] = useState(false);
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
        .select(CAPSULE_SELECT)
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

  async function copyShareLink() {
    const url = `${window.location.origin}/capsule/${id}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  const naturallyOpen = capsule ? isCapsuleOpen(capsule.open_at, now) : false;
  const opened = naturallyOpen || forcePreview;
  const photos = capsule ? getCapsulePhotoUrls(capsule.photo_paths) : [];
  const name = capsule?.recipient || capsule?.title || "이름 없는 캡슐";
  const parts = capsule ? getCountdownParts(capsule.open_at, now) : null;
  const visual = capsule
    ? weatherVisual(
        capsule.weather,
        capsule.weather_temp,
        capsule.weather_humidity,
      )
    : null;

  return (
    <PageShell>
      <OpenMessageBanner
        message={openMessage}
        onClose={() => setOpenMessage(null)}
      />
      <main className="mx-auto w-full max-w-3xl">
        <AppHeader />

        {loading ? (
          <div className="mt-16 space-y-4">
            <div className="steel-card h-48 animate-pulse" />
            <div className="steel-card h-32 animate-pulse" />
          </div>
        ) : null}

        {error ? (
          <div className="alert-error mt-16 text-center">
            <p>{error}</p>
            <Link href="/" className="btn-secondary mt-6 inline-flex">
              보드로 돌아가기
            </Link>
          </div>
        ) : null}

        {!loading && !error && capsule && parts ? (
          <section className="steel-panel-glow mt-10 overflow-hidden">
            <div className="relative overflow-hidden border-b border-black/60 px-8 py-10">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.28),transparent_55%)]" />
              <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start">
                {visual ? (
                  <WeatherCapsule
                    shape={capsule.capsule_shape || visual.shape}
                    color={capsule.capsule_color || visual.capsule_color}
                    colorAlt={
                      capsule.capsule_color_alt || visual.capsule_color_alt
                    }
                    sealed={!opened}
                    size="md"
                  />
                ) : null}
                <div className="min-w-0 flex-1">
                <p className="label-caps">Time Capsule</p>
                <h2 className="etched mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                  {name}에게
                </h2>
                <div className="mt-5 flex flex-wrap items-center gap-3 text-sm">
                  <span
                    className={
                      naturallyOpen ? "badge-open" : "badge-locked"
                    }
                  >
                    {naturallyOpen ? "열람 가능" : "아직 기간이 남았어요"}
                  </span>
                  {forcePreview && !naturallyOpen ? (
                    <span className="badge-dev">개발 미리보기</span>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => void copyShareLink()}
                    className="chip text-xs"
                  >
                    {copied ? "링크 복사됨" : "링크 복사"}
                  </button>
                </div>
                <p className="mono-readout mt-4 text-sm text-slate-400">
                  UNLOCK · {formatOpenDate(capsule.open_at)}
                </p>
                <WeatherStamp
                  weather={capsule.weather}
                  weather_temp={capsule.weather_temp}
                  weather_humidity={capsule.weather_humidity}
                  className="mt-2"
                />
                {capsule.daily_quote ? (
                  <p className="mt-3 text-sm leading-relaxed text-sky-100">
                    {capsule.daily_quote}
                  </p>
                ) : null}
                <KeywordChips keywords={capsule.keywords} className="mt-3" />
                </div>
              </div>
            </div>

            <div className="px-8 py-8">
              {opened ? (
                <div className="space-y-8">
                  {!naturallyOpen ? (
                    <div className="rounded-xl border border-amber-700/40 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                      개발 모드로 미리 보는 중이에요. 실제 열람일은 아직
                      지나지 않았습니다.
                    </div>
                  ) : null}

                  <div>
                    <p className="label-caps">Letter</p>
                    <hr className="steel-rule mt-3" />
                    <p className="mt-4 whitespace-pre-wrap text-base leading-8 text-slate-300">
                      {capsule.letter || "편지가 비어 있어요."}
                    </p>
                  </div>

                  {photos.length > 0 ? (
                    <div>
                      <p className="label-caps">Photos</p>
                      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                        {photos.map((url, index) => (
                          <a
                            key={url}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="photo-frame overflow-hidden"
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
                <div className="steel-card px-6 py-12 text-center">
                  <div className="mx-auto flex items-center justify-center gap-2">
                    <span className="status-lamp status-lamp-locked" />
                    <p className="label-caps">Sealed</p>
                  </div>
                  <h3 className="etched mt-3 text-2xl font-semibold tracking-tight">
                    아직 기간이 남았어요
                  </h3>
                  <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-400">
                    열람일이 되기 전에는 편지와 사진을 열어볼 수 없어요.
                    키워드만 보고 그날의 공기를 떠올려 보세요.
                  </p>
                  <KeywordChips
                    keywords={capsule.keywords}
                    className="mt-5 justify-center"
                  />

                  <div className="mx-auto mt-8 grid max-w-md grid-cols-4 gap-2">
                    {(
                      [
                        ["일", parts.days],
                        ["시간", parts.hours],
                        ["분", parts.minutes],
                        ["초", parts.seconds],
                      ] as const
                    ).map(([label, value]) => (
                      <div key={label} className="countdown-cell px-2 py-4">
                        <p className="mono-readout countdown-digit text-2xl font-semibold">
                          {String(value).padStart(2, "0")}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">{label}</p>
                      </div>
                    ))}
                  </div>

                  <p className="mt-6 text-sm font-medium">
                    <Countdown openAt={capsule.open_at} />
                  </p>

                  {photos[0] ? (
                    <div className="photo-frame relative mx-auto mt-10 h-44 w-44 overflow-hidden">
                      <img
                        src={photos[0]}
                        alt=""
                        className="h-full w-full object-cover blur-md brightness-90"
                      />
                      <div className="absolute inset-0 bg-slate-950/45" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="mono-readout text-xs tracking-widest text-sky-200">
                          LOCKED
                        </span>
                      </div>
                    </div>
                  ) : null}

                  {isDev ? (
                    <button
                      type="button"
                      onClick={() => setForcePreview(true)}
                      className="btn-ghost mt-10 text-xs opacity-40 hover:opacity-70"
                    >
                      바로보기
                    </button>
                  ) : null}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-black/60 px-8 py-5">
              <Link href="/" className="btn-ghost">
                ← 캡슐 보드로
              </Link>
              {forcePreview && !naturallyOpen ? (
                <button
                  type="button"
                  onClick={() => setForcePreview(false)}
                  className="btn-ghost text-xs opacity-40 hover:opacity-70"
                >
                  다시 봉인
                </button>
              ) : null}
            </div>
          </section>
        ) : null}
      </main>
    </PageShell>
  );
}
