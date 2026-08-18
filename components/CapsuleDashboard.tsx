"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  type User,
} from "firebase/auth";
import {
  CAPSULE_SELECT,
  formatOpenDate,
  getCapsulePhotoUrls,
  isCapsuleOpen,
  type Capsule,
} from "@/lib/capsule";
import { getFirebaseAuth } from "@/lib/firebase";
import { getSupabase } from "@/lib/supabase";
import Countdown from "@/components/Countdown";
import GoogleLoginButton from "@/components/GoogleLoginButton";
import WeatherStamp from "@/components/WeatherStamp";
import WeatherCapsule from "@/components/WeatherCapsule";
import KeywordChips from "@/components/KeywordChips";
import {
  NotificationPrompt,
  OpenMessageBanner,
  useCapsuleOpenAlert,
  useNotificationPermission,
} from "@/components/OpenMessage";

type Filter = "all" | "locked" | "open";
type Sort = "newest" | "soonest";

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
  const [sort, setSort] = useState<Sort>("newest");
  const [query, setQuery] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const [loginBusy, setLoginBusy] = useState(false);
  const { permission, enable } = useNotificationPermission();
  const { message, dismiss } = useCapsuleOpenAlert({
    capsules,
    enabled: !loading && capsules.length > 0,
  });

  useEffect(() => {
    return onAuthStateChanged(getFirebaseAuth(), (nextUser) => {
      setUser(nextUser);
      setAuthReady(true);
    });
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

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

      let queryBuilder = getSupabase()
        .from("capsules")
        .select(CAPSULE_SELECT)
        .order("created_at", { ascending: false });

      if (mode === "mine" && user) {
        queryBuilder = queryBuilder.eq("owner_uid", user.uid);
      }

      const { data, error: fetchError } = await queryBuilder;

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
    const normalizedQuery = query.trim().toLowerCase();

    let list = capsules.filter((capsule) => {
      const opened = isCapsuleOpen(capsule.open_at, now);
      if (filter === "open") return opened;
      if (filter === "locked") return !opened;
      return true;
    });

    if (normalizedQuery) {
      list = list.filter((capsule) => {
        const name = (capsule.recipient || capsule.title || "").toLowerCase();
        return name.includes(normalizedQuery);
      });
    }

    return [...list].sort((a, b) => {
      if (sort === "soonest") {
        return new Date(a.open_at).getTime() - new Date(b.open_at).getTime();
      }
      return (
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    });
  }, [capsules, filter, now, query, sort]);

  async function handleInlineLogin() {
    setLoginBusy(true);
    try {
      await signInWithPopup(getFirebaseAuth(), new GoogleAuthProvider());
    } finally {
      setLoginBusy(false);
    }
  }

  const title = mode === "mine" ? "내가 묻은 캡슐" : "캡슐 보드";
  const description =
    mode === "mine"
      ? "내가 남긴 캡슐만 모아서 보고, 열람까지 남은 시간을 확인하세요."
      : "묻어 둔 캡슐의 열람까지 남은 시간을 한눈에 확인하세요.";

  return (
    <section className="mt-10">
      <OpenMessageBanner message={message} onClose={dismiss} />

      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="label-caps">Command Center</p>
            <h2 className="etched mt-1 text-xl font-semibold tracking-tight">
              {title}
            </h2>
            <p className="mt-1 text-sm text-slate-400">{description}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {(
              [
                ["all", `전체 ${counts.total}`],
                ["locked", `봉인 ${counts.locked}`],
                ["open", `열림 ${counts.open}`],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                className={`chip ${filter === value ? "chip-active" : ""}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="받는 사람 검색…"
            className="field sm:max-w-xs"
          />
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as Sort)}
            className="field sm:max-w-[11rem]"
          >
            <option value="newest">최신 생성순</option>
            <option value="soonest">가까운 열람일순</option>
          </select>
        </div>

        <NotificationPrompt
          permission={permission}
          onEnable={() => void enable()}
        />
      </div>

      {mode === "mine" && authReady && !user ? (
        <div className="steel-panel mt-8 px-6 py-12 text-center">
          <p className="etched text-base font-medium">
            로그인하면 내가 묻은 캡슐을 볼 수 있어요
          </p>
          <p className="mt-2 text-sm text-slate-400">
            Google 계정으로 로그인하면 바로 목록이 표시됩니다.
          </p>
          <div className="mt-6">
            <GoogleLoginButton onClick={handleInlineLogin} busy={loginBusy} />
          </div>
        </div>
      ) : null}

      {loading ? (
        <div className="mt-10 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="steel-card h-28 animate-pulse" />
          ))}
        </div>
      ) : null}

      {error ? <div className="alert-error mt-8">{error}</div> : null}

      {!loading &&
      !error &&
      !(mode === "mine" && !user) &&
      visibleCapsules.length === 0 ? (
        <div className="steel-panel mt-8 px-6 py-12 text-center">
          <p className="etched text-base font-medium">
            {query.trim()
              ? "검색 결과가 없어요"
              : mode === "mine"
                ? "아직 내가 묻은 캡슐이 없어요"
                : "아직 보여 줄 캡슐이 없어요"}
          </p>
          <p className="mt-2 text-sm text-slate-400">
            {query.trim()
              ? "다른 이름으로 검색해 보세요."
              : "첫 번째 캡슐을 묻으면 이곳에 목록이 나타납니다."}
          </p>
          {!query.trim() ? (
            <Link href="/new" className="btn-primary mt-6 inline-flex">
              캡슐 묻으러 가기
            </Link>
          ) : null}
        </div>
      ) : null}

      <div className="mt-8 grid gap-3">
        {visibleCapsules.map((capsule) => {
          const opened = isCapsuleOpen(capsule.open_at, now);
          const photos = getCapsulePhotoUrls(capsule.photo_paths);
          const cover = photos[0];
          const name = capsule.recipient || capsule.title || "이름 없는 캡슐";

          return (
            <Link
              key={capsule.id}
              href={`/capsule/${capsule.id}`}
              className="steel-card group flex gap-4 p-4"
            >
              {capsule.capsule_shape ? (
                <WeatherCapsule
                  shape={capsule.capsule_shape}
                  color={capsule.capsule_color}
                  colorAlt={capsule.capsule_color_alt}
                  sealed={!opened}
                  size="sm"
                />
              ) : (
                <div className="photo-frame relative h-24 w-24 shrink-0 overflow-hidden bg-slate-900">
                  {cover ? (
                    <img
                      src={cover}
                      alt=""
                      className={`h-full w-full object-cover transition ${
                        opened ? "" : "scale-105 blur-[2px] brightness-75"
                      }`}
                    />
                  ) : (
                    <div className="mono-readout flex h-full items-center justify-center text-[10px] text-slate-500">
                      NO IMG
                    </div>
                  )}
                  {!opened ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/45">
                      <span className="status-lamp status-lamp-locked" />
                      <span className="mono-readout text-[10px] tracking-widest text-sky-200">
                        SEALED
                      </span>
                    </div>
                  ) : (
                    <div className="absolute right-1.5 top-1.5">
                      <span className="status-lamp status-lamp-open" />
                    </div>
                  )}
                </div>
              )}

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="etched truncate text-base font-semibold">
                    {name}
                  </h3>
                  <span className={opened ? "badge-open" : "badge-locked"}>
                    {opened ? "열람 가능" : "봉인 중"}
                  </span>
                </div>

                <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-slate-400">
                  {opened
                    ? capsule.letter || "편지가 비어 있어요."
                    : capsule.daily_quote ||
                      "열람일 전까지 편지는 비밀로 남겨 둡니다."}
                </p>
                <KeywordChips keywords={capsule.keywords} className="mt-2" />

                <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                  <Countdown openAt={capsule.open_at} />
                  <span className="text-slate-500">·</span>
                  <span className="text-slate-400">
                    {formatOpenDate(capsule.open_at)}
                  </span>
                  <span className="text-slate-500">·</span>
                  <span className="mono-readout text-xs text-slate-500">
                    {photos.length} PHOTOS
                  </span>
                </div>
                <WeatherStamp
                  weather={capsule.weather}
                  weather_temp={capsule.weather_temp}
                  weather_humidity={capsule.weather_humidity}
                  className="mt-2 text-xs"
                />
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
